import { redirect } from 'next/navigation';
import { ActiveMatchBar } from '@/components/shell/active-match-bar';
import { BottomNav } from '@/components/shell/bottom-nav';
import { UserLive } from '@/components/shell/user-live';
import { getServerCaller } from '@/lib/trpc/server';

/** Kullanıcı uygulaması kabuğu. Giriş yapmış ama profili eksik kullanıcı profil tamamlamaya yönlendirilir. */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const caller = await getServerCaller();
  const session = await caller.me.session().catch(() => null);
  if (session && !session.onboarded) redirect('/profil-tamamla');
  return (
    <div className="min-h-dvh">
      {children}
      {session ? (
        <>
          <UserLive />
          <ActiveMatchBar />
        </>
      ) : null}
      <BottomNav />
    </div>
  );
}
