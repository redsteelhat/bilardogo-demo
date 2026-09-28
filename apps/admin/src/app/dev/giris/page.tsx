import { eq, getDb, profiles } from '@bilardogo/db';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DevLoginPage() {
  if (process.env.NODE_ENV !== 'development' || process.env.BG_DEV_LOGIN !== '1') notFound();
  const admins = await getDb().select({ id: profiles.id, fullName: profiles.fullName, username: profiles.username }).from(profiles).where(eq(profiles.role, 'admin'));
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="font-display text-2xl font-semibold">Geliştirici girişi (admin)</h1>
      <div className="mt-4 space-y-2">
        {admins.map((u) => (
          <a key={u.id} href={`/dev/login?uid=${u.id}`} className="block rounded-xl border border-border bg-surface p-3 hover:border-brand">
            {u.fullName} <span className="text-muted">@{u.username}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
