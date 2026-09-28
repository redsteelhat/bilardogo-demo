import { appRouter, createContext, createServices } from '@bilardogo/api/server';
import { getDb } from '@bilardogo/db';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { after } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        db: getDb(),
        services: createServices((task) => after(task)),
        getUser: getAuthUser,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: req.headers.get('user-agent'),
      }),
    onError({ error, path }) {
      if (error.code === 'INTERNAL_SERVER_ERROR') console.error(`[trpc] ${path}:`, error.cause ?? error);
    },
  });
}

export { handler as GET, handler as POST };
