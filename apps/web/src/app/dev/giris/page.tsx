import { getDb, profiles, sql } from '@bilardogo/db';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Yalnız geliştirme: Supabase Auth olmadan demo kullanıcılarıyla giriş. */
export default async function DevLoginPage() {
  if (process.env.NODE_ENV !== 'development' || process.env.BG_DEV_LOGIN !== '1') notFound();
  const users = await getDb()
    .select({ id: profiles.id, fullName: profiles.fullName, username: profiles.username, role: profiles.role })
    .from(profiles)
    .orderBy(sql`${profiles.role} desc`, profiles.fullName)
    .limit(100);
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="font-display text-2xl font-semibold">Geliştirici girişi</h1>
      <p className="mt-1 text-sm text-muted">Yalnız `next dev` + BG_DEV_LOGIN=1 iken görünür.</p>
      <div className="mt-4 space-y-2">
        {users.map((u) => (
          <a key={u.id} href={`/dev/login?uid=${u.id}`} className="block rounded-xl border border-border bg-surface p-3 hover:border-brand">
            <div className="font-semibold">
              {u.fullName || '(adsız)'} {u.role === 'admin' ? <span className="text-brand">· admin</span> : null}
            </div>
            <div className="text-xs text-muted">@{u.username ?? '—'}</div>
          </a>
        ))}
        <a href="/dev/login" className="block text-center text-sm text-muted underline">
          Çıkış
        </a>
      </div>
    </main>
  );
}
