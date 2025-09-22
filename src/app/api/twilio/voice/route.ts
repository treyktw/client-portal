// app/api/twilio/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const twiml = twilio.twiml;

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("TWILIO_AUTH_TOKEN is not set");
}

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Twilio webhook validation
function validateTwilioWebhook(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true; // Skip validation in development
  }

  const twilioSignature = request.headers.get('x-twilio-signature');
  if (!twilioSignature) return false;

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is not set");
  }

  const url = request.url;
  if (!url) {
    throw new Error("URL is not set");
  }
  
  // Get the raw body for validation
  const params = Object.fromEntries(new URL(url).searchParams);
  
  return twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    params
  );
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    if (!validateTwilioWebhook(request)) {
      console.error('[Voice Webhook] Invalid Twilio signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse request body
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    const {
      CallSid,
      From,
      To,
      CallStatus,
      Direction,
      AccountSid,
      CallerCity,
      CallerState,
      CallerCountry,
      Digits, // For IVR interactions
    } = data as Record<string, string>;

    console.log('[Voice Webhook] Received call:', {
      CallSid,
      From,
      To,
      CallStatus,
      Direction,
    });

    // Create TwiML response
    const response = new twiml.VoiceResponse();

    // Handle different call statuses
    switch (CallStatus) {
      case 'ringing':
      case 'in-progress':
        // Initial call handling
        await handleIncomingCall(response, {
          CallSid,
          From,
          To,
          Direction,
          CallerCity,
          CallerState,
          CallerCountry,
          Digits,
        });
        break;

      case 'completed':
        // Log call completion
        await logCallCompletion({
          CallSid,
          From,
          To,
          Direction,
        });
        break;

      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        // Handle failed calls
        await handleFailedCall({
          CallSid,
          From,
          To,
          CallStatus,
        });
        break;

      default:
        console.log('[Voice Webhook] Unhandled call status:', CallStatus);
    }

    // Return TwiML response
    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('[Voice Webhook] Error:', error);
    
    // Return a safe error response
    const errorResponse = new twiml.VoiceResponse();
    errorResponse.say({
      voice: 'alice',
      language: 'en-US',
    }, 'We apologize, but we are experiencing technical difficulties. Please try again later.');
    errorResponse.hangup();

    return new NextResponse(errorResponse.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

async function handleIncomingCall(
  response: any, // TwiML VoiceResponse
  params: {
    CallSid: string;
    From: string;
    To: string;
    Direction: string;
    CallerCity?: string;
    CallerState?: string;
    CallerCountry?: string;
    Digits?: string;
  }
) {
  const { From, To, Direction, Digits, CallSid } = params;

  try {
    // Check if this is an IVR callback with digit input
    if (Digits) {
      await handleIVRSelection(response, Digits, params);
      return;
    }

    // Find contact in CRM
    const contacts = await convex.query(api.crm.getContacts, {});
    const contact = contacts.find(c =>
      c.phones.some(p => {
        const normalizedPhone = p.number.replace(/\D/g, '');
        const normalizedFrom = From.replace(/\D/g, '');
        return normalizedPhone === normalizedFrom || 
               normalizedPhone === normalizedFrom.slice(-10); // Last 10 digits
      })
    );

    if (contact) {
      // Known contact - personalized greeting
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, `Hello ${contact.businessName || 'there'}! Welcome to Telera.`);

      // Log interaction
      await convex.mutation(api.crm.createInteraction, {
        contactId: contact._id as Id<"contacts">,
        type: 'call',
        direction: Direction === 'inbound' ? 'inbound' : 'outbound',
        subject: 'Voice call',
        metadata: {
          callSid: CallSid,
          callerCity: params.CallerCity,
          callerState: params.CallerState,
          callerCountry: params.CallerCountry,
        },
      });
    } else {
      // Unknown caller - generic greeting
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, 'Thank you for calling Telera.');
    }

    // IVR Menu
    const gather = response.gather({
      numDigits: 1,
      action: '/api/twilio/voice', // Callback to same endpoint with Digits
      method: 'POST',
      timeout: 5,
      speechTimeout: 'auto',
      input: ['speech', 'dtmf'],
      hints: 'support, sales, hours, appointment',
    });

    gather.say({
      voice: 'alice',
      language: 'en-US',
    }, `
      Press 1 or say "support" for technical support.
      Press 2 or say "sales" for sales inquiries.
      Press 3 or say "hours" for business hours.
      Press 4 or say "appointment" to schedule a callback.
      Press 0 to speak with an operator.
    `);

    // If no input, repeat menu
    response.redirect('/api/twilio/voice');

  } catch (error) {
    console.error('[Voice Webhook] Error in handleIncomingCall:', error);
    response.say({
      voice: 'alice',
      language: 'en-US',
    }, 'We apologize for the inconvenience. Please call back later.');
    response.hangup();
  }
}

async function handleIVRSelection(
  response: any,
  digits: string,
  params: any
) {
  console.log('[Voice Webhook] IVR Selection:', digits);

  switch (digits) {
    case '1':
      // Technical Support
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, 'Connecting you to technical support.');
      
      // Forward to support number or queue
      if (process.env.TWILIO_SUPPORT_NUMBER) {
        response.dial({
          callerId: params.To,
        }, process.env.TWILIO_SUPPORT_NUMBER);
      } else {
        response.say({
          voice: 'alice',
          language: 'en-US',
        }, 'Our support team is currently unavailable. Please leave a message after the beep.');
        
        response.record({
          action: '/api/twilio/voice/recording',
          method: 'POST',
          maxLength: 120,
          transcribe: true,
          transcribeCallback: '/api/twilio/voice/transcription',
        });
      }
      break;

    case '2':
      // Sales
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, 'Connecting you to our sales team.');
      
      if (process.env.TWILIO_SALES_NUMBER) {
        response.dial({
          callerId: params.To,
        }, process.env.TWILIO_SALES_NUMBER);
      } else {
        response.say({
          voice: 'alice',
          language: 'en-US',
        }, 'Please visit telera.tech for more information or email us at sales@telera.tech');
      }
      break;

    case '3':
      // Business Hours
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, `
        Our business hours are Monday through Friday, 9 AM to 6 PM Eastern Time.
        We are closed on weekends and major holidays.
        Thank you for calling Telera.
      `);
      response.hangup();
      break;

    case '4':
      // Schedule Callback
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, 'Please leave your name and preferred callback time after the beep.');
      
      response.record({
        action: '/api/twilio/voice/callback-request',
        method: 'POST',
        maxLength: 60,
        transcribe: true,
      });
      break;

    case '0':
      // Operator
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, 'Please wait while we connect you to an operator.');
      
      if (process.env.TWILIO_OPERATOR_NUMBER) {
        response.dial({
          callerId: params.To,
          timeout: 30,
        }, process.env.TWILIO_OPERATOR_NUMBER);
      } else {
        response.say({
          voice: 'alice',
          language: 'en-US',
        }, 'All operators are currently busy. Please call back later.');
      }
      break;

    default:
      // Invalid selection
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, 'Invalid selection. Please try again.');
      response.redirect('/api/twilio/voice');
  }
}

async function logCallCompletion(params: any) {
  try {
    console.log('[Voice Webhook] Call completed:', params.CallSid);
    
    // Log to your analytics or database
    // await convex.mutation(api.analytics.logCall, { ...params });
  } catch (error) {
    console.error('[Voice Webhook] Error logging call completion:', error);
  }
}

async function handleFailedCall(params: any) {
  try {
    console.log('[Voice Webhook] Call failed:', {
      CallSid: params.CallSid,
      Status: params.CallStatus,
    });
    
    // Log failed call for follow-up
    // await convex.mutation(api.analytics.logFailedCall, { ...params });
  } catch (error) {
    console.error('[Voice Webhook] Error handling failed call:', error);
  }
}

// GET method for status checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'twilio/voice',
    timestamp: new Date().toISOString(),
  });
}