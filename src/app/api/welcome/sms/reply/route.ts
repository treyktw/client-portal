// app/api/welcome/sms/reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const MessagingResponse = twilio.twiml.MessagingResponse;

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Twilio client for sending messages
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Validate Twilio webhook
function validateTwilioWebhook(request: NextRequest, body: any): boolean {
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
  
  return twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    body
  );
}

// Keywords for different actions
const KEYWORDS = {
  optOut: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL', 'REMOVE'],
  optIn: ['START', 'YES', 'SUBSCRIBE', 'UNSTOP', 'JOIN', 'RESUME'],
  help: ['HELP', 'INFO', 'INFORMATION', 'SUPPORT', 'MENU'],
  confirm: ['YES', 'Y', 'CONFIRM', 'OK', 'SURE', 'ACCEPT'],
  decline: ['NO', 'N', 'DECLINE', 'REJECT', 'CANCEL'],
  status: ['STATUS', 'CHECK', 'UPDATE', 'PROGRESS'],
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    
    // Validate webhook
    if (!validateTwilioWebhook(request, Object.fromEntries(formData))) {
      console.error('[SMS Reply] Invalid Twilio signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const {
      MessageSid,
      From,
      Body,
      FromCity,
      FromState,
      FromCountry,
      FromZip,
    } = data as Record<string, string>;

    console.log('[SMS Reply] Received message:', {
      MessageSid,
      From,
      Body: Body.substring(0, 50), // Log first 50 chars
    });

    // Clean and parse message
    const messageBody = Body.trim();
    const upperBody = messageBody.toUpperCase();
    const words = upperBody.split(/\s+/);
    const firstWord = words[0];

    // Create TwiML response
    const twiml = new MessagingResponse();

    // Find contact by phone number
    const contacts = await convex.query(api.crm.getContacts, {});
    const contact = contacts.find(c =>
      c.phones.some(p => {
        const normalizedPhone = p.number.replace(/\D/g, '');
        const normalizedFrom = From.replace(/\D/g, '');
        return normalizedPhone === normalizedFrom || 
               normalizedPhone === normalizedFrom.slice(-10);
      })
    );

    // Handle opt-out
    if (KEYWORDS.optOut.includes(firstWord)) {
      await handleOptOut(twiml, From, contact);
    }
    // Handle opt-in
    else if (KEYWORDS.optIn.includes(firstWord)) {
      await handleOptIn(twiml, From, contact);
    }
    // Handle help request
    else if (KEYWORDS.help.includes(firstWord)) {
      await handleHelp(twiml, From, contact);
    }
    // Handle status check
    else if (KEYWORDS.status.includes(firstWord)) {
      await handleStatusCheck(twiml, From, contact);
    }
    // Handle workspace-specific messages
    else if (contact) {
      await handleWorkspaceMessage(twiml, {
        From,
        Body: messageBody,
        contact,
        MessageSid,
      });
    }
    // Unknown contact
    else {
      await handleUnknownContact(twiml, From, messageBody);
    }

    // Log interaction if contact exists
    if (contact) {
      await convex.mutation(api.crm.createInteraction, {
        contactId: contact._id as Id<"contacts">,
        type: 'sms',
        direction: 'inbound',
        body: messageBody,
        metadata: {
          twilioMessageSid: MessageSid,
          fromCity: FromCity,
          fromState: FromState,
          fromCountry: FromCountry,
          fromZip: FromZip,
        },
        twilioMessageSid: MessageSid,
      });
    }

    // Return TwiML response
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('[SMS Reply] Error:', error);
    
    // Return safe error response
    const errorResponse = new MessagingResponse();
    errorResponse.message('Sorry, we encountered an error processing your message. Please try again or contact support.');
    
    return new NextResponse(errorResponse.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

async function handleOptOut(twiml: any, from: string, contact: any) {
  console.log('[SMS Reply] Processing opt-out for:', from);
  
  if (contact) {
    // Record opt-out in database
    await convex.mutation(api.crm.recordConsent, {
      contactId: contact._id as Id<"contacts">,
      channel: 'sms',
      action: 'opt_out',
      value: from,
      source: 'sms_reply',
    });
  }

  twiml.message(`You have been unsubscribed from Telera SMS messages. 
Reply START at any time to resubscribe.
For support: support@telera.tech`);
}

async function handleOptIn(twiml: any, from: string, contact: any) {
  console.log('[SMS Reply] Processing opt-in for:', from);
  
  if (contact) {
    // Record opt-in
    await convex.mutation(api.crm.recordConsent, {
      contactId: contact._id as Id<"contacts">,
      channel: 'sms',
      action: 'opt_in',
      value: from,
      source: 'sms_reply',
    });

    twiml.message(`Welcome back to Telera! You'll now receive important updates about your projects.
Reply STOP to unsubscribe or HELP for more options.`);
  } else {
    twiml.message(`Welcome to Telera! To get started, please contact us at support@telera.tech with your account details.
Reply STOP to unsubscribe.`);
  }
}

async function handleHelp(twiml: any, from: string, contact: any) {
  const helpMessage = `Telera SMS Help:
• STOP - Unsubscribe from messages
• START - Resubscribe to messages
• STATUS - Check project status
• HELP - Show this menu

For support: support@telera.tech
Portal: ${process.env.NEXT_PUBLIC_APP_URL || 'https://telera.tech'}`;

  twiml.message(helpMessage);
}

async function handleStatusCheck(twiml: any, from: string, contact: any) {
  if (!contact) {
    twiml.message('No account found. Please contact support@telera.tech for assistance.');
    return;
  }

  try {
    // Find active workspace for contact
    const workspaces = await convex.query(api.workspaces.getMyWorkspaces, {});
    const activeWorkspace = workspaces.find(w => 
      w.businessInfo?.phone === from || 
      w.invitedEmail === contact.emails[0]?.address
    );

    if (activeWorkspace) {
      // Get milestone progress
      const milestones = await convex.query(api.milestones.getMilestones, {
        workspaceId: activeWorkspace._id,
      });

      const totalMilestones = milestones.milestones.length;
      const completedMilestones = milestones.milestones.filter(m => m.completedAt).length;
      const progressPercent = milestones.progress;

      let statusMessage = `Project: ${activeWorkspace.name}
Progress: ${progressPercent.toFixed(0)}% complete
Milestones: ${completedMilestones}/${totalMilestones} completed`;

      // Add next milestone if available
      const nextMilestone = milestones.milestones.find(m => !m.completedAt);
      if (nextMilestone) {
        statusMessage += `\nNext: ${nextMilestone.title}`;
      }

      statusMessage += `\n\nView details: ${process.env.NEXT_PUBLIC_APP_URL}/w/${activeWorkspace.slug}`;

      twiml.message(statusMessage);
    } else {
      twiml.message('No active projects found. Contact support@telera.tech for assistance.');
    }
  } catch (error) {
    console.error('[SMS Reply] Error checking status:', error);
    twiml.message('Unable to retrieve status. Please try again later or visit the portal.');
  }
}

async function handleWorkspaceMessage(
  twiml: any, 
  params: {
    From: string;
    Body: string;
    contact: any;
    MessageSid: string;
  }
) {
  const { Body, contact } = params;

  try {
    // Find workspace
    const workspaces = await convex.query(api.workspaces.getMyWorkspaces, {});
    const workspace = workspaces.find(w => 
      w.invitedEmail === contact.emails[0]?.address
    );

    if (workspace) {
      // Check for confirmation keywords (for onboarding or other flows)
      const upperBody = Body.toUpperCase();
      if (KEYWORDS.confirm.includes(upperBody.split(/\s+/)[0])) {
        // Handle confirmation
        twiml.message(`Thank you for confirming! Your workspace "${workspace.name}" is ready.
Access it here: ${process.env.NEXT_PUBLIC_APP_URL}/w/${workspace.slug}`);
      } else if (KEYWORDS.decline.includes(upperBody.split(/\s+/)[0])) {
        // Handle decline
        twiml.message('No problem! If you change your mind, you can always access your workspace later.');
      } else {
        // Forward message to workspace chat
        await forwardToWorkspaceChat(workspace, contact, Body);
        
        twiml.message(`Message received and forwarded to your project team. 
View the conversation: ${process.env.NEXT_PUBLIC_APP_URL}/w/${workspace.slug}/messages`);
      }
    } else {
      // No workspace found
      twiml.message('Your message has been received. Our team will respond shortly via the client portal.');
    }
  } catch (error) {
    console.error('[SMS Reply] Error handling workspace message:', error);
    twiml.message('Your message has been received. Please check the portal for updates.');
  }
}

async function handleUnknownContact(twiml: any, from: string, body: string) {
  console.log('[SMS Reply] Unknown contact:', from);
  
  // Log unknown contact for follow-up
  // await convex.mutation(api.leads.createFromSMS, {
  //   phone: from,
  //   message: body,
  //   source: 'sms_inbound',
  // });

  twiml.message(`Thank you for contacting Telera. 
To get started with our services, please visit ${process.env.NEXT_PUBLIC_APP_URL} or email support@telera.tech

Reply STOP to unsubscribe.`);
}

async function forwardToWorkspaceChat(workspace: any, contact: any, message: string) {
  try {
    // Get default thread for workspace
    const threads = await convex.query(api.threads.getThreads, {
      workspaceId: workspace._id,
      includeArchived: false,
    });
    
    const defaultThread = threads.find(t => t.isDefault) || threads[0];
    
    if (defaultThread) {
      // Create message in thread
      await convex.mutation(api.messages.sendMessage, {
        threadId: defaultThread._id,
        body: `[SMS from ${contact.firstName || 'Client'}]: ${message}`,
      });

      // Notify workspace members
      // This would trigger your notification system
    }
  } catch (error) {
    console.error('[SMS Reply] Error forwarding to chat:', error);
  }
}

// GET method for status checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'welcome/sms/reply',
    timestamp: new Date().toISOString(),
    twilioConfigured: !!process.env.TWILIO_ACCOUNT_SID,
  });
}