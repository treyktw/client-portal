import { Effect, Data } from 'effect';

// Define application error types
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string;
  readonly field?: string;
}> {}

export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly message: string;
  readonly status?: number;
  readonly url?: string;
}> {}

export class RateLimitError extends Data.TaggedError('RateLimitError')<{
  readonly message: string;
  readonly retryAfter?: number;
}> {}

export class AuthenticationError extends Data.TaggedError('AuthenticationError')<{
  readonly message: string;
}> {}

export class ExternalServiceError extends Data.TaggedError('ExternalServiceError')<{
  readonly service: string;
  readonly message: string;
  readonly status?: number;
}> {}

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  readonly message: string;
  readonly operation?: string;
}> {}

// Error handling utilities
export const handleError = (error: unknown): Effect.Effect<never, ValidationError | NetworkError | RateLimitError | AuthenticationError | ExternalServiceError | DatabaseError, never> => {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('rate limit')) {
      return Effect.fail(new RateLimitError({ message: error.message }));
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return Effect.fail(new AuthenticationError({ message: error.message }));
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return Effect.fail(new NetworkError({ message: error.message }));
    }
    
    if (error.message.includes('validation')) {
      return Effect.fail(new ValidationError({ message: error.message }));
    }
    
    // Default to network error for unknown errors
    return Effect.fail(new NetworkError({ message: error.message }));
  }
  
  return Effect.fail(new NetworkError({ message: 'Unknown error occurred' }));
};

// Retry policies
export const retryPolicy = {
  exponential: (maxRetries: number = 3) => 
    Effect.retry({ times: maxRetries }),
  
  linear: (maxRetries: number = 3) =>
    Effect.retry({ times: maxRetries }),
  
  fixed: (maxRetries: number = 3) =>
    Effect.retry({ times: maxRetries }),
};

// Circuit breaker pattern
export const circuitBreaker = (failureThreshold: number = 5, timeoutMs: number = 60000) => {
  let failures = 0;
  let lastFailureTime = 0;
  let state: 'closed' | 'open' | 'half-open' = 'closed';
  
  return <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E | NetworkError, R> =>
    Effect.gen(function* () {
      const now = Date.now();
      
      // Check if circuit should be reset
      if (state === 'open' && now - lastFailureTime > timeoutMs) {
        state = 'half-open';
      }
      
      // If circuit is open, fail immediately
      if (state === 'open') {
        yield* Effect.fail(new NetworkError({ message: 'Circuit breaker is open' }));
      }
      
      try {
        const result = yield* effect;
        
        // Reset on success
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;
        
        if (failures >= failureThreshold) {
          state = 'open';
        }
        
        throw error;
      }
    });
};

// Timeout wrapper
export const withTimeout = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  timeoutMs: number
): Effect.Effect<A, E | NetworkError, R> =>
  Effect.race(
    effect,
    Effect.fail(new NetworkError({ message: `Operation timed out after ${timeoutMs}ms` }))
      .pipe(Effect.delay(`${timeoutMs} millis`))
  );

// Logging utilities
export const logError = (context: string) => 
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.tapError(effect, (error) =>
      Effect.sync(() => {
        console.error(`[${context}] Error:`, error);
      })
    );

export const logSuccess = (context: string) => 
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.tap(effect, (result) =>
      Effect.sync(() => {
        console.log(`[${context}] Success:`, result);
      })
    );
