'use client';
import { Button, Card, CardBody, CardHeader, Skeleton, toast } from '@bilardogo/ui';
import { Copy, Download, Printer, QrCode } from 'lucide-react';
import Link from 'next/link';
import { QueryError } from '@/components/common/states';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { copyText, downloadPng, QrImage } from './qr-dialog';

/** Sipariş QR'ı: salonun sipariş sayfasını açar (masa QR'ından ayrıdır). */
export function OrderQrCard({ venueId }: { venueId: string }) {
  const q = trpc.business.orderQr.useQuery({ venueId });
  return (
    <Card>
      <CardHeader
        icon={<QrCode className="h-5 w-5" />}
        title="Sipariş QR kodu"
        description="Masalara veya bara as; okutan oyuncu doğrudan salonunun sipariş sayfasına gider."
      />
      <CardBody>
        {q.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : q.data ? (
          <div className="flex gap-4">
            <div className="w-28 shrink-0 rounded-2xl bg-white p-2">
              <QrImage svg={q.data.svg} className="[&_svg]:h-auto [&_svg]:w-full" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <code className="block truncate rounded-lg bg-surface-2 px-2 py-1.5 text-[11px] text-muted">{q.data.url}</code>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => void copyText(q.data!.url)}>
                  <Copy className="h-3.5 w-3.5" />
                  Kopyala
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadPng(q.data!.svg, 'bilardogo-siparis-qr').catch((e) => toast.error(errorMessage(e)))}
                >
                  <Download className="h-3.5 w-3.5" />
                  PNG
                </Button>
                <Link href="/isletme/masalar/afis?tur=siparis">
                  <Button size="sm">
                    <Printer className="h-3.5 w-3.5" />
                    Afiş
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
