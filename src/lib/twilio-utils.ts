// lib/twilio-utils.ts
import twilio from 'twilio';
import { NextRequest } from 'next/server';

/**
 * Validate Twilio webhook signature
 */
export function validateTwilioSignature(
  request: NextRequest,
  body: Record<string, any>
): boolean {
  // Skip validation in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Twilio] Skipping signature validation in development');
    return true;
  }

  const twilioSignature = request.headers.get('x-twilio-signature');
  
  if (!twilioSignature) {
    console.error('[Twilio] Missing signature header');
    return false;
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.error('[Twilio] Missing TWILIO_AUTH_TOKEN');
    return false;
  }

  const url = request.url;
  
  try {
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      body
    );
    
    if (!isValid) {
      console.error('[Twilio] Invalid signature');
    }
    
    return isValid;
  } catch (error) {
    console.error('[Twilio] Signature validation error:', error);
    return false;
  }
}

/**
 * Normalize phone numbers for comparison
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle US numbers (remove country code if present)
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  
  // Return last 10 digits for US numbers
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  
  return digits;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  
  return phone;
}

/**
 * Check if message contains emergency keywords
 */
export function isEmergencyMessage(message: string): boolean {
  const emergencyKeywords = [
    'urgent', 'emergency', 'help', 'critical', 'down', 
    'broken', 'crashed', 'hacked', 'breach', 'asap', 
    '911', 'sos', 'immediately', 'crisis'
  ];
  
  const lowerMessage = message.toLowerCase();
  return emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Parse SMS opt-in/opt-out keywords
 */
export function parseSMSKeyword(message: string): {
  type: 'opt_in' | 'opt_out' | 'help' | 'status' | null;
  keyword: string | null;
} {
  const cleanMessage = message.trim().toUpperCase();
  const firstWord = cleanMessage.split(/\s+/)[0];
  
  const keywords = {
    opt_out: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL', 'REMOVE'],
    opt_in: ['START', 'YES', 'SUBSCRIBE', 'UNSTOP', 'JOIN', 'RESUME'],
    help: ['HELP', 'INFO', 'INFORMATION', 'SUPPORT', 'MENU'],
    status: ['STATUS', 'CHECK', 'UPDATE', 'PROGRESS'],
  };
  
  for (const [type, words] of Object.entries(keywords)) {
    if (words.includes(firstWord)) {
      return {
        type: type as 'opt_in' | 'opt_out' | 'help' | 'status',
        keyword: firstWord,
      };
    }
  }
  
  return { type: null, keyword: null };
}

/**
 * Build TwiML response helper
 */
export function buildTwiMLResponse(
  type: 'voice' | 'sms',
  callback: (twiml: any) => void
): string {
  const TwiMLClass = type === 'voice' 
    ? twilio.twiml.VoiceResponse 
    : twilio.twiml.MessagingResponse;
  
  const twiml = new TwiMLClass();
  callback(twiml);
  return twiml.toString();
}

/**
 * Rate limiting helper for webhook endpoints
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || record.resetTime < now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }
  
  if (record.count >= maxRequests) {
    console.warn(`[Twilio] Rate limit exceeded for ${identifier}`);
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Log Twilio webhook event
 */
export async function logTwilioEvent(
  type: 'voice' | 'sms',
  event: string,
  data: Record<string, any>
): Promise<void> {
  console.log(`[Twilio ${type.toUpperCase()}] ${event}:`, {
    timestamp: new Date().toISOString(),
    ...data,
  });
  
  // You can extend this to log to your database or monitoring service
  // await convex.mutation(api.twilioLogs.create, { type, event, data });
}

/**
 * Generate webhook status response
 */
export function webhookStatusResponse(endpoint: string, config?: Record<string, any>) {
  return {
    status: 'ok',
    endpoint,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    configured: {
      twilioAccount: !!process.env.TWILIO_ACCOUNT_SID,
      twilioAuth: !!process.env.TWILIO_AUTH_TOKEN,
      twilioPhone: !!process.env.TWILIO_PHONE_NUMBER,
      ...config,
    },
  };
}

/**
 * Handle webhook errors safely
 */
export function handleWebhookError(
  error: unknown,
  context: string
): { message: string; statusCode: number } {
  console.error(`[Twilio] Error in ${context}:`, error);
  
  if (error instanceof Error) {
    // Don't expose internal errors to external callers
    if (process.env.NODE_ENV === 'production') {
      return {
        message: 'An error occurred processing your request',
        statusCode: 500,
      };
    }
    
    return {
      message: error.message,
      statusCode: 500,
    };
  }
  
  return {
    message: 'Unknown error occurred',
    statusCode: 500,
  };
}