// app/api/invitations/send/route.ts
import InvitationEmail from "@/emails/invitation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      to, 
      workspaceName, 
      inviteLink, 
      senderName = "Telera Team" 
    } = body;

    // Validate required fields
    if (!to || !workspaceName || !inviteLink) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "hello@telera.tech",
      to: Array.isArray(to) ? to : [to],
      subject: `You're invited to collaborate on ${workspaceName}`,
      react: InvitationEmail({
        workspaceName,
        inviteLink,
        senderName,
        recipientEmail: Array.isArray(to) ? to[0] : to,
      }),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id,
      message: "Invitation sent successfully" 
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}