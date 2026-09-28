import 'server-only';
import { createCaller, createContext, createServices } from '@bilardogo/api/server';
import { getDb } from '@bilardogo/db';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import { getAuthUser } from '../supabase/server';

/** Server Component'lerde tRPC çağrısı (aynı istek içinde önbellekli). */
export const getServerCaller = cache(async () => {
  const h = await headers();
  const ctx = await createContext({
    db: getDb(),
    services: createServices((task) => after(task)),
    getUser: getAuthUser,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: h.get('user-agent'),
  });
  return createCaller(ctx);
});
