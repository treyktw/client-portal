// app/api/welcome/sms/emc/reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Resend } from 'resend';

const MessagingResponse = twilio.twiml.MessagingResponse;

// Initialize services
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Emergency configuration
const EMERGENCY_CONFIG = {
  alertEmails: (process.env.EMERGENCY_ALERT_EMAILS || '').split(',').filter(Boolean),
  alertPhones: (process.env.EMERGENCY_ALERT_PHONES || '').split(',').filter(Boolean),
  escalationTimeMinutes: parseInt(process.env.EMERGENCY_ESCALATION_MINUTES || '5'),
  autoResponseEnabled: process.env.EMERGENCY_AUTO_RESPONSE === 'true',
};

// Emergency keywords that trigger immediate alerts
const EMERGENCY_KEYWORDS = [
  'URGENT', 'EMERGENCY', 'HELP', 'CRITICAL', 'DOWN', 'BROKEN', 
  'CRASHED', 'HACKED', 'BREACH', 'ASAP', '911', 'SOS'
];

// Validate Twilio webhook
function validateTwilioWebhook(request: NextRequest, body: any): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const twilioSignature = request.headers.get('x-twilio-signature');
  if (!twilioSignature) return false;

  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const url = request.url;
  
  return twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    body
  );
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    // Validate webhook
    if (!validateTwilioWebhook(request, Object.fromEntries(formData))) {
      console.error('[EMC SMS] Invalid Twilio signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const {
      MessageSid,
      From,
      To,
      Body,
      NumMedia,
      MediaUrl0,
      MediaContentType0,
    } = data as Record<string, string>;

    console.log('[EMC SMS] Emergency message received:', {
      MessageSid,
      From,
      Preview: Body.substring(0, 50),
      HasMedia: NumMedia !== '0',
    });

    // Create TwiML response
    const twiml = new MessagingResponse();

    // Check for emergency keywords
    const isEmergency = checkEmergencyKeywords(Body);
    
    if (isEmergency) {
      console.log('[EMC SMS] EMERGENCY DETECTED - Triggering alerts');
      
      // Send immediate auto-response
      if (EMERGENCY_CONFIG.autoResponseEnabled) {
        twiml.message(`⚠️ EMERGENCY RECEIVED ⚠️
Your urgent message has been received and our emergency response team has been immediately notified.

Someone will contact you within ${EMERGENCY_CONFIG.escalationTimeMinutes} minutes.

If this is a life-threatening emergency, please call 911.`);
      }

      // Process emergency
      await handleEmergencyMessage({
        MessageSid,
        From,
        Body,
        MediaUrl: MediaUrl0,
        MediaType: MediaContentType0,
      });
    } else {
      // Non-emergency but still important
      twiml.message(`Your message has been received by our priority support team.
We'll respond as soon as possible.

For immediate assistance, call: ${process.env.TWILIO_PHONE_NUMBER || 'our support line'}`);

      // Process as high-priority
      await handlePriorityMessage({
        MessageSid,
        From,
        Body,
      });
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('[EMC SMS] Critical error:', error);
    
    // Still try to respond to sender
    const errorResponse = new MessagingResponse();
    errorResponse.message('Your message has been received. Our team has been alerted and will respond immediately.');
    
    // Try to send emergency notification even if main processing failed
    try {
      await sendEmergencyAlert({
        type: 'system_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } catch (alertError) {
      console.error('[EMC SMS] Failed to send error alert:', alertError);
    }
    
    return new NextResponse(errorResponse.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

function checkEmergencyKeywords(message: string): boolean {
  const upperMessage = message.toUpperCase();
  return EMERGENCY_KEYWORDS.some(keyword => upperMessage.includes(keyword));
}

async function handleEmergencyMessage(params: {
  MessageSid: string;
  From: string;
  Body: string;
  MediaUrl?: string;
  MediaType?: string;
}) {
  const { MessageSid, From, Body, MediaUrl, MediaType } = params;
  
  try {
    // 1. Log emergency in database
    await convex.mutation(api.emergencyLogs.create, {
      type: 'sms',
      from: From,
      message: Body,
      messageSid: MessageSid,
      timestamp: Date.now(),
      status: 'active',
      hasMedia: !!MediaUrl,
    });

    // 2. Send email alerts
    if (EMERGENCY_CONFIG.alertEmails.length > 0) {
      await sendEmergencyEmailAlerts({
        from: From,
        message: Body,
        mediaUrl: MediaUrl,
      });
    }

    // 3. Send SMS alerts to team
    if (EMERGENCY_CONFIG.alertPhones.length > 0) {
      await sendEmergencySMSAlerts({
        from: From,
        message: Body,
      });
    }

    // 4. Create high-priority ticket/task
    await createEmergencyTicket({
      from: From,
      message: Body,
      messageSid: MessageSid,
    });

    // 5. Set up escalation timer
    setTimeout(async () => {
      await checkEmergencyEscalation(MessageSid);
    }, EMERGENCY_CONFIG.escalationTimeMinutes * 60 * 1000);

  } catch (error) {
    console.error('[EMC SMS] Error handling emergency:', error);
    throw error;
  }
}

async function handlePriorityMessage(params: {
  MessageSid: string;
  From: string;
  Body: string;
}) {
  const { MessageSid, From, Body } = params;
  
  try {
    // Log as high priority (not emergency)
    await convex.mutation(api.emergencyLogs.create, {
      type: 'sms',
      from: From,
      message: Body,
      messageSid: MessageSid,
      timestamp: Date.now(),
      status: 'priority',
      hasMedia: false,
    });

    // Send single notification to primary contact
    if (EMERGENCY_CONFIG.alertEmails[0]) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'alerts@telera.tech',
        to: [EMERGENCY_CONFIG.alertEmails[0]],
        subject: `Priority Support Message from ${From}`,
        html: `
          <h2>Priority Support Request</h2>
          <p><strong>From:</strong> ${From}</p>
          <p><strong>Message:</strong></p>
          <blockquote>${Body}</blockquote>
          <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p>This is a priority message but not flagged as emergency.</p>
        `,
      });
    }
  } catch (error) {
    console.error('[EMC SMS] Error handling priority message:', error);
  }
}

async function sendEmergencyEmailAlerts(params: {
  from: string;
  message: string;
  mediaUrl?: string;
}) {
  const { from, message, mediaUrl } = params;
  
  try {
    const emailPromises = EMERGENCY_CONFIG.alertEmails.map(email => 
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'alerts@telera.tech',
        to: [email],
        subject: `🚨 EMERGENCY: SMS from ${from}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .emergency-header {
                background-color: #dc2626;
                color: white;
                padding: 20px;
                text-align: center;
              }
              .content {
                padding: 20px;
                background-color: #fef2f2;
                border: 2px solid #dc2626;
              }
              .message-box {
                background-color: white;
                padding: 15px;
                margin: 15px 0;
                border-left: 5px solid #dc2626;
              }
              .action-buttons {
                margin: 20px 0;
              }
              .action-buttons a {
                display: inline-block;
                padding: 10px 20px;
                margin: 5px;
                background-color: #dc2626;
                color: white;
                text-decoration: none;
                border-radius: 5px;
              }
            </style>
          </head>
          <body>
            <div class="emergency-header">
              <h1>🚨 EMERGENCY ALERT 🚨</h1>
              <p>Immediate Action Required</p>
            </div>
            <div class="content">
              <h2>Emergency SMS Received</h2>
              <div class="message-box">
                <p><strong>From:</strong> ${from}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Message:</strong></p>
                <blockquote style="font-size: 16px; color: #111;">
                  ${message}
                </blockquote>
                ${mediaUrl ? `<p><strong>Attachment:</strong> <a href="${mediaUrl}">View Media</a></p>` : ''}
              </div>
              <div class="action-buttons">
                <a href="tel:${from}">Call Sender</a>
                <a href="sms:${from}">Reply via SMS</a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/emergency">View Dashboard</a>
              </div>
              <hr>
              <p><strong>Response Protocol:</strong></p>
              <ol>
                <li>Acknowledge receipt within 2 minutes</li>
                <li>Contact sender immediately</li>
                <li>Update emergency log with actions taken</li>
                <li>Escalate if needed</li>
              </ol>
            </div>
          </body>
          </html>
        `,
        replyTo: 'emergency@telera.tech',
      })
    );

    await Promise.all(emailPromises);
    console.log('[EMC SMS] Emergency email alerts sent');
  } catch (error) {
    console.error('[EMC SMS] Failed to send email alerts:', error);
  }
}

async function sendEmergencySMSAlerts(params: {
  from: string;
  message: string;
}) {
  const { from, message } = params;
  
  try {
    const smsPromises = EMERGENCY_CONFIG.alertPhones.map(phone =>
      twilioClient.messages.create({
        body: `🚨 EMERGENCY from ${from}: "${message.substring(0, 100)}..." Reply ACKNOWLEDGE to confirm receipt.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      })
    );

    await Promise.all(smsPromises);
    console.log('[EMC SMS] Emergency SMS alerts sent');
  } catch (error) {
    console.error('[EMC SMS] Failed to send SMS alerts:', error);
  }
}

async function createEmergencyTicket(params: {
  from: string;
  message: string;
  messageSid: string;
}) {
  try {
    // Create emergency ticket in your system
    // This would integrate with your task/ticket system
    
    console.log('[EMC SMS] Emergency ticket created');
  } catch (error) {
    console.error('[EMC SMS] Failed to create emergency ticket:', error);
  }
}

async function checkEmergencyEscalation(messageSid: string) {
  try {
    // Check if emergency was acknowledged
    const emergency = await convex.query(api.emergencyLogs.getByMessageSid, {
      messageSid,
    });

    if (emergency && emergency.status === 'active') {
      console.log('[EMC SMS] Emergency not acknowledged - ESCALATING');
      
      // Escalate to additional contacts
      await sendEmergencyAlert({
        type: 'escalation',
        messageSid,
        message: 'Emergency not acknowledged within time limit',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('[EMC SMS] Error checking escalation:', error);
  }
}

async function sendEmergencyAlert(params: any) {
  // Generic emergency alert function
  console.log('[EMC SMS] Sending emergency alert:', params);
  // Implementation depends on your alerting system
}

// GET method for status checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'welcome/sms/emc/reply',
    timestamp: new Date().toISOString(),
    config: {
      alertEmailsConfigured: EMERGENCY_CONFIG.alertEmails.length,
      alertPhonesConfigured: EMERGENCY_CONFIG.alertPhones.length,
      escalationMinutes: EMERGENCY_CONFIG.escalationTimeMinutes,
      autoResponseEnabled: EMERGENCY_CONFIG.autoResponseEnabled,
    },
  });
}