'use client';
import { GAME_SHORT_LABELS } from '@bilardogo/domain';
import { Button, Dialog, DialogContent, Notice, Skeleton, toast } from '@bilardogo/ui';
import { Copy, Download, Image as ImageIcon, Printer, RefreshCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { QueryError } from '@/components/common/states';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { ConfirmDialog } from './ui';

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(svg: string, fileName: string) {
  saveBlob(new Blob([svg], { type: 'image/svg+xml' }), `${fileName}.svg`);
}

export async function downloadPng(svg: string, fileName: string, size = 1024) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('PNG oluşturulamadı.');
  saveBlob(blob, `${fileName}.png`);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Bağlantı kopyalandı.');
  } catch {
    toast.error('Kopyalanamadı; bağlantıyı elle seçip kopyala.');
  }
}

/** Sunucuda üretilen QR SVG'sini gösterir (içerik bizim sunucumuzdan gelir). */
export function QrImage({ svg, className }: { svg: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function QrDialog({
  tableId,
  venueId,
  onOpenChange,
  canRegenerate,
}: {
  tableId: string | null;
  venueId: string;
  onOpenChange: (v: boolean) => void;
  canRegenerate: boolean;
}) {
  const utils = trpc.useUtils();
  const q = trpc.business.tableQr.useQuery({ tableId: tableId ?? '' }, { enabled: !!tableId });
  const [confirm, setConfirm] = useState(false);
  const regen = trpc.business.regenerateQr.useMutation({
    onSuccess: () => {
      toast.success('QR yenilendi. Yeni afişi yazdırıp masaya as.');
      setConfirm(false);
      void utils.business.tableQr.invalidate({ tableId: tableId ?? '' });
      void utils.business.tables.invalidate({ venueId });
      void utils.business.allTableQrs.invalidate({ venueId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const d = q.data;
  const fileName = d ? `bilardogo-masa-${d.number}` : 'bilardogo-qr';
  return (
    <Dialog open={!!tableId} onOpenChange={onOpenChange}>
      <DialogContent
        title={d ? `Masa ${d.number} QR kodu` : 'Masa QR kodu'}
        description={d ? `${d.venueName} · ${d.allowedGameTypes.map((g) => GAME_SHORT_LABELS[g]).join(' / ')}` : 'Yükleniyor…'}
      >
        {q.isLoading ? (
          <Skeleton className="mx-auto aspect-square w-64" />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : d ? (
          <div className="space-y-4">
            <div className="mx-auto w-64 rounded-3xl bg-white p-4 shadow-lg">
              <QrImage svg={d.svg} className="[&_svg]:h-auto [&_svg]:w-full" />
            </div>
            <p className="text-center text-xs text-muted">QR yalnız salonu ve masayı tanımlar; oyuncu veya maç bilgisi içermez.</p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2 pl-3">
              <code className="min-w-0 flex-1 truncate text-xs text-muted">{d.url}</code>
              <Button size="sm" variant="secondary" onClick={() => void copyText(d.url)}>
                <Copy className="h-3.5 w-3.5" />
                Kopyala
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => downloadSvg(d.svg, fileName)}>
                <Download className="h-4 w-4" />
                SVG indir
              </Button>
              <Button
                variant="secondary"
                onClick={() => downloadPng(d.svg, fileName).catch((e) => toast.error(errorMessage(e)))}
              >
                <ImageIcon className="h-4 w-4" />
                PNG indir
              </Button>
            </div>
            <Link href={`/isletme/masalar/afis?masa=${tableId}`} className="block">
              <Button block>
                <Printer className="h-4 w-4" />
                Afişi yazdır
              </Button>
            </Link>
            {canRegenerate ? (
              <div className="border-t border-border pt-3">
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirm(true)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  QR’ı yenile
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="QR yenilensin mi?"
          confirmLabel="QR’ı yenile"
          tone="danger"
          loading={regen.isPending}
          onConfirm={() => tableId && regen.mutate({ tableId })}
        >
          <Notice tone="warning" icon={<TriangleAlert />} title="Eski afiş çalışmayı durdurur">
            Masadaki mevcut QR kodu geçersiz olur. Yenilemeden sonra yeni afişi yazdırıp masaya asman gerekir. Afiş çalındıysa veya kopyalandıysa kullan.
          </Notice>
        </ConfirmDialog>
      </DialogContent>
    </Dialog>
  );
}
