import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

/** Google ile giriş ve e-posta doğrulama bağlantıları buraya döner (PKCE kod değişimi). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));
  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'email' | 'invite' | 'magiclink' | 'email_change' | null;
  if (tokenHash && type) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${type === 'recovery' ? '/sifre-yenile' : next}`);
  }
  return NextResponse.redirect(`${origin}/giris?hata=baglanti`);
}

function safeNext(n: string | null) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/';
}
