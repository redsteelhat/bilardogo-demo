'use client';
import { Button, Dialog, DialogContent, DialogFooter, Field, Input, Notice, Select, SwitchRow, Textarea, toast } from '@bilardogo/ui';
import { useMemo, useState } from 'react';
import { formatMoney, fromLocalInputValue, toLocalInputValue } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from './labels';

export type SubDialog = 'activate' | 'extend' | 'cancel' | 'payment' | null;

function useInvalidate(subscriptionId: string) {
  const utils = trpc.useUtils();
  return () =>
    Promise.all([
      utils.admin.subscription.invalidate({ subscriptionId }),
      utils.admin.subscriptions.invalidate(),
      utils.admin.dashboard.invalidate(),
      utils.admin.user.invalidate(),
      utils.admin.users.invalidate(),
      utils.admin.businesses.invalidate(),
    ]);
}

/** "1.250,50" ve "1250.50" biçimlerini kabul eder. */
const parseAmount = (v: string) => {
  const t = v.trim().replace(/\s|₺/g, '');
  return t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
};

export function SubscriptionDialogs({
  open,
  onClose,
  subscriptionId,
  subjectType,
  currentPlanId,
}: {
  open: SubDialog;
  onClose: () => void;
  subscriptionId: string;
  subjectType: 'user' | 'business';
  currentPlanId: string | null;
}) {
  return (
    <Dialog open={open !== null} onOpenChange={(o) => !o && onClose()}>
      {open === 'activate' ? (
        <DialogContent title="Manuel aktive et" description="Ödeme alındığında plan ve dönemi belirleyin.">
          <ActivateForm subscriptionId={subscriptionId} subjectType={subjectType} currentPlanId={currentPlanId} onClose={onClose} />
        </DialogContent>
      ) : open === 'extend' ? (
        <DialogContent title="Deneme süresini uzat" description="Deneme bitiş tarihine gün eklenir; süresi geçmişse bugünden itibaren başlar.">
          <ExtendForm subscriptionId={subscriptionId} onClose={onClose} />
        </DialogContent>
      ) : open === 'cancel' ? (
        <DialogContent title="Abonelik iptal edilsin mi?" description="Abonelik “İptal” durumuna geçer; abonelik zorunluysa ücretli işlemler kapanır.">
          <CancelForm subscriptionId={subscriptionId} onClose={onClose} />
        </DialogContent>
      ) : open === 'payment' ? (
        <DialogContent title="Ödeme kaydet" description="Alınan (veya iade edilen) ödemeyi kayda geçirin. Abonelik dönemi değişmez.">
          <PaymentForm subscriptionId={subscriptionId} onClose={onClose} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function ActivateForm({ subscriptionId, subjectType, currentPlanId, onClose }: { subscriptionId: string; subjectType: 'user' | 'business'; currentPlanId: string | null; onClose: () => void }) {
  const invalidate = useInvalidate(subscriptionId);
  const plans = trpc.admin.plans.useQuery();
  const options = useMemo(() => (plans.data ?? []).filter((p) => p.audience === subjectType && (p.isActive || p.id === currentPlanId)), [plans.data, subjectType, currentPlanId]);
  const [planId, setPlanId] = useState(currentPlanId ?? '');
  const plan = options.find((p) => p.id === planId) ?? null;
  const [months, setMonths] = useState('');
  const [start, setStart] = useState('');
  const [withPayment, setWithPayment] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const m = trpc.admin.activateSubscription.useMutation({
    onSuccess: () => {
      toast.success('Abonelik aktive edildi.');
      onClose();
      void invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const monthsN = months ? Number(months) : (plan?.intervalMonths ?? 1);
  const suggested = plan ? (plan.price / plan.intervalMonths) * monthsN : 0;
  const amountN = amount ? parseAmount(amount) : suggested;
  const errors = {
    plan: !planId ? 'Plan seçin.' : null,
    months: !Number.isInteger(monthsN) || monthsN < 1 || monthsN > 36 ? '1–36 ay arasında olmalı.' : null,
    amount: withPayment && (!Number.isFinite(amountN) || amountN < 0) ? 'Geçerli bir tutar girin.' : null,
  };
  const invalid = Object.values(errors).some(Boolean);

  if (plans.isLoading) return <p className="text-sm text-muted">Planlar yükleniyor…</p>;
  if (!options.length) return <Notice tone="warning">Bu abonelik türü için aktif plan yok. Önce Planlar sayfasından plan ekleyin.</Notice>;

  return (
    <>
      <div className="space-y-4">
        <Field label="Plan" required error={touched ? errors.plan : null}>
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Plan seçin</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatMoney(p.price)} / {p.intervalMonths} ay{p.isActive ? '' : ' (pasif)'}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Süre (ay)" error={touched ? errors.months : null} hint={plan ? `Boş: plan süresi (${plan.intervalMonths} ay)` : undefined}>
            <Input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} placeholder={plan ? String(plan.intervalMonths) : ''} />
          </Field>
          <Field label="Başlangıç (isteğe bağlı)" hint="Boş: aktif dönem varsa sonuna eklenir, yoksa bugünden.">
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 px-4">
          <SwitchRow label="Ödeme kaydı da oluştur" description="Aktivasyonla birlikte alınan ödemeyi kaydeder." checked={withPayment} onCheckedChange={setWithPayment} />
        </div>
        {withPayment ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tutar (₺)" error={touched ? errors.amount : null} hint={plan ? `Önerilen: ${formatMoney(suggested)}` : undefined}>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={suggested ? suggested.toFixed(2) : '0'} />
            </Field>
            <Field label="Yöntem">
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((x) => (
                  <option key={x} value={x}>
                    {PAYMENT_METHOD_LABELS[x]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Referans / dekont no" className="sm:col-span-2">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
            </Field>
          </div>
        ) : null}
        <Field label="Not">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button
          loading={m.isPending}
          onClick={() => {
            setTouched(true);
            if (invalid) return;
            m.mutate({
              subscriptionId,
              planId,
              months: monthsN,
              periodStart: start ? fromLocalInputValue(start) : undefined,
              payment: withPayment ? { amount: Math.round(amountN * 100) / 100, method, reference: reference.trim() || null } : null,
              note: note.trim() || null,
            });
          }}
        >
          Aktive et
        </Button>
      </DialogFooter>
    </>
  );
}

function ExtendForm({ subscriptionId, onClose }: { subscriptionId: string; onClose: () => void }) {
  const invalidate = useInvalidate(subscriptionId);
  const [days, setDays] = useState('7');
  const [note, setNote] = useState('');
  const m = trpc.admin.extendTrial.useMutation({
    onSuccess: () => {
      toast.success('Deneme süresi uzatıldı.');
      onClose();
      void invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const n = Number(days);
  const invalid = !Number.isInteger(n) || n < 1 || n > 365;
  return (
    <>
      <div className="space-y-4">
        <Field label="Eklenecek gün" required error={invalid ? '1–365 gün arasında olmalı.' : null}>
          <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className="w-32" />
        </Field>
        <Field label="Not">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Ör. açılış kampanyası" />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button loading={m.isPending} disabled={invalid} onClick={() => m.mutate({ subscriptionId, days: n, note: note.trim() || null })}>
          {invalid ? 'Denemeyi uzat' : `${n} gün uzat`}
        </Button>
      </DialogFooter>
    </>
  );
}

function CancelForm({ subscriptionId, onClose }: { subscriptionId: string; onClose: () => void }) {
  const invalidate = useInvalidate(subscriptionId);
  const [note, setNote] = useState('');
  const m = trpc.admin.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success('Abonelik iptal edildi.');
      onClose();
      void invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <Field label="İptal sebebi">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} />
      </Field>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button variant="danger" loading={m.isPending} onClick={() => m.mutate({ subscriptionId, note: note.trim() || null })}>
          İptal et
        </Button>
      </DialogFooter>
    </>
  );
}

function PaymentForm({ subscriptionId, onClose }: { subscriptionId: string; onClose: () => void }) {
  const invalidate = useInvalidate(subscriptionId);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'paid' | 'refunded' | 'failed'>('paid');
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [paidAt, setPaidAt] = useState(toLocalInputValue(new Date()));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const m = trpc.admin.recordPayment.useMutation({
    onSuccess: () => {
      toast.success('Ödeme kaydedildi.');
      onClose();
      void invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const n = parseAmount(amount);
  const errors = { amount: !amount || !Number.isFinite(n) || n < 0 ? 'Geçerli bir tutar girin.' : null, paidAt: !paidAt ? 'Tarih seçin.' : null };
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tutar (₺)" required error={touched ? errors.amount : null}>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Durum">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="paid">Ödendi</option>
            <option value="refunded">İade</option>
            <option value="failed">Başarısız</option>
          </Select>
        </Field>
        <Field label="Yöntem">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((x) => (
              <option key={x} value={x}>
                {PAYMENT_METHOD_LABELS[x]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ödeme tarihi" required error={touched ? errors.paidAt : null}>
          <Input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </Field>
        <Field label="Referans / dekont no" className="sm:col-span-2">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Not" className="sm:col-span-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} />
        </Field>
      </div>
      <p className="mt-3 text-xs text-subtle">Dönemi uzatmak için “Manuel aktive et” kullanın; bu işlem yalnız ödeme kaydı ekler.</p>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button
          loading={m.isPending}
          onClick={() => {
            setTouched(true);
            if (errors.amount || errors.paidAt) return;
            m.mutate({ subscriptionId, amount: Math.round(n * 100) / 100, status, method, paidAt: fromLocalInputValue(paidAt), reference: reference.trim() || null, note: note.trim() || null });
          }}
        >
          Ödemeyi kaydet
        </Button>
      </DialogFooter>
    </>
  );
}
