import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { emailValidationLimit, websiteValidationLimit, placesAutocompleteLimit } from '../arcjet';
import { TRPCError } from '@trpc/server';
import { Effect } from 'effect';
import { validateEmailWithEffect, validateWebsiteWithEffect, placesAutocompleteWithEffect } from '../effects/api';

export const validationRouter = router({
  validateEmail: publicProcedure
    .input(z.object({
      email: z.string().email('Invalid email format')
    }))
    .output(z.object({
      valid: z.boolean(),
      message: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // Apply rate limiting
      try {
        const decision = await emailValidationLimit.protect(ctx.req, {
          requested: 1
        });
        if (decision.isDenied()) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Email validation rate limit exceeded. Please try again later.',
          });
        }
      } catch (error) {
        // If Arcjet fails, continue without protection (fail open)
        console.warn('Arcjet protection failed:', error);
      }
      
      // Use Effect for email validation
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const { email } = input;
          
          // Basic validation
          if (!email || !email.includes('@')) {
            return { valid: false, message: 'Invalid email format' };
          }
          
          return yield* validateEmailWithEffect(email);
        })
      );
      
      return result;
    }),

  validateWebsite: publicProcedure
    .input(z.object({
      url: z.string().url('Invalid URL format')
    }))
    .output(z.object({
      valid: z.boolean(),
      error: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Apply rate limiting
      try {
        const decision = await websiteValidationLimit.protect(ctx.req, {
          requested: 1
        });
        if (decision.isDenied()) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Website validation rate limit exceeded. Please try again later.',
          });
        }
      } catch (error) {
        // If Arcjet fails, continue without protection (fail open)
        console.warn('Arcjet protection failed:', error);
      }
      
      // Use Effect for website validation
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const { url } = input;
          return yield* validateWebsiteWithEffect(url);
        })
      );
      
      return result;
    }),

  placesAutocomplete: publicProcedure
    .input(z.object({
      query: z.string().min(1, 'Query cannot be empty')
    }))
    .output(z.object({
      predictions: z.array(z.unknown()).default([])
    }))
    .mutation(async ({ input, ctx }) => {
      // Apply rate limiting
      try {
        const decision = await placesAutocompleteLimit.protect(ctx.req, {
          requested: 1
        });
        if (decision.isDenied()) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Places autocomplete rate limit exceeded. Please try again later.',
          });
        }
      } catch (error) {
        // If Arcjet fails, continue without protection (fail open)
        console.warn('Arcjet protection failed:', error);
      }
      
      // Use Effect for places autocomplete
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const { query } = input;
          return yield* placesAutocompleteWithEffect(query);
        })
      );
      
      return result;
    })
});
