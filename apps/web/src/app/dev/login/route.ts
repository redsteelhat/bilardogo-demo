import { NextResponse, type NextRequest } from 'next/server';

/** Yalnız geliştirme: seçilen kullanıcıyla oturum çerezi yazar. Üretimde 404. */
export function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development' || process.env.BG_DEV_LOGIN !== '1') return new NextResponse(null, { status: 404 });
  const uid = req.nextUrl.searchParams.get('uid');
  const next = req.nextUrl.searchParams.get('next') ?? '/';
  const res = NextResponse.redirect(new URL(next.startsWith('/') ? next : '/', req.url));
  if (uid) res.cookies.set('bg_dev_uid', uid, { path: '/', httpOnly: true, sameSite: 'lax' });
  else res.cookies.delete('bg_dev_uid');
  return res;
}
