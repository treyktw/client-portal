import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { invitationLimit } from '../arcjet';
import { TRPCError } from '@trpc/server';
import { Effect } from 'effect';
import { sendEmailWithEffect } from '../effects/api';
import { AuthenticationError } from '../effects/errors';
import InvitationEmail from '@/emails/invitation';
import { auth } from '@clerk/nextjs/server';
import { render } from '@react-email/render';

export const invitationsRouter = router({
  sendInvitation: publicProcedure
    .input(z.object({
      to: z.union([z.string().email(), z.array(z.string().email())]),
      workspaceName: z.string().min(1, 'Workspace name is required'),
      inviteLink: z.string().url('Invalid invite link'),
      senderName: z.string().default('Telera Team')
    }))
    .output(z.object({
      success: z.boolean(),
      messageId: z.string().optional(),
      message: z.string(),
      error: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Apply rate limiting
      try {
        const decision = await invitationLimit.protect(ctx.req, {
          requested: 1
        });
        if (decision.isDenied()) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Invitation sending rate limit exceeded. Please try again later.',
          });
        }
      } catch (error) {
        // If Arcjet fails, continue without protection (fail open)
        console.warn('Arcjet protection failed:', error);
      }
      
      // Use Effect for invitation sending
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          // Verify authentication
          const authResult = yield* Effect.tryPromise({
            try: () => auth(),
            catch: () => new AuthenticationError({ message: 'Authentication failed' })
          });
          
          if (!authResult.userId) {
            yield* Effect.fail(new AuthenticationError({ message: 'Unauthorized' }));
          }

          const { to, workspaceName, inviteLink, senderName } = input;

          // Generate email HTML using React Email template
          const emailHtml = yield* Effect.tryPromise({
            try: () => render(InvitationEmail({
              workspaceName,
              inviteLink,
              senderName,
              recipientEmail: Array.isArray(to) ? to[0] : to,
            })),
            catch: () => new AuthenticationError({ message: 'Failed to render email template' })
          });

          // Send email using Effect
          const emailResult = yield* sendEmailWithEffect({
            to,
            subject: `You're invited to collaborate on ${workspaceName}`,
            html: emailHtml,
          });

          return emailResult;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed({
              success: false,
              message: "Failed to send invitation",
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          )
        )
      );
      
      return result;
    })
});
