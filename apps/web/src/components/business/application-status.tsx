'use client';
import { formatTrPhone } from '@bilardogo/domain';
import { Badge, Button, Card, CardBody, CardHeader, Dialog, DialogContent, DialogFooter, ListRow, Notice, toast } from '@bilardogo/ui';
import { AlertTriangle, Building2, ChevronRight, Clock, FileWarning, LayoutGrid, Package, Pencil, RotateCcw, Store, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { errorMessage, trpc } from '@/lib/trpc/client';
import {
  BusinessInfoFields,
  cleanBusinessInfo,
  validateBusinessInfo,
  type BusinessInfoErrors,
  type BusinessInfoValue,
} from './business-info-fields';
import type { MyBusiness } from './context';
import { DocumentsCard } from './documents-card';
import { BUSINESS_STATUS_LABELS, BUSINESS_STATUS_TONES } from './ui';

const HERO = {
  pending: {
    icon: Clock,
    title: 'Başvurun inceleniyor',
    text: 'BilardoGo ekibi belgelerini ve bilgilerini kontrol ediyor. Onaylandığında salonun uygulamada görünür ve panelin tüm bölümleri açılır.',
  },
  needs_docs: {
    icon: FileWarning,
    title: 'Ek belge gerekiyor',
    text: 'Başvurunu tamamlamak için aşağıdaki nota göre belgelerini güncelle, ardından tekrar incelemeye gönder.',
  },
  rejected: {
    icon: XCircle,
    title: 'Başvurun reddedildi',
    text: 'Aşağıdaki açıklamaya göre bilgilerini ve belgelerini düzeltip başvurunu tekrar incelemeye gönderebilirsin.',
  },
  approved: { icon: Building2, title: 'Başvurun onaylandı', text: '' },
} as const;

function EditInfoDialog({ business, open, onOpenChange }: { business: MyBusiness; open: boolean; onOpenChange: (v: boolean) => void }) {
  const utils = trpc.useUtils();
  const [value, setValue] = useState<BusinessInfoValue>({
    legalName: business.legalName,
    taxId: business.taxId ?? '',
    taxOffice: business.taxOffice ?? '',
    contactPhone: formatTrPhone(business.contactPhone) || (business.contactPhone ?? ''),
  });
  const [errors, setErrors] = useState<BusinessInfoErrors>({});
  const update = trpc.business.updateApplication.useMutation({
    onSuccess: () => {
      toast.success('Başvuru bilgilerin güncellendi.');
      onOpenChange(false);
      void utils.business.mine.invalidate();
      void utils.me.session.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const save = () => {
    const e = validateBusinessInfo(value);
    setErrors(e);
    if (Object.keys(e).length) return;
    update.mutate({ businessId: business.id, ...cleanBusinessInfo(value) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Başvuru bilgileri" description="Ticari bilgilerini düzenle.">
        <BusinessInfoFields value={value} onChange={setValue} errors={errors} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Vazgeç
          </Button>
          <Button onClick={save} loading={update.isPending}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApplicationInfoCard({ business }: { business: MyBusiness }) {
  const [editing, setEditing] = useState(false);
  const editable = business.status !== 'approved';
  return (
    <Card>
      <CardHeader
        icon={<Building2 className="h-5 w-5" />}
        title="Başvuru bilgileri"
        description={editable ? 'Onaylanana kadar düzenleyebilirsin.' : 'Onaylı işletmenin ticari bilgilerini değiştirmek için destekle iletişime geç.'}
        action={
          editable ? (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Düzenle
            </Button>
          ) : null
        }
      />
      <CardBody>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-subtle">Ticari unvan</dt>
            <dd className="font-medium">{business.legalName}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">VKN / TCKN</dt>
            <dd className="font-medium tabular-nums">{business.taxId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Vergi dairesi</dt>
            <dd className="font-medium">{business.taxOffice ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">İletişim telefonu</dt>
            <dd className="font-medium tabular-nums">{formatTrPhone(business.contactPhone) || '—'}</dd>
          </div>
        </dl>
      </CardBody>
      {editing ? <EditInfoDialog business={business} open={editing} onOpenChange={setEditing} /> : null}
    </Card>
  );
}

export function ApplicationStatus({ business }: { business: MyBusiness }) {
  const utils = trpc.useUtils();
  const resubmit = trpc.business.resubmit.useMutation({
    onSuccess: () => {
      toast.success('Başvurun tekrar incelemeye gönderildi.');
      void utils.business.mine.invalidate();
      void utils.me.session.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const hero = HERO[business.status];
  const Icon = hero.icon;
  const canResubmit = business.status === 'needs_docs' || business.status === 'rejected';
  const isOwner = business.role === 'owner';

  if (!isOwner) {
    return (
      <Notice tone="info" icon={<Clock />} title="İşletme başvurusu henüz onaylanmadı">
        İşletme sahibi başvuruyu tamamladığında ve BilardoGo onayladığında panel kullanılabilir olacak.
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{hero.title}</h2>
              <Badge tone={BUSINESS_STATUS_TONES[business.status]}>{BUSINESS_STATUS_LABELS[business.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{hero.text}</p>
          </div>
        </div>
        {business.reviewNote ? (
          <div className="px-4 pb-4">
            <Notice tone={business.status === 'rejected' ? 'danger' : 'warning'} icon={<AlertTriangle />} title="BilardoGo ekibinin notu">
              <span className="whitespace-pre-line">{business.reviewNote}</span>
            </Notice>
          </div>
        ) : null}
        {canResubmit ? (
          <div className="border-t border-border p-4">
            <Button block onClick={() => resubmit.mutate({ businessId: business.id })} loading={resubmit.isPending}>
              <RotateCcw className="h-4 w-4" />
              Tekrar incelemeye gönder
            </Button>
          </div>
        ) : null}
      </Card>

      {business.status === 'pending' && business.documents.length === 0 ? (
        <Notice tone="warning" icon={<FileWarning />} title="Belgelerini yükle">
          Başvurunun hızlı incelenmesi için vergi levhası ve imza sirkülerini aşağıdan yükle.
        </Notice>
      ) : null}

      <DocumentsCard business={business} />
      <ApplicationInfoCard business={business} />

      <Card>
        <CardHeader icon={<Store className="h-5 w-5" />} title="Bu sırada salonunu hazırla" description="Onay beklerken salon profilini, masalarını ve menünü tanımlayabilirsin." />
        <CardBody className="space-y-2">
          {[
            { href: '/isletme/salon', icon: <Store className="h-5 w-5" />, title: 'Salon profili', sub: 'Fotoğraflar, adres, çalışma saatleri' },
            { href: '/isletme/masalar', icon: <LayoutGrid className="h-5 w-5" />, title: 'Masalar ve QR kodları', sub: 'Masa numaraları ve oyun türleri' },
            { href: '/isletme/urunler', icon: <Package className="h-5 w-5" />, title: 'Ürünler', sub: 'Katalogdan “bende var” seçimi ve fiyatlar' },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="block">
              <ListRow icon={l.icon} title={l.title} subtitle={l.sub} right={<ChevronRight className="h-4 w-4 text-subtle" />} className="hover:border-brand/40" />
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
