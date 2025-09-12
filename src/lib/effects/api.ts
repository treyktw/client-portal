import { Effect, pipe } from 'effect';
import { NetworkError, ExternalServiceError, withTimeout, logError } from './errors';

// HTTP client with Effect
export const fetchWithEffect = (
  url: string,
  options: RequestInit = {}
): Effect.Effect<Response, NetworkError, never> =>
  Effect.tryPromise({
    try: () => fetch(url, options),
    catch: (error) => new NetworkError({ 
      message: `Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url 
    }),
  });

// Parse JSON response with Effect
export const parseJson = <T>(
  response: Response
): Effect.Effect<T, NetworkError, never> =>
  Effect.tryPromise({
    try: () => response.json() as Promise<T>,
    catch: (error) => new NetworkError({ 
      message: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url: response.url 
    }),
  });

// Check response status
export const checkStatus = (
  response: Response
): Effect.Effect<Response, NetworkError, never> =>
  response.ok
    ? Effect.succeed(response)
    : Effect.fail(new NetworkError({
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        url: response.url,
      }));

// Complete HTTP request pipeline
export const httpRequest = <T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Effect.Effect<T, NetworkError, never> =>
  pipe(
    fetchWithEffect(url, options),
    Effect.flatMap(checkStatus),
    Effect.flatMap(parseJson<T>),
    (effect) => withTimeout(effect, timeoutMs),
    logError(`HTTP Request to ${url}`)
  );

// Email validation service
export const validateEmailWithEffect = (email: string): Effect.Effect<{ valid: boolean; message: string }, NetworkError | ExternalServiceError, never> =>
  pipe(
    Effect.gen(function* () {
      const domain = email.split('@')[1];
      
      if (!domain) {
        return { valid: false, message: 'Invalid email format' };
      }
      
      const response = yield* httpRequest<{ Answer?: Array<{ data: string }> }>(
        `https://dns.google/resolve?name=${domain}&type=MX`
      );
      
      if (response.Answer && response.Answer.length > 0) {
        return { valid: true, message: 'Email domain verified' };
      } else {
        return { valid: false, message: 'Email domain not found' };
      }
    }),
    Effect.catchAll(() =>
      Effect.succeed({ valid: true, message: '' }) // Fail open for email validation
    )
  );

// Website validation service
export const validateWebsiteWithEffect = (url: string): Effect.Effect<{ valid: boolean; error?: string }, NetworkError, never> =>
  pipe(
    Effect.gen(function* () {
      const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = yield* fetchWithEffect(urlToCheck, {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return { valid: true };
        } else {
          return { valid: false, error: `Website returned status ${response.status}` };
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          return { valid: false, error: 'Website took too long to respond' };
        }
        
        return { valid: false, error: 'Website not reachable' };
      }
    }),
    Effect.catchAll(() =>
      Effect.succeed({ valid: false, error: 'Website not reachable' })
    )
  );

// Google Places API service
export const placesAutocompleteWithEffect = (query: string): Effect.Effect<{ predictions: unknown[] }, NetworkError | ExternalServiceError, never> =>
  pipe(
    Effect.gen(function* () {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      
      if (!apiKey) {
        console.warn('GOOGLE_PLACES_API_KEY not configured');
        return { predictions: [] };
      }
      
      const response = yield* httpRequest<{ status: string; predictions?: unknown[] }>(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=${apiKey}`
      );
      
      if (response.status === 'OK') {
        return { predictions: response.predictions || [] };
      } else {
        console.error('Google Places API error:', response.status);
        return { predictions: [] };
      }
    }),
    Effect.catchAll(() =>
      Effect.succeed({ predictions: [] })
    )
  );

// Resend email service
export const sendEmailWithEffect = (emailData: {
  to: string | string[];
  subject: string;
  html: string;
}): Effect.Effect<{ success: boolean; messageId?: string; message: string }, NetworkError | ExternalServiceError, never> =>
  pipe(
    Effect.gen(function* () {
      const apiKey = process.env.RESEND_API_KEY;
      
      if (!apiKey) {
        throw new ExternalServiceError({
          service: 'Resend',
          message: 'RESEND_API_KEY not configured',
        });
      }
      
      const response = yield* httpRequest<{ id?: string; error?: { message: string } }>(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'hello@telera.tech',
            to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
            subject: emailData.subject,
            html: emailData.html,
          }),
        }
      );
      
      if (response.error) {
        throw new ExternalServiceError({
          service: 'Resend',
          message: response.error.message,
        });
      }
      
      return {
        success: true,
        messageId: response.id,
        message: 'Email sent successfully',
      };
    }),
    Effect.catchAll(() =>
      Effect.succeed({
        success: false,
        message: 'Failed to send email',
      })
    )
  );
