import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BusinessProvider } from '@/components/business/context';
import { BusinessShell } from '@/components/business/shell';
import { getServerCaller } from '@/lib/trpc/server';

export const metadata: Metadata = { title: 'İşletme paneli' };

/** İşletme paneli kabuğu: kullanıcı uygulamasından ayrı başlık, salon seçici, yan menü (masaüstü) ve alt menü (mobil). */
export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const caller = await getServerCaller();
  const session = await caller.me.session().catch(() => null);
  if (!session) redirect('/giris?next=/isletme');
  if (!session.onboarded) redirect('/profil-tamamla');
  return (
    <BusinessProvider>
      <BusinessShell>{children}</BusinessShell>
    </BusinessProvider>
  );
}
