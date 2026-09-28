'use client';
import { QR_TOKEN_REGEX } from '@bilardogo/domain';
import { Spinner } from '@bilardogo/ui';
import { Flashlight, FlashlightOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** Okunan metinden masa QR anahtarını çıkarır: "<origin>/q/<token>" veya çıplak anahtar. */
export function extractTableToken(text: string): string | null {
  const raw = text.trim();
  const m = raw.match(/\/q\/([A-Za-z0-9_-]{16,64})(?:[/?#]|$)/);
  if (m?.[1]) return m[1];
  return QR_TOKEN_REGEX.test(raw) ? raw : null;
}

export type CameraState = 'starting' | 'scanning' | 'denied' | 'no_camera' | 'error';

/** Arka kamerayla QR okuyucu (qr-scanner, dinamik yükleme). Geçerli bir masa kodu bulunca onToken çağrılır. */
export function QrCamera({
  onToken,
  onInvalid,
  onStateChange,
}: {
  onToken: (token: string) => void;
  onInvalid?: () => void;
  onStateChange?: (s: CameraState) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<import('qr-scanner').default | null>(null);
  const [state, setState] = useState<CameraState>('starting');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const handlers = useRef({ onToken, onInvalid, onStateChange });
  handlers.current = { onToken, onInvalid, onStateChange };
  const lastInvalid = useRef(0);

  useEffect(() => {
    handlers.current.onStateChange?.(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    let done = false;
    (async () => {
      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled || !videoRef.current) return;
        if (!(await QrScanner.hasCamera())) {
          setState('no_camera');
          return;
        }
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            if (done) return;
            const token = extractTableToken(result.data);
            if (token) {
              done = true;
              if (navigator.vibrate) navigator.vibrate(60);
              scanner.stop();
              handlers.current.onToken(token);
            } else if (Date.now() - lastInvalid.current > 3000) {
              lastInvalid.current = Date.now();
              handlers.current.onInvalid?.();
            }
          },
          { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true, maxScansPerSecond: 8 },
        );
        scannerRef.current = scanner;
        await scanner.start();
        if (cancelled) {
          scanner.destroy();
          return;
        }
        setState('scanning');
        setHasFlash(await scanner.hasFlash().catch(() => false));
      } catch (e) {
        if (cancelled) return;
        const msg = String((e as Error)?.name ?? e) + String((e as Error)?.message ?? '');
        setState(/NotAllowed|Permission|denied/i.test(msg) ? 'denied' : /NotFound|no camera|Requested device/i.test(msg) ? 'no_camera' : 'error');
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {state === 'starting' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
          <Spinner className="h-7 w-7" />
          Kamera açılıyor…
        </div>
      ) : null}
      {hasFlash ? (
        <button
          type="button"
          onClick={async () => {
            await scannerRef.current?.toggleFlash();
            setFlashOn(!!scannerRef.current?.isFlashOn());
          }}
          className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"
          aria-label={flashOn ? 'Feneri kapat' : 'Feneri aç'}
        >
          {flashOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
        </button>
      ) : null}
    </div>
  );
}
