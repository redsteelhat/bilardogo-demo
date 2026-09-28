'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Badge, Button, Dialog, DialogContent, DialogFooter, EmptyState, Field, Input, Segmented, SwitchRow, Textarea, toast } from '@bilardogo/ui';
import { Pencil, Plus, Tags } from 'lucide-react';
import { useState } from 'react';
import { AdminPage, DataTable, Td } from '@/components/admin-ui';
import { QueryError, TableSkeleton } from '@/components/admin/common';
import { formatMoney } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Plan = RouterOutputs['admin']['plans'][number];
type Audience = 'user' | 'business';

export default function PlansPage() {
  const q = trpc.admin.plans.useQuery();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <AdminPage
      title="Planlar"
      description="Kullanıcı ve işletme abonelik planları. Fiyat değişikliği mevcut aboneliklerin dönemini etkilemez."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Yeni plan
        </Button>
      }
    >
      {q.isLoading ? (
        <TableSkeleton rows={4} />
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={<Tags />} title="Henüz plan yok" action={<Button size="sm" onClick={() => setCreating(true)}>Yeni plan</Button>} />
      ) : (
        <div className="space-y-6">
          {(['user', 'business'] as const).map((aud) => {
            const rows = q.data.filter((p) => p.audience === aud);
            return (
              <section key={aud}>
                <h2 className="mb-2 font-display text-lg font-semibold">{aud === 'user' ? 'Kullanıcı planları' : 'İşletme planları'}</h2>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted">Bu grupta plan yok.</p>
                ) : (
                  <DataTable columns={['Plan', 'Fiyat', 'Süre', 'Aylık karşılığı', 'Durum', '']}>
                    {rows.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-2">
                        <Td>
                          <div className="font-semibold">{p.name}</div>
                          {p.description ? <div className="max-w-md text-xs text-muted">{p.description}</div> : null}
                        </Td>
                        <Td className="font-semibold">{formatMoney(p.price)}</Td>
                        <Td className="text-muted">{p.intervalMonths} ay</Td>
                        <Td className="text-muted">{formatMoney(p.price / p.intervalMonths)}</Td>
                        <Td>{p.isActive ? <Badge tone="success" dot>Aktif</Badge> : <Badge>Pasif</Badge>}</Td>
                        <Td className="text-right">
                          <Button size="icon-sm" variant="ghost" aria-label="Düzenle" onClick={() => setEditing(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </section>
            );
          })}
        </div>
      )}
      <Dialog open={creating || !!editing} onOpenChange={(o) => !o && close()}>
        {creating || editing ? (
          <DialogContent title={editing ? 'Planı düzenle' : 'Yeni plan'}>
            <PlanForm key={editing?.id ?? 'new'} plan={editing} onClose={close} />
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}

function PlanForm({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [audience, setAudience] = useState<Audience>(plan?.audience ?? 'user');
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [price, setPrice] = useState(plan ? String(plan.price) : '');
  const [months, setMonths] = useState(String(plan?.intervalMonths ?? 1));
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const m = trpc.admin.savePlan.useMutation({
    onSuccess: async () => {
      toast.success('Plan kaydedildi.');
      await utils.admin.plans.invalidate();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const priceN = Number(price.replace(',', '.'));
  const monthsN = Number(months);
  const errors = {
    name: name.trim().length < 2 ? 'Plan adı en az 2 karakter olmalı.' : null,
    price: price === '' || !Number.isFinite(priceN) || priceN < 0 || priceN > 1_000_000 ? 'Geçerli bir fiyat girin.' : null,
    months: !Number.isInteger(monthsN) || monthsN < 1 || monthsN > 36 ? '1–36 ay arasında olmalı.' : null,
  };
  return (
    <>
      <div className="space-y-4">
        <Field label="Hedef" required>
          <Segmented
            value={audience}
            onChange={setAudience}
            options={[
              { value: 'user', label: 'Kullanıcı' },
              { value: 'business', label: 'İşletme' },
            ]}
          />
          {plan ? <p className="mt-1 text-xs text-subtle">Aboneliklerde kullanılan planın hedefini değiştirmeyin.</p> : null}
        </Field>
        <Field label="Plan adı" required error={touched ? errors.name : null}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ör. Oyuncu Aylık" />
        </Field>
        <Field label="Açıklama" hint={`${description.length} / 300`}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fiyat (₺)" required error={touched ? errors.price : null}>
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="99,90" />
          </Field>
          <Field label="Süre (ay)" required error={touched ? errors.months : null}>
            <Input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} />
          </Field>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 px-4">
          <SwitchRow label="Aktif" description="Pasif plan yeni aktivasyonlarda seçilemez." checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button
          loading={m.isPending}
          onClick={() => {
            setTouched(true);
            if (errors.name || errors.price || errors.months) return;
            m.mutate({ id: plan?.id, audience, name: name.trim(), description: description.trim() || null, price: Math.round(priceN * 100) / 100, intervalMonths: monthsN, isActive });
          }}
        >
          Kaydet
        </Button>
      </DialogFooter>
    </>
  );
}
