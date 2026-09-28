import { redirect } from 'next/navigation';
import { getServerCaller } from '@/lib/trpc/server';

/** Profil sekmesi: kendi profiline, giriş yoksa girişe yönlendirir. */
export default async function MyProfileRedirect() {
  const caller = await getServerCaller();
  const session = await caller.me.session().catch(() => null);
  if (!session) redirect('/giris?next=/profil');
  if (!session.username) redirect('/profil-tamamla');
  redirect(`/profil/${session.username}`);
}
