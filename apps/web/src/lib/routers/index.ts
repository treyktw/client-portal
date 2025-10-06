import { router } from '../trpc';
import { validationRouter } from './validation';
import { invitationsRouter } from './invitations';
import { notificationsRouter } from './notifications';

export const appRouter = router({
  validation: validationRouter,
  invitations: invitationsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
