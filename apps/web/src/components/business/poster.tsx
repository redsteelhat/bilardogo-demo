'use client';
import { cn } from '@bilardogo/ui';
import { ClipboardList, Link2, QrCode, Smartphone, Trophy, Wallet } from 'lucide-react';

export type PosterSize = 'a4' | 'a5';

const TABLE_STEPS = [
  { icon: QrCode, text: 'BilardoGo’da eşleşin veya masadaki QR kodunu okutun.' },
  { icon: Link2, text: 'Oyuncular maça ve masaya bağlanır.' },
  { icon: Trophy, text: 'Maçı başlatın. İyi oyunlar!' },
];

const ORDER_STEPS = [
  { icon: Smartphone, text: 'QR kodu telefonunuzla okutun.' },
  { icon: ClipboardList, text: 'Ürünleri seçin, konum ve notunuzu ekleyin.' },
  { icon: Wallet, text: 'Siparişiniz hazırlanır. Ödeme kasaya yapılır.' },
];

/** Bilardo topu süsü (poster köşeleri). */
function Ball({ color, className, dots, eight }: { color: string; className: string; dots?: boolean; eight?: boolean }) {
  return (
    <div
      className={cn('absolute rounded-full', className)}
      style={{
        background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,.75) 0 6%, transparent 22%), ${color}`,
        boxShadow: 'inset -1.2cqw -1.4cqw 2.4cqw rgba(0,0,0,.35), 0 1cqw 2cqw rgba(0,0,0,.25)',
      }}
    >
      {eight ? (
        <span className="absolute left-1/2 top-1/2 flex h-[45%] w-[45%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-bold text-black" style={{ fontSize: '3.2cqw' }}>
          8
        </span>
      ) : null}
      {dots ? (
        <>
          <span className="absolute left-[30%] top-[40%] h-[12%] w-[12%] rounded-full bg-red-600" />
          <span className="absolute left-[58%] top-[28%] h-[12%] w-[12%] rounded-full bg-red-600" />
          <span className="absolute left-[55%] top-[62%] h-[12%] w-[12%] rounded-full bg-red-600" />
        </>
      ) : null}
    </div>
  );
}

function Stripes({ className, flip }: { className: string; flip?: boolean }) {
  return (
    <div
      className={cn('pointer-events-none absolute', className)}
      style={{
        background: `repeating-linear-gradient(${flip ? '-35deg' : '145deg'}, #111 0 1.4cqw, transparent 1.4cqw 2.6cqw, #c9c9c9 2.6cqw 3cqw, transparent 3cqw 5cqw)`,
        opacity: 0.9,
        maskImage: `linear-gradient(${flip ? 'to top left' : 'to bottom right'}, #000 10%, transparent 60%)`,
        WebkitMaskImage: `linear-gradient(${flip ? 'to top left' : 'to bottom right'}, #000 10%, transparent 60%)`,
      }}
    />
  );
}

/**
 * Masaya asılacak QR afişi (PDF s.9 tasarımı): beyaz zemin, büyük salon adı, "Masa N • oyun türleri",
 * yuvarlatılmış kutuda QR, BilardoGo logosu ve 3 adım. Boyutlar kapsayıcı genişliğine (cqw) göre ölçeklenir.
 */
export function Poster({
  venueName,
  subtitle,
  svg,
  variant = 'table',
  className,
}: {
  venueName: string;
  subtitle: string;
  svg: string;
  variant?: 'table' | 'order';
  className?: string;
}) {
  const steps = variant === 'table' ? TABLE_STEPS : ORDER_STEPS;
  return (
    <div
      className={cn('bg-poster relative mx-auto w-full overflow-hidden bg-white text-[#111] shadow-2xl print:shadow-none', className)}
      style={{
        containerType: 'inline-size',
        aspectRatio: '210 / 297',
        fontFamily: 'var(--font-sans)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        backgroundImage: 'radial-gradient(circle at 50% 40%, #ffffff 0 45%, #efefef 100%)',
      }}
    >
      <Stripes className="left-0 top-0 h-[38%] w-[34%]" />
      <Stripes className="bottom-0 right-0 h-[40%] w-[40%]" flip />
      <Ball color="#111" eight className="left-[4%] top-[3%] h-[13cqw] w-[13cqw]" />
      <Ball color="#f5c518" dots className="right-[6%] top-[10%] h-[14cqw] w-[14cqw]" />
      <Ball color="#d11f1f" className="bottom-[3%] left-[3%] h-[13cqw] w-[13cqw]" />
      <Ball color="#f4f4f4" dots className="bottom-[2.5%] right-[5%] h-[12cqw] w-[12cqw]" />
      {/* nokta desenleri */}
      <div
        className="absolute left-[4%] top-[57%] h-[6cqw] w-[6cqw] opacity-50"
        style={{ backgroundImage: 'radial-gradient(#777 22%, transparent 24%)', backgroundSize: '1.5cqw 1.5cqw' }}
      />
      <div
        className="absolute right-[4%] top-[30%] h-[7cqw] w-[7cqw] opacity-50"
        style={{ backgroundImage: 'radial-gradient(#777 22%, transparent 24%)', backgroundSize: '1.5cqw 1.5cqw' }}
      />

      <div className="relative flex h-full flex-col items-center px-[8%] pt-[10%] text-center">
        <h2 className="max-w-[70%] font-extrabold leading-[1.02] tracking-tight" style={{ fontFamily: 'var(--font-sans)', fontSize: venueName.length > 16 ? '7.5cqw' : '10cqw' }}>
          {venueName}
        </h2>
        <p className="mt-[1.5cqw] font-semibold" style={{ fontSize: '4.6cqw' }}>
          {subtitle}
        </p>

        <div className="mt-[5cqw] flex w-full items-center justify-center gap-[5cqw]">
          <div className="rounded-[4cqw] border-[0.5cqw] border-[#222] bg-white p-[2.4cqw] shadow-[0_1cqw_3cqw_rgba(0,0,0,.12)]" style={{ width: '50cqw' }}>
            <div className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
          <div className="flex flex-col items-center" style={{ width: '22cqw' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="" className="rounded-full" style={{ width: '18cqw', height: '18cqw' }} />
            <div className="mt-[1.2cqw] font-extrabold italic tracking-tight" style={{ fontSize: '5.2cqw' }}>
              Bilardo<span style={{ color: '#ee7b30' }}>Go</span>
            </div>
          </div>
        </div>

        <p className="mt-[4cqw] font-bold" style={{ fontSize: '3.8cqw' }}>
          {variant === 'table' ? 'BilardoGo iyi oyunlar diler' : 'Sipariş vermek için okutun'}
        </p>

        <div className="mt-[4.5cqw] flex w-full items-start justify-center">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center" style={{ height: '28cqw' }}>
              {i > 0 ? (
                <span className="px-[1cqw] font-bold tracking-[0.3cqw] text-[#333]" style={{ fontSize: '3cqw' }}>
                  ····
                </span>
              ) : null}
              <div
                className="relative flex flex-col items-center rounded-[2.4cqw] border-[0.35cqw] border-[#333] bg-white px-[1.4cqw] pb-[1.6cqw] pt-[4.2cqw] shadow-[0_0.6cqw_1.6cqw_rgba(0,0,0,.12)]"
                style={{ width: '22cqw', height: '28cqw' }}
              >
                <span
                  className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#111] font-bold text-white"
                  style={{ width: '5.4cqw', height: '5.4cqw', fontSize: '3cqw' }}
                >
                  {i + 1}
                </span>
                <s.icon className="shrink-0" style={{ width: '7cqw', height: '7cqw' }} strokeWidth={1.6} />
                <p className="mt-[1.4cqw] font-semibold leading-snug" style={{ fontSize: '2.2cqw' }}>
                  {s.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
