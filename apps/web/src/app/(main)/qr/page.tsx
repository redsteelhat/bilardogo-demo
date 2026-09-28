'use client';
import { GAME_SHORT_LABELS } from '@bilardogo/domain';
import { Button, Dialog, DialogContent, DialogFooter, Field, Input, toast } from '@bilardogo/ui';
import { CameraOff, Keyboard, QrCode, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { PageLoading } from '@/components/common/states';
import { extractTableToken, QrCamera, type CameraState } from '@/components/qr/qr-camera';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

export default function QrPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <QrScannerScreen />
    </Suspense>
  );
}

function QrScannerScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get('mac');
  const { session } = useSession();
  const match = trpc.matches.get.useQuery({ matchId: matchId ?? '' }, { enabled: !!matchId && !!session });
  const [camera, setCamera] = useState<CameraState>('starting');
  const [manualOpen, setManualOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const go = (token: string) => {
    router.push(`/q/${token}${matchId ? `?mac=${matchId}` : ''}`);
  };
  const failed = camera === 'denied' || camera === 'no_camera' || camera === 'error';
  const opp = match.data?.players.find((p) => p.slot !== match.data?.mySlot)?.user;

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-black text-white">
      <div className="relative flex-1">
        {!failed ? (
          <QrCamera onToken={go} onStateChange={setCamera} onInvalid={() => toast.error('Bu bir BilardoGo masa QR kodu değil.')} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <CameraOff className="h-7 w-7" />
            </span>
            <div className="font-display text-xl font-semibold">
              {camera === 'denied' ? 'Kamera izni verilmedi' : camera === 'no_camera' ? 'Kamera bulunamadı' : 'Kamera açılamadı'}
            </div>
            <p className="max-w-xs text-sm text-white/70">
              {camera === 'denied'
                ? 'Tarayıcı ayarlarından bu site için kamera iznini açabilir ya da masadaki kodu elle girebilirsin.'
                : 'Masadaki QR kodunu telefonunun kamera uygulamasıyla da okutabilir ya da kodu elle girebilirsin.'}
            </p>
            <Button onClick={() => setManualOpen(true)}>
              <Keyboard className="h-4 w-4" /> Kodu elle gir
            </Button>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="font-display text-lg font-semibold">QR Okut</div>
            <span className="w-10" />
          </div>
        </div>
      </div>

      <div className="rounded-t-3xl border-t border-white/10 bg-bg px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-fg">
        {match.data && match.data.status === 'accepted' ? (
          <div className="mb-3 rounded-2xl border border-brand/40 bg-brand-soft px-3 py-2 text-sm">
            <span className="font-semibold text-brand">Maçını başlat:</span> {GAME_SHORT_LABELS[match.data.gameType]}
            {opp ? ` · ${opp.displayName}` : ''}
            {match.data.venue ? ` · ${match.data.venue.name}` : ''}
          </div>
        ) : null}
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-fg">
            <QrCode className="h-5 w-5" />
          </span>
          <div>
            <div className="font-display text-lg font-semibold">Masadaki BilardoGo QR kodunu okut</div>
            <p className="text-sm text-muted">
              QR yalnız salonu ve masayı tanımlar. Eşleştiğin maçı başlatabilir ya da masada yeni bir oturum açıp rakibinle hemen oynayabilirsin.
            </p>
          </div>
        </div>
        <Button variant="secondary" block className="mt-4" onClick={() => setManualOpen(true)}>
          <Keyboard className="h-4 w-4" /> Kodu elle gir
        </Button>
      </div>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent title="Kodu elle gir" description="QR’ın altındaki bağlantıyı ya da masa kodunu yaz.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = extractTableToken(code);
              if (!t) return setCodeError('Geçerli bir masa kodu değil.');
              setManualOpen(false);
              go(t);
            }}
          >
            <Field label="Masa kodu" error={codeError}>
              <Input
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError(null);
                }}
                placeholder="ör. bilardogo.com/q/…"
              />
            </Field>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setManualOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={!code.trim()}>
                Devam
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
