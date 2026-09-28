'use client';
import { toast } from '@bilardogo/ui';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

/**
 * Kullanıcının özel kanalını dinler: maç isteği / kabul / sonuç ve yeni bildirimlerde ilgili sorguları yeniler,
 * bildirim başlığını kısa bir uyarı olarak gösterir.
 */
export function UserLive() {
  const { session } = useSession();
  const utils = trpc.useUtils();
  const router = useRouter();
  useRealtime(
    session ? `user:${session.id}` : null,
    ['match', 'notification'],
    async (event) => {
      if (event === 'match') {
        void utils.matches.invalidate();
        void utils.venues.live.invalidate();
      }
      if (event === 'notification') {
        void utils.notifications.invalidate();
        void utils.me.session.invalidate();
        const latest = await utils.notifications.list.fetch({ limit: 1 });
        const n = latest.items[0];
        if (n && !n.readAt && Date.now() - new Date(n.createdAt).getTime() < 30_000) {
          toast(n.title, {
            description: n.body,
            action: n.link ? { label: 'Aç', onClick: () => router.push(n.link!) } : undefined,
          });
        }
      }
    },
    { private: true },
  );
  return null;
}
