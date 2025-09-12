import { router } from '../trpc';
import { validationRouter } from './validation';
import { invitationsRouter } from './invitations';

export const appRouter = router({
  validation: validationRouter,
  invitations: invitationsRouter,
});

export type AppRouter = typeof appRouter;
