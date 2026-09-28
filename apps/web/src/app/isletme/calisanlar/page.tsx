'use client';
import { STAFF_PERMISSION_LABELS, STAFF_PERMISSIONS } from '@bilardogo/domain';
import { Badge, Button, Card, CardBody, CardHeader, Dialog, DialogContent, DialogFooter, EmptyState, Field, Input, Notice, cn, toast } from '@bilardogo/ui';
import { Info, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { UserChip } from '@/components/common/user-chip';
import type { StaffPermission } from '@/components/business/context';
import { BizPage, ConfirmDialog, Gate } from '@/components/business/ui';
import { formatDate } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

const PERM_SHORT: Record<StaffPermission, string> = {
  orders: 'Siparişler',
  tables: 'Masalar',
  posts: 'Duyurular',
  chat: 'Salon sohbeti',
};

function PermissionChecks({ value, onChange }: { value: StaffPermission[]; onChange: (v: StaffPermission[]) => void }) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border">
      {STAFF_PERMISSIONS.map((p) => {
        const on = value.includes(p);
        return (
          <label key={p} className="flex cursor-pointer items-start gap-3 p-3">
            <input
              type="checkbox"
              checked={on}
              onChange={() => onChange(on ? value.filter((x) => x !== p) : [...value, p])}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
            />
            <span>
              <span className={cn('block text-sm font-semibold', on ? 'text-fg' : 'text-muted')}>{PERM_SHORT[p]}</span>
              <span className="block text-xs text-muted">{STAFF_PERMISSION_LABELS[p]}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function AddStaffCard({ businessId }: { businessId: string }) {
  const utils = trpc.useUtils();
  const [identifier, setIdentifier] = useState('');
  const [perms, setPerms] = useState<StaffPermission[]>(['orders', 'tables']);
  const [errors, setErrors] = useState<{ identifier?: string; perms?: string }>({});
  const add = trpc.business.addStaff.useMutation({
    onSuccess: () => {
      toast.success('Çalışan eklendi.');
      setIdentifier('');
      void utils.business.staff.invalidate({ businessId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const submit = () => {
    const e: typeof errors = {};
    const id = identifier.trim();
    if (id.length < 3) e.identifier = '@kullanıcıadı veya e-posta girin.';
    if (!perms.length) e.perms = 'En az bir yetki seçin.';
    setErrors(e);
    if (Object.keys(e).length) return;
    add.mutate({ businessId, identifier: id, permissions: perms });
  };
  return (
    <Card>
      <CardHeader icon={<UserPlus className="h-5 w-5" />} title="Çalışan ekle" description="Çalışanın önce BilardoGo’ya üye olması gerekir." />
      <CardBody className="space-y-3">
        <Field label="Kullanıcı adı veya e-posta" required error={errors.identifier}>
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="@kasim veya kasim@ornek.com" autoCapitalize="none" autoCorrect="off" />
        </Field>
        <Field label="Yetkiler" error={errors.perms}>
          <PermissionChecks value={perms} onChange={setPerms} />
        </Field>
        <Button block onClick={submit} loading={add.isPending}>
          <UserPlus className="h-4 w-4" />
          Çalışanı ekle
        </Button>
      </CardBody>
    </Card>
  );
}

type Member = { user: { id: string; displayName: string }; permissions: string[] };

function EditPermsDialog({ businessId, member, onClose }: { businessId: string; member: Member; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [perms, setPerms] = useState<StaffPermission[]>(member.permissions as StaffPermission[]);
  const [error, setError] = useState<string | null>(null);
  const update = trpc.business.updateStaff.useMutation({
    onSuccess: () => {
      toast.success('Yetkiler güncellendi.');
      onClose();
      void utils.business.staff.invalidate({ businessId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Yetkileri düzenle" description={member.user.displayName}>
        <PermissionChecks value={perms} onChange={setPerms} />
        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
            Vazgeç
          </Button>
          <Button
            loading={update.isPending}
            onClick={() => {
              if (!perms.length) return setError('En az bir yetki seçin.');
              update.mutate({ businessId, userId: member.user.id, permissions: perms });
            }}
          >
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Staff({ businessId }: { businessId: string }) {
  const utils = trpc.useUtils();
  const q = trpc.business.staff.useQuery({ businessId });
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const remove = trpc.business.removeStaff.useMutation({
    onSuccess: () => {
      toast.success('Çalışan kaldırıldı.');
      setRemoving(null);
      void utils.business.staff.invalidate({ businessId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="space-y-4">
      <Notice tone="info" icon={<Info />}>
        Çalışan hesabı salonla ilgili ayarları değiştiremez; siparişleri görür, hazırlar, kapatır, masaları onaylar, duyuru girer (verilen yetkiye göre).
      </Notice>
      {q.isLoading ? (
        <ListSkeleton rows={2} />
      ) : q.error ? (
        <QueryError error={q.error} retry={() => q.refetch()} />
      ) : (
        <ul className="space-y-2">
          {q.data?.map((m) => (
            <li key={m.user.id} className="rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <UserChip user={m.user} className="min-w-0 flex-1" subtitle={`${m.user.username ? `@${m.user.username} · ` : ''}${formatDate(m.since)} tarihinden beri`} />
                {m.role === 'owner' ? (
                  <Badge tone="brand">Sahip</Badge>
                ) : (
                  <>
                    <Button size="icon-sm" variant="ghost" aria-label="Yetkileri düzenle" onClick={() => setEditing(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label="Çalışanı kaldır" onClick={() => setRemoving(m)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {m.role === 'staff' ? (
                <div className="mt-2 flex flex-wrap gap-1 pl-12">
                  {m.permissions.map((p) => (
                    <Badge key={p} tone="neutral">
                      {PERM_SHORT[p as StaffPermission] ?? p}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
          {q.data && q.data.filter((m) => m.role === 'staff').length === 0 ? (
            <EmptyState icon={<Users />} title="Henüz çalışan eklemedin" description="Siparişleri ve masaları yönetmesi için çalışanlarını ekle." className="py-6" />
          ) : null}
        </ul>
      )}
      <AddStaffCard businessId={businessId} />
      {editing ? <EditPermsDialog businessId={businessId} member={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Çalışan kaldırılsın mı?"
        description={removing ? `${removing.user.displayName} artık işletme panelini kullanamaz.` : undefined}
        confirmLabel="Kaldır"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate({ businessId, userId: removing.user.id })}
      />
    </div>
  );
}

export default function StaffPage() {
  return (
    <BizPage title="Çalışanlarım" subtitle="Sınırlı yetkili çalışan hesapları">
      <Gate ownerOnly>{({ business }) => <Staff businessId={business.id} />}</Gate>
    </BizPage>
  );
}
