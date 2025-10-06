// app/api/webhooks/twilio/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

if (!process.env.TWILIO_PHONE_NUMBER) {
  throw new Error("TWILIO_PHONE_NUMBER is not set");
}

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Twilio webhook signature validation
function validateTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signature || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("Missing signature or auth token for validation");
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    const body: Record<string, string> = {};

    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    // Log received webhook
    console.log("Twilio webhook received:", {
      from: body.From,
      to: body.To,
      body: body.Body,
      messageSid: body.MessageSid,
    });

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      if (!process.env.TWILIO_AUTH_TOKEN) {
        throw new Error("TWILIO_AUTH_TOKEN is not set");
      }
      const signature = request.headers.get("x-twilio-signature");
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;

      const isValid = validateTwilioSignature(
        process.env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        body,
      );

      if (!isValid) {
        console.error("Invalid Twilio signature");
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    // Process the webhook data
    const phoneNumber = body.From;
    const messageBody = body.Body;
    const messageSid = body.MessageSid;

    // Find contact by phone number
    const contacts = await convex.query(api.crm.getContacts, {});
    const contact = contacts.find((c) =>
      c.phones.some((p) => {
        const normalizedPhone = p.number.replace(/\D/g, "");
        const normalizedFrom = phoneNumber.replace(/\D/g, "");
        return (
          normalizedPhone === normalizedFrom ||
          normalizedPhone === normalizedFrom.replace(/^1/, "") ||
          normalizedFrom === normalizedPhone.replace(/^1/, "")
        );
      }),
    );

    if (!contact) {
      console.log("SMS from unknown number:", phoneNumber);
      // Still return success to Twilio
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        },
      );
    }

    // Set up system token for Convex (you'll need to implement this)
    // For now, we'll use the system token approach
    const systemToken = process.env.CONVEX_SYSTEM_TOKEN;
    if (systemToken) {
      convex.setAuth(systemToken);
    }

    // Check for opt-out/opt-in keywords
    const normalizedBody = messageBody.trim().toUpperCase();
    const optOutKeywords = [
      "STOP",
      "UNSUBSCRIBE",
      "CANCEL",
      "END",
      "QUIT",
      "STOPALL",
    ];
    const optInKeywords = ["START", "YES", "SUBSCRIBE", "UNSTOP"];

    let consentAction: "opt_in" | "opt_out" | null = null;
    let responseMessage: string | null = null;

    if (optOutKeywords.some((keyword) => normalizedBody === keyword)) {
      consentAction = "opt_out";
      responseMessage =
        "You have been unsubscribed from SMS messages. Reply START to resubscribe.";
    } else if (optInKeywords.some((keyword) => normalizedBody === keyword)) {
      consentAction = "opt_in";
      responseMessage =
        "You have been subscribed to SMS messages. Reply STOP to unsubscribe.";
    }

    // Record consent if applicable
    if (consentAction) {
      await convex.mutation(api.crm.recordConsent, {
        contactId: contact._id as Id<"contacts">,
        channel: "sms",
        action: consentAction,
        value: phoneNumber,
        source: "sms_reply",
      });
    }

    // Create interaction for the inbound message
    await convex.mutation(api.crm.createInteraction, {
      contactId: contact._id as Id<"contacts">,
      type: "sms",
      direction: "inbound",
      body: messageBody,
      metadata: {
        twilioMessageSid: messageSid,
        fromCity: body.FromCity,
        fromState: body.FromState,
        fromCountry: body.FromCountry,
        fromZip: body.FromZip,
      },
      twilioMessageSid: messageSid,
    });

    // Create notification for admin if assigned
    if (contact.assignedTo) {
      await convex.mutation(api.notificationsystem.sendNotification, {
        contactId: contact._id as Id<"contacts">,
        userId: contact.assignedTo as Id<"users">,
        type: "sms_reply",
        channel: "inapp",
        body: `SMS from ${contact.businessName}: "${messageBody}"`,
        metadata: { twilioMessageSid: messageSid },
      });
    }

    // Build TwiML response
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (responseMessage) {
      twiml += `<Message>${responseMessage}</Message>`;
    }

    twiml += "</Response>";

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("Twilio webhook error:", error);

    // Return success to Twilio to prevent retries
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      },
    );
  }
}

// Handle GET requests (Twilio might use these for validation)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Twilio webhook endpoint is active",
    url: "/api/webhooks/twilio",
  });
}
