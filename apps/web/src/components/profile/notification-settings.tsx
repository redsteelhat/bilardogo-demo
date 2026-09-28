'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { GAME_LABELS, GAME_TYPES, type GameType } from '@bilardogo/domain';
import { Card, CardBody, CardHeader, Field, MultiToggle, Notice, Skeleton, SwitchRow, toast } from '@bilardogo/ui';
import { Bell, Share, SquarePlus } from 'lucide-react';
import { QueryError } from '@/components/common/states';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { usePushDevice } from './use-push';

type Prefs = RouterOutputs['me']['prefs'];
type EditablePrefs = Pick<Prefs, 'pushEnabled' | 'presence' | 'match' | 'social' | 'order' | 'venue' | 'bulletin' | 'venueActivity' | 'gameTypes'>;

const CATEGORIES: { key: keyof Omit<EditablePrefs, 'pushEnabled' | 'gameTypes' | 'venueActivity'>; label: string; description: string }[] = [
  { key: 'presence', label: 'Salon hareketleri', description: 'Arkadaşların salona geldiğinde / gelecekken' },
  { key: 'match', label: 'Maçlar', description: 'Maç isteği, kabul, sonuç girişi ve onayı' },
  { key: 'social', label: 'Sosyal', description: 'Yeni mesaj ve arkadaşlık istekleri' },
  { key: 'order', label: 'Siparişler', description: 'Siparişin hazır olduğunda' },
  { key: 'venue', label: 'Salon duyuruları', description: 'Takip ettiğin salonların duyuru ve kampanyaları' },
  { key: 'bulletin', label: 'BilardoGo Bülteni', description: 'Haberler, canlı yayınlar ve yeni özellikler' },
];

/** iOS'ta web push için "Ana ekrana ekle" yönergesi. */
export function InstallHint() {
  return (
    <Notice tone="info" icon={<SquarePlus />} title="iPhone’da bildirim almak için">
      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
        <li>
          Safari’de alttaki <Share className="inline h-3.5 w-3.5 align-[-2px]" /> <b>Paylaş</b> düğmesine dokun.
        </li>
        <li>
          <b>Ana Ekrana Ekle</b>’yi seç, ardından BilardoGo’yu ana ekrandan aç.
        </li>
        <li>Buradan bildirimleri aç.</li>
      </ol>
    </Notice>
  );
}

export function NotificationSettings() {
  const prefs = trpc.me.prefs.useQuery();
  const utils = trpc.useUtils();
  const push = usePushDevice();
  const update = trpc.me.updatePrefs.useMutation({
    onMutate: async (next) => {
      await utils.me.prefs.cancel();
      const prev = utils.me.prefs.getData();
      if (prev) utils.me.prefs.setData(undefined, { ...prev, ...next });
      return { prev };
    },
    onError: (e, _v, c) => {
      if (c?.prev) utils.me.prefs.setData(undefined, c.prev);
      toast.error(errorMessage(e));
    },
    onSuccess: () => toast.success('Bildirim tercihlerin kaydedildi', { id: 'prefs' }),
  });

  if (prefs.isLoading) {
    return (
      <Card>
        <CardHeader icon={<Bell className="h-5 w-5" />} title="Bildirimler" />
        <CardBody className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardBody>
      </Card>
    );
  }
  if (prefs.error || !prefs.data) return <QueryError error={prefs.error} retry={() => prefs.refetch()} />;
  const p = prefs.data;
  const current: EditablePrefs = {
    pushEnabled: p.pushEnabled,
    presence: p.presence,
    match: p.match,
    social: p.social,
    order: p.order,
    venue: p.venue,
    bulletin: p.bulletin,
    venueActivity: p.venueActivity,
    gameTypes: p.gameTypes,
  };
  const set = (patch: Partial<EditablePrefs>) => update.mutate({ ...current, ...patch });

  const togglePush = async (on: boolean) => {
    try {
      if (on) {
        await push.enable();
        set({ pushEnabled: true });
        toast.success('Anlık bildirimler bu cihazda açıldı');
      } else {
        await push.disable();
        set({ pushEnabled: false });
      }
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const pushOn = p.pushEnabled && push.subscribed === true;

  return (
    <Card>
      <CardHeader icon={<Bell className="h-5 w-5" />} title="Bildirimler" description="Hangi durumlarda haber verelim?" />
      <CardBody className="space-y-2">
        <div className="divide-y divide-border">
          <SwitchRow
            label="Anlık bildirimler (bu cihaz)"
            description={
              push.support === 'unsupported'
                ? 'Bu tarayıcı anlık bildirimleri desteklemiyor; bildirimler uygulama içinde görünür.'
                : push.support === 'denied'
                  ? 'İzin tarayıcı ayarlarından engellenmiş.'
                  : pushOn
                    ? 'Açık · kapalıyken bildirimler yalnız uygulama içinde görünür'
                    : 'Kapalı · bildirimler yalnız uygulama içinde görünür'
            }
            checked={pushOn}
            disabled={push.busy || push.subscribed === null || push.support === 'unsupported' || push.support === 'needs_install'}
            onCheckedChange={(v) => void togglePush(v)}
          />
        </div>
        {push.support === 'needs_install' ? <InstallHint /> : null}
        <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-subtle">Kategoriler</div>
        <div className="divide-y divide-border">
          {CATEGORIES.map((c) => (
            <SwitchRow key={c.key} label={c.label} description={c.description} checked={p[c.key]} onCheckedChange={(v) => set({ [c.key]: v })} />
          ))}
          <SwitchRow
            label="Takip ettiğim salonlardaki hareketler"
            description="Kapalıyken yalnız arkadaşlarının salon ve maç hareketleri bildirilir"
            checked={p.venueActivity}
            onCheckedChange={(v) => set({ venueActivity: v })}
          />
        </div>
        <Field label="Oyun türü filtresi" hint={p.gameTypes.length ? 'Yalnız seçili türlerdeki maç hareketleri bildirilir' : 'Hiçbiri seçili değil: tüm türler'} className="pt-3">
          <MultiToggle<GameType>
            value={p.gameTypes}
            onChange={(gameTypes) => set({ gameTypes })}
            options={GAME_TYPES.map((g) => ({ value: g, label: GAME_LABELS[g] }))}
          />
        </Field>
      </CardBody>
    </Card>
  );
}
