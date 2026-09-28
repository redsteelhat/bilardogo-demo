'use client';
import { Button, Dialog, DialogContent, DialogFooter, EmptyState, Notice, cn } from '@bilardogo/ui';
import { Info, Lock, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageLoading, QueryError } from '@/components/common/states';
import { useBusiness, type MyBusiness, type MyVenue, type StaffPermission } from './context';

export const BUSINESS_STATUS_LABELS: Record<MyBusiness['status'], string> = {
  pending: 'İnceleniyor',
  needs_docs: 'Ek belge isteniyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

export const BUSINESS_STATUS_TONES = {
  pending: 'warning',
  needs_docs: 'info',
  approved: 'success',
  rejected: 'danger',
} as const;

export const DOC_KINDS = ['tax_certificate', 'signature_circular', 'trade_registry', 'id_copy', 'other'] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const DOC_KIND_LABELS: Record<DocKind, string> = {
  tax_certificate: 'Vergi levhası',
  signature_circular: 'İmza sirküleri',
  trade_registry: 'Ticaret sicil gazetesi',
  id_copy: 'Kimlik fotokopisi',
  other: 'Diğer',
};

export const PRODUCT_CATEGORIES = ['hot_drink', 'cold_drink', 'food', 'snack', 'other'] as const;
export const PRODUCT_CATEGORY_LABELS: Record<(typeof PRODUCT_CATEGORIES)[number], string> = {
  hot_drink: 'Sıcak içecekler',
  cold_drink: 'Soğuk içecekler',
  food: 'Yiyecek',
  snack: 'Atıştırmalık',
  other: 'Diğer',
};

export const SUBSCRIPTION_STATUS_LABELS = {
  trialing: 'Deneme süresi',
  active: 'Aktif',
  past_due: 'Ödeme gecikti',
  canceled: 'İptal edildi',
  expired: 'Süresi doldu',
  none: 'Abonelik yok',
} as const;

export const ITEM_STATUS_LABELS = {
  pending: 'Yeni',
  preparing: 'Hazırlanıyor',
  delivered: 'Teslim edildi',
  cancelled: 'İptal',
} as const;

/** Panel sayfası başlığı (kabuk başlığı zaten yapışkan olduğu için sade). */
export function BizPage({
  title,
  subtitle,
  actions,
  children,
  className,
  wide,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full px-4 pb-28 pt-4 lg:pb-10 print:p-0', wide ? 'max-w-5xl' : 'max-w-3xl', className)}>
      <div className="no-print mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold leading-tight">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

type GateCtx = { venueId: string; venue: MyVenue; business: MyBusiness };

/**
 * Sayfa erişim kontrolü: yükleniyor / işletme yok / yetki yok / onay bekleniyor durumlarını gösterir.
 * Geçerse seçili salonla children'ı çağırır.
 */
export function Gate({
  perm,
  ownerOnly,
  needsApproval,
  children,
}: {
  perm?: StaffPermission;
  ownerOnly?: boolean;
  needsApproval?: boolean;
  children: (ctx: GateCtx) => React.ReactNode;
}) {
  const b = useBusiness();
  if (b.loading) return <PageLoading />;
  if (b.error) return <QueryError error={b.error} retry={b.refetch} />;
  if (!b.business || !b.current) {
    return (
      <EmptyState
        icon={<Store />}
        title="Henüz bir işletme hesabın yok"
        description="Salonunu BilardoGo’ya eklemek için işletme başvurusu yap."
        action={
          <Link href="/isletme/basvuru">
            <Button>İşletme hesabı oluştur</Button>
          </Link>
        }
      />
    );
  }
  if (ownerOnly && !b.isOwner) {
    return (
      <Notice tone="warning" icon={<Lock />} title="Bu bölüm yalnız işletme sahibine açık">
        Çalışan hesabı salonla ilgili ayarları değiştiremez.
      </Notice>
    );
  }
  if (perm && !b.can(perm)) {
    return (
      <Notice tone="warning" icon={<Lock />} title="Bu bölüm için yetkin yok">
        Yetki almak için işletme sahibiyle görüş.
      </Notice>
    );
  }
  if (needsApproval && !b.approved) {
    return (
      <Notice tone="info" icon={<Info />} title="Başvurun onaylandıktan sonra açılır">
        Bu bölüm işletme başvurun BilardoGo tarafından onaylandığında kullanılabilir.{' '}
        <Link href="/isletme" className="font-semibold text-brand underline">
          Başvuru durumunu gör
        </Link>
      </Notice>
    );
  }
  return <>{children({ venueId: b.current.venue.id, venue: b.current.venue, business: b.current.business })}</>;
}

/** Onay penceresi (silme, kapatma vb.). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Onayla',
  tone = 'primary',
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger' | 'success';
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        {children}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Vazgeç
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentNotice({ className }: { className?: string }) {
  return (
    <Notice tone="brand" icon={<Info />} className={className}>
      Ödeme kasada alınır; BilardoGo sipariş ücreti tahsil etmez.
    </Notice>
  );
}

/** Belirli aralıkla yeniden çizim için şimdiki zaman. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function minutesSince(d: Date | string, now: number) {
  return Math.max(0, Math.floor((now - new Date(d).getTime()) / 60000));
}
