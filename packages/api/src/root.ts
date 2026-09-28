import { adminRouter } from './routers/admin';
import { businessRouter } from './routers/business';
import { feedRouter } from './routers/feed';
import { matchesRouter } from './routers/matches';
import { meRouter } from './routers/me';
import { metaRouter } from './routers/meta';
import { notificationsRouter } from './routers/notifications';
import { ordersRouter } from './routers/orders';
import { playersRouter } from './routers/players';
import { presenceRouter } from './routers/presence';
import { socialRouter } from './routers/social';
import { venuesRouter } from './routers/venues';
import { createCallerFactory, router } from './trpc';

export const appRouter = router({
  meta: metaRouter,
  me: meRouter,
  venues: venuesRouter,
  presence: presenceRouter,
  matches: matchesRouter,
  players: playersRouter,
  social: socialRouter,
  notifications: notificationsRouter,
  orders: ordersRouter,
  feed: feedRouter,
  business: businessRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
