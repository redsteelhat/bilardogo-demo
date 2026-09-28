import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Server Component'ten çağrıldıysa yazılamaz; middleware oturumu yeniler.
        }
      },
    },
  });
}

/** JWT'yi doğrulanmış kullanıcı. getClaims yerel doğrulama yapar (asimetrik anahtar), yoksa Auth sunucusuna sorar. */
export async function getAuthUser(): Promise<{ id: string; email: string | null } | null> {
  // Yalnız `next dev`: Supabase Auth olmadan yerel test için /dev/giris ile seçilen kullanıcı
  if (process.env.NODE_ENV === 'development' && process.env.BG_DEV_LOGIN === '1') {
    const uid = (await cookies()).get('bg_dev_uid')?.value;
    if (uid && /^[0-9a-f-]{36}$/.test(uid)) return { id: uid, email: null };
  }
  const supabase = await getSupabaseServer();
  const auth = supabase.auth as typeof supabase.auth & {
    getClaims?: () => Promise<{ data: { claims: { sub?: string; email?: string } } | null; error: unknown }>;
  };
  if (typeof auth.getClaims === 'function') {
    const { data, error } = await auth.getClaims();
    if (!error && data?.claims?.sub) return { id: data.claims.sub, email: data.claims.email ?? null };
    if (!error) return null;
  }
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}
