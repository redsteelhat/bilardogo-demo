import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { getServerCaller } from '@/lib/trpc/server';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const caller = await getServerCaller();
  const session = await caller.me.session().catch(() => null);
  if (!session) redirect('/giris');
  if (!session.isAdmin) redirect('/giris?yetki=yok');
  return (
    <div className="min-h-dvh">
      <Sidebar adminName={session.fullName || `@${session.username}`} />
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
