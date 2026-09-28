'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Button, Field, Input, Notice, Skeleton, Switch, toast } from '@bilardogo/ui';
import { Clock, CreditCard, Headphones, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { AdminPage, ConfirmDialog } from '@/components/admin-ui';
import { Panel, QueryError } from '@/components/admin/common';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Settings = RouterOutputs['admin']['settings'];
type Key = 'trial_days' | 'subscriptions_enforced' | 'presence' | 'support' | 'chat';

function useSave() {
  const utils = trpc.useUtils();
  return trpc.admin.saveSetting.useMutation({
    onSuccess: async () => {
      toast.success('Ayar kaydedildi.');
      await utils.admin.settings.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));

export default function SettingsPage() {
  const q = trpc.admin.settings.useQuery();
  return (
    <AdminPage title="Ayarlar" description="Uygulama genelindeki kurallar. Değişiklikler anında backend tarafından uygulanır.">
      {q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : q.error || !q.data ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SubscriptionSettings s={q.data} />
          <PresenceSettings s={q.data} />
          <SupportSettings s={q.data} />
          <ChatSettings s={q.data} />
        </div>
      )}
    </AdminPage>
  );
}

function SaveBar({ dirty, loading, onSave, onReset, disabled }: { dirty: boolean; loading: boolean; onSave: () => void; onReset: () => void; disabled?: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      {dirty ? (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Geri al
        </Button>
      ) : null}
      <Button size="sm" loading={loading} disabled={!dirty || disabled} onClick={onSave}>
        Kaydet
      </Button>
    </div>
  );
}

function SubscriptionSettings({ s }: { s: Settings }) {
  const save = useSave();
  const [trial, setTrial] = useState(String(s.trial_days));
  const [confirm, setConfirm] = useState<boolean | null>(null);
  const t = num(trial);
  const trialErr = !Number.isInteger(t) || t < 0 || t > 365 ? '0–365 gün arasında bir tam sayı girin.' : null;
  const saveKey = (key: Key, value: unknown, after?: () => void) => save.mutate({ key, value }, { onSuccess: after });
  return (
    <Panel title={<span className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-brand" /> Abonelik</span>}>
      <div className="space-y-5">
        <Field label="Deneme süresi (gün)" error={trialErr} hint="Yeni kullanıcı ve yeni onaylanan işletmeler bu kadar gün ücretsiz kullanır. Mevcut denemeler değişmez.">
          <Input type="number" min={0} max={365} value={trial} onChange={(e) => setTrial(e.target.value)} className="w-32" />
        </Field>
        <div className="flex justify-end">
          <Button size="sm" loading={save.isPending && save.variables?.key === 'trial_days'} disabled={!!trialErr || t === s.trial_days} onClick={() => saveKey('trial_days', t)}>
            Deneme süresini kaydet
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Abonelik zorunlu</div>
              <div className="text-xs text-muted">{s.subscriptions_enforced ? 'Açık' : 'Kapalı'}</div>
            </div>
            <Switch checked={s.subscriptions_enforced} onCheckedChange={(v) => setConfirm(v)} aria-label="Abonelik zorunlu" />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Açıkken deneme süresi bitmiş ve aktif aboneliği olmayan kullanıcı ve işletmeler abonelik gerektiren işlemleri (ör. maç isteği, sipariş
            verme) yapamaz. Kontrol yalnız ekrandaki butonla değil, backend tarafında yapılır. Kapalıyken herkes tüm özellikleri kullanır; süreler
            yine de takip edilir.
          </p>
        </div>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? 'Abonelik zorunlu hâle getirilsin mi?' : 'Abonelik zorunluluğu kaldırılsın mı?'}
        description={
          confirm
            ? 'Deneme süresi bitmiş ve aboneliği olmayan kullanıcı ve işletmeler abonelik gerektiren işlemleri hemen yapamaz hâle gelir.'
            : 'Tüm kullanıcı ve işletmeler abonelik durumundan bağımsız olarak tüm özellikleri kullanabilir.'
        }
        confirmLabel={confirm ? 'Zorunlu yap' : 'Zorunluluğu kaldır'}
        tone={confirm ? 'danger' : 'primary'}
        loading={save.isPending}
        onConfirm={() => confirm !== null && saveKey('subscriptions_enforced', confirm, () => setConfirm(null))}
      />
    </Panel>
  );
}

function PresenceSettings({ s }: { s: Settings }) {
  const save = useSave();
  const init = { at: String(s.presence.atVenueHours), grace: String(s.presence.comingGraceHours), ahead: String(s.presence.maxComingAheadHours) };
  const [v, setV] = useState(init);
  const at = num(v.at);
  const grace = num(v.grace);
  const ahead = num(v.ahead);
  const errors = {
    at: !(at >= 1 && at <= 24) ? '1–24 saat arasında olmalı.' : null,
    grace: !(grace >= 0 && grace <= 6) ? '0–6 saat arasında olmalı.' : null,
    ahead: !(ahead >= 1 && ahead <= 48) ? '1–48 saat arasında olmalı.' : null,
  };
  const dirty = v.at !== init.at || v.grace !== init.grace || v.ahead !== init.ahead;
  return (
    <Panel title={<span className="flex items-center gap-2"><Clock className="h-5 w-5 text-brand" /> Salon durumu süreleri</span>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Salondayım (saat)" error={errors.at} hint="Bu süre sonunda otomatik çevrimdışı olur.">
          <Input type="number" step="0.5" min={1} max={24} value={v.at} onChange={(e) => setV({ ...v, at: e.target.value })} />
        </Field>
        <Field label="Geleceğim toleransı (saat)" error={errors.grace} hint="Belirtilen saatten sonra bu kadar beklenir.">
          <Input type="number" step="0.5" min={0} max={6} value={v.grace} onChange={(e) => setV({ ...v, grace: e.target.value })} />
        </Field>
        <Field label="En fazla ileri saat" error={errors.ahead} hint="“Geleceğim” en fazla kaç saat sonrası için seçilebilir.">
          <Input type="number" min={1} max={48} value={v.ahead} onChange={(e) => setV({ ...v, ahead: e.target.value })} />
        </Field>
      </div>
      <SaveBar
        dirty={dirty}
        loading={save.isPending}
        disabled={Object.values(errors).some(Boolean)}
        onReset={() => setV(init)}
        onSave={() => save.mutate({ key: 'presence', value: { atVenueHours: at, comingGraceHours: grace, maxComingAheadHours: ahead } })}
      />
    </Panel>
  );
}

function SupportSettings({ s }: { s: Settings }) {
  const save = useSave();
  const init = { email: s.support.email ?? '', whatsapp: s.support.whatsapp ?? '' };
  const [v, setV] = useState(init);
  const emailErr = v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()) ? 'Geçerli bir e-posta girin.' : null;
  const waErr = v.whatsapp.trim().length > 30 ? 'En fazla 30 karakter.' : v.whatsapp.trim() && !/^[+\d\s()-]{10,}$/.test(v.whatsapp.trim()) ? 'Geçerli bir telefon girin (ör. +90 5xx xxx xx xx).' : null;
  const dirty = v.email !== init.email || v.whatsapp !== init.whatsapp;
  return (
    <Panel title={<span className="flex items-center gap-2"><Headphones className="h-5 w-5 text-brand" /> Destek iletişim</span>}>
      <div className="space-y-4">
        <Field label="Destek e-postası" error={emailErr} hint="Uygulamadaki Yardım bölümünde gösterilir.">
          <Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} placeholder="destek@bilardogo.com" />
        </Field>
        <Field label="WhatsApp hattı" error={waErr}>
          <Input value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} placeholder="+90 5xx xxx xx xx" inputMode="tel" />
        </Field>
      </div>
      <SaveBar
        dirty={dirty}
        loading={save.isPending}
        disabled={!!emailErr || !!waErr}
        onReset={() => setV(init)}
        onSave={() => save.mutate({ key: 'support', value: { email: v.email.trim() || null, whatsapp: v.whatsapp.trim() || null } })}
      />
    </Panel>
  );
}

function ChatSettings({ s }: { s: Settings }) {
  const save = useSave();
  const init = { img: String(s.chat.maxImageMb), vid: String(s.chat.maxVideoMb) };
  const [v, setV] = useState(init);
  const img = num(v.img);
  const vid = num(v.vid);
  const errors = { img: !(img >= 1 && img <= 10) ? '1–10 MB arasında olmalı.' : null, vid: !(vid >= 1 && vid <= 50) ? '1–50 MB arasında olmalı.' : null };
  const dirty = v.img !== init.img || v.vid !== init.vid;
  return (
    <Panel title={<span className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-brand" /> Sohbet medya limitleri</span>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fotoğraf (MB)" error={errors.img}>
          <Input type="number" min={1} max={10} value={v.img} onChange={(e) => setV({ ...v, img: e.target.value })} />
        </Field>
        <Field label="Video (MB)" error={errors.vid}>
          <Input type="number" min={1} max={50} value={v.vid} onChange={(e) => setV({ ...v, vid: e.target.value })} />
        </Field>
      </div>
      <Notice tone="info" className="mt-4">
        Depolama tarafındaki üst sınır fotoğraf için 10 MB, video için 50 MB’dır; burada yalnız daha düşük bir sınır belirlenebilir.
      </Notice>
      <SaveBar
        dirty={dirty}
        loading={save.isPending}
        disabled={!!errors.img || !!errors.vid}
        onReset={() => setV(init)}
        onSave={() => save.mutate({ key: 'chat', value: { maxImageMb: img, maxVideoMb: vid } })}
      />
    </Panel>
  );
}
