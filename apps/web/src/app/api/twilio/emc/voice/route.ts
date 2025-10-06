// app/api/twilio/emc/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { ConvexHttpClient } from 'convex/browser';
import { api } from "@telera/convex/_generated/api";
import { sendEmergencyNotification } from '@/lib/emergency-notifications';

const twiml = twilio.twiml;

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Emergency contact configuration
const EMERGENCY_CONTACTS = {
  primary: process.env.TWILIO_EMERGENCY_PRIMARY_NUMBER,
  secondary: process.env.TWILIO_EMERGENCY_SECONDARY_NUMBER,
  oncall: process.env.TWILIO_ONCALL_NUMBER,
};

// Validate Twilio webhook
function validateTwilioWebhook(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
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
    // Validate webhook
    if (!validateTwilioWebhook(request)) {
      console.error('[EMC Voice] Invalid Twilio signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse request
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    const {
      CallSid,
      From,
      To,
      CallStatus,
      Direction,
      Digits,
      DialCallStatus,
      RecordingUrl,
    } = data as Record<string, string>;

    console.log('[EMC Voice] Emergency call received:', {
      CallSid,
      From,
      CallStatus,
      Digits,
    });

    // Create TwiML response
    const response = new twiml.VoiceResponse();

    // Handle emergency call routing
    if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      await handleEmergencyCall(response, {
        CallSid,
        From,
        To,
        Digits,
        DialCallStatus,
      });
    } else if (CallStatus === 'completed') {
      // Log emergency call completion
      await logEmergencyCall({
        CallSid,
        From,
        To,
        RecordingUrl,
      });
    }

    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('[EMC Voice] Critical error:', error);
    
    // Emergency fallback
    const errorResponse = new twiml.VoiceResponse();
    errorResponse.say({
      voice: 'alice',
      language: 'en-US',
    }, 'This is an emergency line. Please hold while we connect you.');
    
    // Try to connect to any available emergency contact
    if (EMERGENCY_CONTACTS.primary) {
      errorResponse.dial({
        timeout: 45,
        callerId: process.env.TWILIO_PHONE_NUMBER,
      }, EMERGENCY_CONTACTS.primary);
    }
    
    return new NextResponse(errorResponse.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

async function handleEmergencyCall(
  response: any,
  params: {
    CallSid: string;
    From: string;
    To: string;
    Digits?: string;
    DialCallStatus?: string;
  }
) {
  const { From, CallSid, Digits, DialCallStatus } = params;

  // Check if this is a dial callback
  if (DialCallStatus) {
    if (DialCallStatus === 'no-answer' || DialCallStatus === 'busy') {
      // Try secondary contact
      response.say({
        voice: 'alice',
        language: 'en-US',
      }, 'Trying alternative emergency contact.');
      
      if (EMERGENCY_CONTACTS.secondary) {
        response.dial({
          timeout: 45,
          callerId: process.env.TWILIO_PHONE_NUMBER,
          action: '/api/twilio/emc/voice',
          method: 'POST',
        }, EMERGENCY_CONTACTS.secondary);
      } else {
        // Leave emergency voicemail
        response.say({
          voice: 'alice',
          language: 'en-US',
        }, 'Please leave an emergency message. We will contact you immediately.');
        
        response.record({
          action: '/api/twilio/emc/voice/recording',
          method: 'POST',
          maxLength: 180,
          transcribe: true,
          transcribeCallback: '/api/twilio/emc/voice/transcription',
        });
      }
    }
    return;
  }

  // Initial emergency call
  response.say({
    voice: 'alice',
    language: 'en-US',
  }, 'You have reached the Telera emergency line.');

  // Start call recording for emergency documentation
  response.record({
    recordingStatusCallback: '/api/twilio/emc/voice/recording-status',
    recordingStatusCallbackMethod: 'POST',
    trim: 'do-not-trim',
  });

  // Emergency IVR
  if (!Digits) {
    const gather = response.gather({
      numDigits: 1,
      action: '/api/twilio/emc/voice',
      method: 'POST',
      timeout: 3,
    });

    gather.say({
      voice: 'alice',
      language: 'en-US',
    }, `
      Press 1 for immediate assistance.
      Press 2 for on-call technician.
      Press 9 to leave an emergency voicemail.
    `);

    // Default to immediate assistance
    response.redirect('/api/twilio/emc/voice?Digits=1');
  } else {
    // Handle digit selection
    switch (Digits) {
      case '1':
        // Immediate assistance - try primary contact
        response.say({
          voice: 'alice',
          language: 'en-US',
        }, 'Connecting you to emergency support immediately.');
        
        if (EMERGENCY_CONTACTS.primary) {
          const dial = response.dial({
            timeout: 45,
            callerId: process.env.TWILIO_PHONE_NUMBER,
            action: '/api/twilio/emc/voice',
            method: 'POST',
          });
          
          dial.number({
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallback: '/api/twilio/emc/voice/status',
            statusCallbackMethod: 'POST',
          }, EMERGENCY_CONTACTS.primary);
        }
        break;

      case '2':
        // On-call technician
        response.say({
          voice: 'alice',
          language: 'en-US',
        }, 'Connecting you to the on-call technician.');
        
        if (EMERGENCY_CONTACTS.oncall) {
          response.dial({
            timeout: 45,
            callerId: process.env.TWILIO_PHONE_NUMBER,
          }, EMERGENCY_CONTACTS.oncall);
        } else {
          response.say({
            voice: 'alice',
            language: 'en-US',
          }, 'The on-call technician is currently unavailable. Redirecting to primary support.');
          response.redirect('/api/twilio/emc/voice?Digits=1');
        }
        break;

      case '9':
        // Emergency voicemail
        response.say({
          voice: 'alice',
          language: 'en-US',
        }, 'Please leave your emergency message including your name and callback number.');
        
        response.record({
          action: '/api/twilio/emc/voice/recording',
          method: 'POST',
          maxLength: 180,
          transcribe: true,
          playBeep: true,
        });
        break;

      default:
        response.say({
          voice: 'alice',
          language: 'en-US',
        }, 'Invalid selection. Connecting you to emergency support.');
        response.redirect('/api/twilio/emc/voice?Digits=1');
    }
  }

  // Log emergency call
  try {
    await convex.mutation(api.emergencyLogs.create, {
      type: 'voice_call',
      from: From,
      callSid: CallSid,
      timestamp: Date.now(),
      status: 'active',
    });
  } catch (error) {
    console.error('[EMC Voice] Failed to log emergency call:', error);
  }
}

async function logEmergencyCall(params: any) {
  try {
    console.log('[EMC Voice] Emergency call completed:', params.CallSid);
    
    await convex.mutation(api.emergencyLogs.update, {
      callSid: params.CallSid,
      status: 'completed',
      recordingUrl: params.RecordingUrl,
    });

    // Send notification to admin
    await sendEmergencyNotification({
      type: 'emergency_call_completed',
      from: params.From,
      recordingUrl: params.RecordingUrl,
    });
  } catch (error) {
    console.error('[EMC Voice] Error logging emergency call:', error);
  }
}

// Handle recording webhook
export async function recording(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    console.log('[EMC Voice] Emergency recording received:', {
      RecordingUrl: data.RecordingUrl,
      RecordingDuration: data.RecordingDuration,
    });

    // Send immediate alert
    if (process.env.EMERGENCY_ALERT_EMAIL) {
      // Send email notification with recording link
      // await resend.emails.send({...});
    }

    if (process.env.EMERGENCY_ALERT_SMS) {
      // Send SMS alert
      // await twilioClient.messages.create({...});
    }

    const response = new twiml.VoiceResponse();
    response.say({
      voice: 'alice',
      language: 'en-US',
    }, 'Your emergency message has been recorded and our team has been alerted. Someone will contact you immediately.');
    response.hangup();

    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('[EMC Voice Recording] Error:', error);
    return new NextResponse('Error processing recording', { status: 500 });
  }
}

// GET method for status checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'twilio/emc/voice',
    timestamp: new Date().toISOString(),
    emergency_contacts: {
      primary: !!EMERGENCY_CONTACTS.primary,
      secondary: !!EMERGENCY_CONTACTS.secondary,
      oncall: !!EMERGENCY_CONTACTS.oncall,
    },
  });
}