import { initTRPC, TRPCError } from '@trpc/server';
import { generalProtection } from './arcjet';

// Initialize tRPC with context
const t = initTRPC.context<Context>().create();

// Base router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure with Arcjet
export const protectedProcedure = t.procedure.use(async ({ next }) => {
  try {
    // Apply general protection - we'll need to pass the request object
    // For now, we'll skip Arcjet in the middleware and apply it per procedure
    return next();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    // If Arcjet fails, continue without protection (fail open)
    console.warn('Arcjet protection failed:', error);
    return next();
  }
});

// Context type (we'll extend this later)
export type Context = {
  req: Request;
  ip?: string;
  method?: string;
  host?: string;
  path?: string;
  headers?: Record<string, string>;
};
