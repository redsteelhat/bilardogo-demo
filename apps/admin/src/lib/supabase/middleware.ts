import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Supabase oturum çerezlerini yeniler ve korumalı sayfalara girişsiz erişimi /giris'e yönlendirir. */
export async function updateSession(request: NextRequest, isProtected: (path: string) => boolean) {
  if (process.env.NODE_ENV === 'development' && process.env.BG_DEV_LOGIN === '1' && request.cookies.get('bg_dev_uid')) {
    return NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && isProtected(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    url.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return response;
}
