import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const PROTECTED = [
  '/maclarim',
  '/mac-istegi',
  '/sosyal',
  '/ayarlar',
  '/bildirimler',
  '/siparis',
  '/isletme',
  '/qr',
  '/q/',
  '/profil-tamamla',
  '/profil/duzenle',
  '/oyuncular',
];

export async function middleware(request: NextRequest) {
  return updateSession(request, (path) => PROTECTED.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`)));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/|sw.js|manifest.webmanifest|icons/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)'],
};
