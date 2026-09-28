'use client';
import { Dialog, DialogContent } from '@bilardogo/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

/** Salon fotoğraf şeridi + tam ekran görüntüleyici. */
export function VenueGallery({ images, name }: { images: { id: string; url: string }[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  if (images.length === 0) return null;
  const current = index !== null ? images[index] : null;
  const go = (d: number) => setIndex((i) => (i === null ? null : (i + d + images.length) % images.length));
  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setIndex(i)}
            className="relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-2"
            aria-label={`Fotoğraf ${i + 1}`}
          >
            <img src={img.url} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" loading="lazy" />
          </button>
        ))}
      </div>
      <Dialog open={index !== null} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent title={name} description={index !== null ? `${index + 1} / ${images.length}` : undefined} className="sm:max-w-3xl">
          {current ? (
            <div
              className="relative -mx-5 -my-4 flex items-center justify-center bg-black"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') go(1);
                if (e.key === 'ArrowLeft') go(-1);
              }}
            >
              <img src={current.url} alt={`${name} fotoğrafı`} className="max-h-[70dvh] w-full object-contain" />
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Önceki"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Sonraki"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
