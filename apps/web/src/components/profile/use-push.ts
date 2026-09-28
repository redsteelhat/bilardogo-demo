'use client';
import { useCallback, useEffect, useState } from 'react';
import { currentPushEndpoint, pushSupport, subscribePush, unsubscribePush, type PushSupport } from '@/lib/push';
import { trpc } from '@/lib/trpc/client';

/** Bu cihazdaki web push aboneliği: destek durumu, aboneliğin olup olmadığı, aç/kapat. */
export function usePushDevice() {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const save = trpc.me.pushSubscribe.useMutation();
  const drop = trpc.me.pushUnsubscribe.useMutation();

  useEffect(() => {
    setSupport(pushSupport());
    currentPushEndpoint()
      .then((e) => setSubscribed(!!e))
      .catch(() => setSubscribed(false));
  }, []);

  /** İzin ister ve aboneliği sunucuya kaydeder. Hata durumunda Türkçe mesaj fırlatır. */
  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const s = pushSupport();
      setSupport(s);
      if (s === 'needs_install') throw new Error('iPhone’da bildirim için önce BilardoGo’yu ana ekrana ekle.');
      if (s === 'denied') throw new Error('Bildirim izni tarayıcı ayarlarından engellenmiş. Site ayarlarından izin ver.');
      if (s === 'unsupported') throw new Error('Bu tarayıcı anlık bildirimleri desteklemiyor.');
      const sub = await subscribePush();
      if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        setSupport(pushSupport());
        throw new Error('Bildirim izni verilmedi ya da bildirim servisi şu an kullanılamıyor.');
      }
      await save.mutateAsync({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }, [save]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const endpoint = await unsubscribePush().catch(() => null);
      if (endpoint) await drop.mutateAsync({ endpoint });
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [drop]);

  return { support, subscribed, busy, enable, disable };
}
