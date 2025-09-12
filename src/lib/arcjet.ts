import arcjet, { tokenBucket, detectBot } from '@arcjet/next';

// Initialize Arcjet with your API key
const aj = arcjet({
  key: process.env.ARCJET_KEY || '', // You'll need to add this to your .env
  rules: [
    tokenBucket({
      mode: 'LIVE',
      refillRate: 100,
      interval: 60, // 60 seconds
      capacity: 100,
    }),
    detectBot({
      mode: 'LIVE',
      allow: ['GOOGLE_XRAWLER', 'BING_CRAWLER'], // Allow legitimate bots
    }),
  ],
});

// Rate limiting rules for different endpoints
export const emailValidationLimit = arcjet({
  key: process.env.ARCJET_KEY || '',
  rules: [
    tokenBucket({
      mode: 'LIVE',
      refillRate: 10,
      interval: 60, // 60 seconds
      capacity: 10,
    }),
  ],
});

export const websiteValidationLimit = arcjet({
  key: process.env.ARCJET_KEY || '',
  rules: [
    tokenBucket({
      mode: 'LIVE',
      refillRate: 5,
      interval: 60, // 60 seconds
      capacity: 5,
    }),
  ],
});

export const placesAutocompleteLimit = arcjet({
  key: process.env.ARCJET_KEY || '',
  rules: [
    tokenBucket({
      mode: 'LIVE',
      refillRate: 20,
      interval: 60, // 60 seconds
      capacity: 20,
    }),
  ],
});

export const invitationLimit = arcjet({
  key: process.env.ARCJET_KEY || '',
  rules: [
    tokenBucket({
      mode: 'LIVE',
      refillRate: 5,
      interval: 3600, // 1 hour
      capacity: 5,
    }),
  ],
});

// General protection for all tRPC procedures
export const generalProtection = aj;
