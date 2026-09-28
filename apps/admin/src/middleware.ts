import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

/** Admin sitesinde giriş sayfası dışındaki her şey korumalıdır (rol kontrolü layout'ta). */
export async function middleware(request: NextRequest) {
  return updateSession(request, (path) => !path.startsWith('/giris') && !path.startsWith('/dev/') && !path.startsWith('/auth/'));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/|favicon|apple-touch-icon|.*\\.(?:png|jpg|svg|ico)$).*)'],
};
