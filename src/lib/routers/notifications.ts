// lib/routers/notifications.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import twilio from 'twilio';
import { Resend } from 'resend';

// Initialize services
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);
// Initialize Convex HTTP client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Helper to set Convex auth token
async function getAuthenticatedConvex(token?: string) {
  if (token) {
    convex.setAuth(token);
  }
  return convex;
}

// (removed unused TwilioWebhookBody interface)

export const notificationsRouter = router({
  // Send SMS notification
  sendSms: protectedProcedure
    .input(z.object({
      contactId: z.string().optional(),
      toPhone: z.string().optional(),
      templateId: z.string().nullable().optional(),
      body: z.string().optional(),
      variables: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const client = await getAuthenticatedConvex();
        
        // Get contact (optional)
        const contact = input.contactId
          ? await client.query(api.crm.getContactWithInteractions, {
              contactId: input.contactId as Id<"contacts">,
            })
          : null;
        
        // If no contact, we must have a destination phone
        if (!contact && !input.toPhone) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Missing destination phone number',
          });
        }

        // Find primary phone
        const primaryPhone = contact
          ? contact.phones.find(p => p.label === 'main') || contact.phones[0]
          : undefined;
        const destinationPhone = input.toPhone || primaryPhone?.number;
        if (!destinationPhone) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Contact has no phone number',
          });
        }

        // Check consent
        if (contact && primaryPhone && primaryPhone.smsConsent === 'opted_out') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Contact has opted out of SMS',
          });
        }

        // Get template if provided
        let messageBody = input.body || '';
        if (input.templateId) {
          const templates = await client.query(api.notificationsystem.getMessageTemplates, {
            channel: 'sms',
          });
          
          const template = templates.find(t => t._id === input.templateId);
          if (template) {
            messageBody = template.body;
            
            // Replace variables
            if (input.variables) {
              const vars = input.variables as Record<string, string>;
              Object.entries(vars).forEach(([key, value]) => {
                const regex = new RegExp(`{${key}}`, 'g');
                messageBody = messageBody.replace(regex, value);
              });
            }
          }
        }

        if (!messageBody) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No message body provided',
          });
        }

        // Create notification log
        const notificationId = contact
          ? await client.mutation(api.notificationsystem.sendNotification, {
              contactId: contact._id as Id<'contacts'>,
              type: 'outreach_sms',
              channel: 'sms',
              body: messageBody,
            })
          : undefined;

        // Send via Twilio
        try {
          const message = await twilioClient.messages.create({
            body: messageBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: destinationPhone,
          });

          // Update notification status
          if (notificationId) {
            await client.mutation(api.notificationsystem.processSmsNotification, {
              notificationId: notificationId as Id<"notificationLogs">,
              twilioMessageSid: message.sid,
              status: 'sent',
            });
          }

          // Create interaction
          if (contact) {
            await client.mutation(api.crm.createInteraction, {
              contactId: contact._id as Id<"contacts">,
              type: 'sms',
              direction: 'outbound',
              body: messageBody,
              twilioMessageSid: message.sid,
            });
          }

          return {
            success: true,
            messageId: message.sid,
          };
        } catch (twilioError: unknown) {
          // Update notification status
          if (notificationId) {
            await client.mutation(api.notificationsystem.processSmsNotification, {
              notificationId: notificationId as Id<"notificationLogs">,
              twilioMessageSid: '',
              status: 'failed',
              error: twilioError instanceof Error ? twilioError.message : String(twilioError),
            });
          }

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to send SMS: ${twilioError instanceof Error ? twilioError.message : String(twilioError)}`,
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send SMS notification',
        });
      }
    }),

  // Send Email notification
  sendEmail: protectedProcedure
    .input(z.object({
      contactId: z.string().optional(),
      toEmail: z.string().email().optional(),
      templateId: z.string().nullable().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      variables: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const client = await getAuthenticatedConvex();
        
        // Get contact (optional)
        const contact = input.contactId
          ? await client.query(api.crm.getContactWithInteractions, {
              contactId: input.contactId as Id<"contacts">,
            })
          : null;
        
        // If no contact, we must have a destination email
        if (!contact && !input.toEmail) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Missing destination email address',
          });
        }

        // Find primary email
        const primaryEmail = contact
          ? contact.emails.find(e => e.label === 'work') || contact.emails[0]
          : undefined;
        const destinationEmail = input.toEmail || primaryEmail?.address;
        if (!destinationEmail) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Contact has no email address',
          });
        }

        // Check consent
        if (contact && primaryEmail && primaryEmail.emailConsent === 'opted_out') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Contact has opted out of emails',
          });
        }

        // Get template if provided
        let emailSubject = input.subject || '';
        let emailBody = input.body || '';
        
        if (input.templateId) {
          const templates = await client.query(api.notificationsystem.getMessageTemplates, {
            channel: 'email',
          });
          
          const template = templates.find(t => t._id === input.templateId);
          if (template) {
            emailSubject = template.subject || '';
            emailBody = template.body;
            
            // Replace variables
            if (input.variables) {
              const vars = input.variables as Record<string, string>;
              Object.entries(vars).forEach(([key, value]) => {
                const regex = new RegExp(`{${key}}`, 'g');
                emailSubject = emailSubject.replace(regex, value);
                emailBody = emailBody.replace(regex, value);
              });
            }
          }
        }

        if (!emailSubject || !emailBody) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Missing email subject or body',
          });
        }

        // Create notification log
        const notificationId = contact
          ? await client.mutation(api.notificationsystem.sendNotification, {
              contactId: contact._id as Id<'contacts'>,
              type: 'outreach_email',
              channel: 'email',
              subject: emailSubject,
              body: emailBody,
            })
          : undefined;

        // Send via Resend
        try {
          const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'support@telera.tech',
            to: [destinationEmail],
            subject: emailSubject,
            html: emailBody,
          });

          if (error) {
            throw new Error(error.message);
          }

          // Update notification status
          if (notificationId) {
            await client.mutation((api as any).notificationsystem.processEmailNotification, {
              notificationId: notificationId as Id<"notificationLogs">,
              resendId: data?.id || '',
              status: 'sent',
            });
          }

          // Create interaction
          if (contact) {
            await client.mutation(api.crm.createInteraction, {
              contactId: contact._id as Id<"contacts">,
              type: 'email',
              direction: 'outbound',
              subject: emailSubject,
              body: emailBody,
            });
          }

          return {
            success: true,
            messageId: data?.id,
          };
        } catch (emailError: unknown) {
          // Update notification status
          if (notificationId) {
            await client.mutation((api as any).notificationsystem.processEmailNotification, {
              notificationId: notificationId as Id<"notificationLogs">,
              resendId: '',
              status: 'failed',
              error: emailError instanceof Error ? emailError.message : String(emailError),
            });
          }

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to send email: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send email notification',
        });
      }
    }),

  // Twilio webhook handler
  twilioWebhook: publicProcedure
    .input(z.object({
      MessageSid: z.string(),
      AccountSid: z.string(),
      From: z.string(),
      To: z.string(),
      Body: z.string(),
      FromCity: z.string().optional(),
      FromState: z.string().optional(),
      FromCountry: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Verify webhook signature (in production)
        // const signature = ctx.req.headers['x-twilio-signature'];
        // const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc/notifications.twilioWebhook`;
        // const isValid = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, input);
        
        const client = await getAuthenticatedConvex();
        
        // Find contact by phone number
        const contacts = await client.query(api.crm.getContacts, {});
        const contact = contacts.find(c => 
          c.phones.some(p => p.number === input.From || p.number === input.From.replace('+1', ''))
        );

        if (!contact) {
          console.log('Received SMS from unknown number:', input.From);
          return { success: true, action: 'ignored' };
        }

        // Check for opt-out keywords
        const body = input.Body.trim().toUpperCase();
        const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
        const optInKeywords = ['START', 'YES', 'SUBSCRIBE'];

        let action: 'opt_in' | 'opt_out' | null = null;
        
        if (optOutKeywords.includes(body)) {
          action = 'opt_out';
        } else if (optInKeywords.includes(body)) {
          action = 'opt_in';
        }

        // Record consent if applicable
        if (action) {
          await client.mutation(api.crm.recordConsent, {
            contactId: contact._id as Id<"contacts">,
            channel: 'sms',
            action,
            value: input.From,
            source: 'sms_reply',
          });
        }

        // Create interaction for the inbound message
        await client.mutation(api.crm.createInteraction, {
          contactId: contact._id as Id<"contacts">,
          type: 'sms',
          direction: 'inbound',
          body: input.Body,
          metadata: {
            twilioMessageSid: input.MessageSid,
            fromCity: input.FromCity,
            fromState: input.FromState,
            fromCountry: input.FromCountry,
          },
          twilioMessageSid: input.MessageSid,
        });

        // Create notification for admin
        if (contact.assignedTo) {
          await client.mutation(api.notificationsystem.sendNotification, {
            contactId: contact._id as Id<"contacts">,
            userId: contact.assignedTo as Id<"users">,
            type: 'sms_reply',
            channel: 'inapp',
            body: `Reply from ${contact.businessName}: "${input.Body}"`,
          });
        }

        // Auto-reply if opted out
        if (action === 'opt_out') {
          await twilioClient.messages.create({
            body: 'You have been unsubscribed. Reply START to resubscribe.',
            from: process.env.TWILIO_PHONE_NUMBER,
            to: input.From,
          });
        }

        return { 
          success: true, 
          action: action || 'message_received',
          contactId: contact._id,
        };
      } catch (error) {
        console.error('Twilio webhook error:', error);
        
        // Return success to prevent Twilio retries on errors
        return { success: true, error: 'Internal error logged' };
      }
    }),
});