// lib/emergency-notifications.ts
import { Resend } from 'resend';
import twilio from 'twilio';
import { ConvexHttpClient } from 'convex/browser';
import { api } from "@telera/convex/_generated/api";
import type { Id } from "@telera/convex/_generated/dataModel";

import EmergencyNotificationEmail from '@/emails/emergency-notification';

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}
if (!process.env.TWILIO_ACCOUNT_SID) {
  throw new Error("TWILIO_ACCOUNT_SID is not set");
}
if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("TWILIO_AUTH_TOKEN is not set");
}
if (!process.env.TWILIO_PHONE_NUMBER) {
  throw new Error("TWILIO_PHONE_NUMBER is not set");
}
if (!process.env.EMERGENCY_ALERT_EMAILS) {
  throw new Error("EMERGENCY_ALERT_EMAILS is not set");
}
if (!process.env.EMERGENCY_ALERT_PHONES) {
  throw new Error("EMERGENCY_ALERT_PHONES is not set");
}
if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error("RESEND_FROM_EMAIL is not set");
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL is not set");
}
if (!process.env.EMERGENCY_SLACK_WEBHOOK) {
  throw new Error("EMERGENCY_SLACK_WEBHOOK is not set");
}
if (!process.env.EMERGENCY_DISCORD_WEBHOOK) {
  throw new Error("EMERGENCY_DISCORD_WEBHOOK is not set");
}

// Initialize services
const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Emergency notification configuration
const EMERGENCY_CONFIG = {
  emails: (process.env.EMERGENCY_ALERT_EMAILS || '').split(',').filter(Boolean),
  phones: (process.env.EMERGENCY_ALERT_PHONES || '').split(',').filter(Boolean),
  fromEmail: process.env.RESEND_FROM_EMAIL || 'emergency@telera.tech',
  fromPhone: process.env.TWILIO_PHONE_NUMBER,
  dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://telera.tech'}/admin/emergency`,
  slackWebhook: process.env.EMERGENCY_SLACK_WEBHOOK,
  discordWebhook: process.env.EMERGENCY_DISCORD_WEBHOOK,
};

export interface EmergencyNotificationParams {
  type: 'emergency_call_completed' | 'emergency_sms' | 'emergency_escalation' | 'system_error';
  from: string;
  message?: string;
  recordingUrl?: string;
  transcription?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  callDuration?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  metadata?: Record<string, any>;
  callSid?: string;
  messageSid?: string;
  escalationReason?: string;
  errorDetails?: string;
}

/**
 * Send emergency notifications through multiple channels
 */
export async function sendEmergencyNotification(params: EmergencyNotificationParams): Promise<{
  success: boolean;
  emailsSent: number;
  smsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let emailsSent = 0;
  let smsSent = 0;

  console.log('[Emergency] Sending notifications:', {
    type: params.type,
    from: params.from,
    priority: params.priority || 'high',
  });

  // Determine priority if not set
  const priority = params.priority || determinePriority(params.type, params.message);

  try {
    // 1. Log to database
    await logEmergencyToDatabase(params, priority);
  } catch (error) {
    console.error('[Emergency] Failed to log to database:', error);
    errors.push('Failed to log to database');
  }

  // 2. Send email notifications
  if (EMERGENCY_CONFIG.emails.length > 0) {
    try {
      emailsSent = await sendEmergencyEmails(params, priority);
    } catch (error) {
      console.error('[Emergency] Failed to send emails:', error);
      errors.push('Failed to send email notifications');
    }
  }

  // 3. Send SMS notifications (only for critical/high priority)
  if (EMERGENCY_CONFIG.phones.length > 0 && twilioClient && 
      (priority === 'critical' || priority === 'high')) {
    try {
      smsSent = await sendEmergencySMS(params, priority);
    } catch (error) {
      console.error('[Emergency] Failed to send SMS:', error);
      errors.push('Failed to send SMS notifications');
    }
  }

  // 4. Send to Slack (if configured)
  if (EMERGENCY_CONFIG.slackWebhook) {
    try {
      await sendSlackNotification(params, priority);
    } catch (error) {
      console.error('[Emergency] Failed to send Slack notification:', error);
      errors.push('Failed to send Slack notification');
    }
  }

  // 5. Send to Discord (if configured)
  if (EMERGENCY_CONFIG.discordWebhook) {
    try {
      await sendDiscordNotification(params, priority);
    } catch (error) {
      console.error('[Emergency] Failed to send Discord notification:', error);
      errors.push('Failed to send Discord notification');
    }
  }

  return {
    success: errors.length === 0,
    emailsSent,
    smsSent,
    errors,
  };
}

/**
 * Send emergency email notifications
 */
async function sendEmergencyEmails(
  params: EmergencyNotificationParams,
  priority: string
): Promise<number> {
  const timestamp = new Date().toLocaleString();
  let sent = 0;

  // Send individual emails for better deliverability
  for (const email of EMERGENCY_CONFIG.emails) {
    try {
      const { data, error } = await resend.emails.send({
        from: EMERGENCY_CONFIG.fromEmail,
        to: [email],
        subject: getEmailSubject(params.type, params.from, priority),
        react: EmergencyNotificationEmail({
          type: params.type,
          from: params.from,
          message: params.message,
          recordingUrl: params.recordingUrl,
          transcription: params.transcription,
          priority: priority as any,
          timestamp,
          callDuration: params.callDuration,
          location: params.location,
          actionUrl: EMERGENCY_CONFIG.dashboardUrl,
          escalationReason: params.escalationReason,
          errorDetails: params.errorDetails,
        }) as React.ReactElement,
        headers: {
          'X-Priority': '1', // High priority
          'Importance': 'high',
        },
      });

      if (error) {
        console.error(`[Emergency] Failed to send email to ${email}:`, error);
      } else {
        sent++;
        console.log(`[Emergency] Email sent to ${email}:`, data?.id);
      }
    } catch (error) {
      console.error(`[Emergency] Error sending email to ${email}:`, error);
    }
  }

  return sent;
}

/**
 * Send emergency SMS notifications
 */
async function sendEmergencySMS(
  params: EmergencyNotificationParams,
  priority: string
): Promise<number> {
  if (!twilioClient || !EMERGENCY_CONFIG.fromPhone) return 0;

  let sent = 0;
  const smsBody = formatSMSMessage(params, priority);

  for (const phone of EMERGENCY_CONFIG.phones) {
    try {
      const message = await twilioClient.messages.create({
        body: smsBody,
        from: EMERGENCY_CONFIG.fromPhone,
        to: phone,
      });

      sent++;
      console.log(`[Emergency] SMS sent to ${phone}:`, message.sid);
    } catch (error) {
      console.error(`[Emergency] Failed to send SMS to ${phone}:`, error);
    }
  }

  return sent;
}

/**
 * Log emergency to database
 */
async function logEmergencyToDatabase(
  params: EmergencyNotificationParams,
  priority: string
): Promise<void> {
  try {
    const emergencyData = {
      type: mapNotificationTypeToLogType(params.type),
      from: params.from,
      message: params.message,
      messageSid: params.messageSid,
      callSid: params.callSid,
      timestamp: Date.now(),
      status: params.type === 'emergency_escalation' ? 'escalated' : 'active',
      recordingUrl: params.recordingUrl,
      transcription: params.transcription,
      metadata: {
        ...params.metadata,
        location: params.location,
        callDuration: params.callDuration,
        escalationReason: params.escalationReason,
        errorDetails: params.errorDetails,
      },
    };

    await convex.mutation(api.emergencyLogs.create, emergencyData as any);
  } catch (error) {
    console.error('[Emergency] Failed to log to database:', error);
    throw error;
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(
  params: EmergencyNotificationParams,
  priority: string
): Promise<void> {
  const webhookUrl = EMERGENCY_CONFIG.slackWebhook;
  if (!webhookUrl) return;

  const color = getSlackColor(priority);
  const emoji = getPriorityEmoji(priority);

  const payload = {
    text: `${emoji} Emergency Alert: ${params.type.replace(/_/g, ' ')}`,
    attachments: [
      {
        color,
        title: `${emoji} ${priority.toUpperCase()} Priority Emergency`,
        fields: [
          {
            title: 'From',
            value: params.from,
            short: true,
          },
          {
            title: 'Type',
            value: params.type.replace(/_/g, ' '),
            short: true,
          },
          ...(params.message ? [{
            title: 'Message',
            value: params.message,
            short: false,
          }] : []),
          ...(params.recordingUrl ? [{
            title: 'Recording',
            value: params.recordingUrl,
            short: false,
          }] : []),
        ],
        footer: 'Telera Emergency System',
        ts: Math.floor(Date.now() / 1000).toString(),
        actions: [
          {
            type: 'button',
            text: 'View Dashboard',
            url: EMERGENCY_CONFIG.dashboardUrl,
            style: 'danger',
          },
          ...(params.from ? [{
            type: 'button',
            text: 'Call Back',
            url: `tel:${params.from}`,
            style: 'primary',
          }] : []),
        ],
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Send Discord notification
 */
async function sendDiscordNotification(
  params: EmergencyNotificationParams,
  priority: string
): Promise<void> {
  const webhookUrl = EMERGENCY_CONFIG.discordWebhook;
  if (!webhookUrl) return;

  const color = getDiscordColor(priority);
  const emoji = getPriorityEmoji(priority);

  const embed = {
    title: `${emoji} ${priority.toUpperCase()} Priority Emergency`,
    description: params.message || 'Emergency alert received',
    color,
    fields: [
      {
        name: 'From',
        value: params.from,
        inline: true,
      },
      {
        name: 'Type',
        value: params.type.replace(/_/g, ' '),
        inline: true,
      },
      {
        name: 'Priority',
        value: priority.toUpperCase(),
        inline: true,
      },
      ...(params.location ? [{
        name: 'Location',
        value: [params.location.city, params.location.state, params.location.country]
          .filter(Boolean)
          .join(', '),
        inline: false,
      }] : []),
      ...(params.recordingUrl ? [{
        name: 'Recording',
        value: `[Listen to Recording](${params.recordingUrl})`,
        inline: false,
      }] : []),
    ],
    footer: {
      text: 'Telera Emergency System',
    },
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '@here Emergency Alert!',
      embeds: [embed],
    }),
  });
}

// Helper functions
function determinePriority(type: string, message?: string): string {
  if (type === 'emergency_escalation' || type === 'system_error') {
    return 'critical';
  }
  
  const lowerMessage = message?.toLowerCase() || '';
  const criticalKeywords = ['down', 'crashed', 'hacked', 'breach', '911'];
  const highKeywords = ['urgent', 'asap', 'critical', 'help', 'sos'];
  
  if (criticalKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'critical';
  }
  if (highKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'high';
  }
  
  return 'medium';
}

function getEmailSubject(type: string, from: string, priority: string): string {
  const emoji = getPriorityEmoji(priority);
  
  switch (type) {
    case 'emergency_call_completed':
      return `${emoji} Emergency Call Completed from ${from}`;
    case 'emergency_sms':
      return `${emoji} Emergency SMS from ${from}`;
    case 'emergency_escalation':
      return `⚠️ ESCALATION REQUIRED: Emergency from ${from}`;
    case 'system_error':
      return `🔴 System Error: Emergency Handler Failed`;
    default:
      return `${emoji} Emergency Alert from ${from}`;
  }
}

function formatSMSMessage(params: EmergencyNotificationParams, priority: string): string {
  const emoji = getPriorityEmoji(priority);
  let message = `${emoji} EMERGENCY (${priority.toUpperCase()})\n`;
  message += `From: ${params.from}\n`;
  
  if (params.message) {
    const preview = params.message.substring(0, 100);
    message += `Message: "${preview}${params.message.length > 100 ? '...' : ''}"\n`;
  }
  
  if (params.type === 'emergency_escalation') {
    message += `⚠️ ESCALATION - Not acknowledged in time!\n`;
  }
  
  message += `\nView: ${EMERGENCY_CONFIG.dashboardUrl}`;
  
  return message;
}

function mapNotificationTypeToLogType(type: string): 'sms' | 'voice_call' | 'email' | 'system' {
  switch (type) {
    case 'emergency_call_completed':
      return 'voice_call';
    case 'emergency_sms':
      return 'sms';
    case 'system_error':
      return 'system';
    default:
      return 'system';
  }
}

function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '🟠';
  }
}

function getSlackColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'medium': return '#FFC107';
    case 'low': return 'good';
    default: return 'warning';
  }
}

function getDiscordColor(priority: string): number {
  switch (priority) {
    case 'critical': return 0xFF0000; // Red
    case 'high': return 0xFF9800;    // Orange
    case 'medium': return 0xFFEB3B;  // Yellow
    case 'low': return 0x4CAF50;     // Green
    default: return 0xFF9800;
  }
}