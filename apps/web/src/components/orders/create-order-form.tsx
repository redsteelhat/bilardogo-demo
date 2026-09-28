'use client';
import { Button, Card, cn, Field, Input, Textarea, toast } from '@bilardogo/ui';
import { ClipboardList, NotebookPen, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { errorMessage, trpc } from '@/lib/trpc/client';

/** Bireysel sipariş ya da grup sipariş oturumu başlatma: konum zorunlu, not opsiyonel. */
export function CreateOrderForm({ venueId, onCreated }: { venueId: string; onCreated: (id: string) => void }) {
  const [kind, setKind] = useState<'individual' | 'group'>('individual');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const utils = trpc.useUtils();
  const create = trpc.orders.create.useMutation({
    onSuccess: async (r) => {
      await utils.orders.invalidate();
      toast.success(kind === 'group' ? 'Sipariş oturumu açıldı' : 'Siparişin açıldı', {
        description: kind === 'group' ? `Katılım kodu: ${r.joinCode}` : 'Şimdi ürünleri seçebilirsin.',
      });
      onCreated(r.id);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const locErr = location.trim().length < 2 ? 'Lütfen bulunduğunuz konumu belirtin (ör. Masa 4, arka salon, bahçe).' : null;
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <KindOption
          active={kind === 'individual'}
          onClick={() => setKind('individual')}
          icon={<UserRound className="h-5 w-5" />}
          title="Bireysel Sipariş"
          subtitle="Kişisel hesap · yalnız sen"
        />
        <KindOption
          active={kind === 'group'}
          onClick={() => setKind('group')}
          icon={<Users className="h-5 w-5" />}
          title="Sipariş Oturumu"
          subtitle="Grup için ortak oturum · kodla katılım"
        />
      </div>
      <Card className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <NotebookPen className="h-5 w-5" />
          </span>
          <div>
            <div className="font-semibold">Sipariş Notu & Masa / Konum</div>
            <p className="text-xs text-muted">Siparişin doğru noktaya ulaşması için konum bilgisini gir.</p>
          </div>
        </div>
        <Field label="Masa / Konum" required error={touched && locErr ? locErr : undefined}>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Örn. Masa 4, arka salon, bahçe" />
        </Field>
        <Field label="Sipariş notu" hint="Opsiyonel">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} placeholder="Örn. Buzsuz, açık çay, az şekerli…" />
        </Field>
        <Button
          block
          size="lg"
          loading={create.isPending}
          onClick={() => {
            setTouched(true);
            if (locErr) return;
            create.mutate({ venueId, kind, locationText: location.trim(), note: note.trim() || null });
          }}
        >
          <ClipboardList className="h-5 w-5" /> {kind === 'group' ? 'Oturumu başlat' : 'Siparişe başla'}
        </Button>
      </Card>
    </div>
  );
}

function KindOption({ active, onClick, icon, title, subtitle }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors',
        active ? 'border-brand/60 bg-brand-soft' : 'border-border bg-surface hover:bg-surface-2',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', active ? 'bg-brand text-brand-fg' : 'bg-surface-3 text-muted')}>{icon}</span>
      <span className="min-w-0">
        <span className={cn('block font-semibold', active && 'text-brand')}>{title}</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </button>
  );
}
