'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { AD_PLACEMENTS } from '@bilardogo/domain';
import { Button, Dialog, DialogContent, DialogFooter, Field, Input, MultiToggle, Segmented, SwitchRow, Textarea, toast } from '@bilardogo/ui';
import { useState } from 'react';
import { fromLocalInputValue, toLocalInputValue } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { CityMultiSelect } from './common';
import { AD_PLACEMENT_LABELS } from './labels';
import { MediaField, type MediaValue } from './media-field';

export type Ad = RouterOutputs['admin']['ads'][number];
type Placement = (typeof AD_PLACEMENTS)[number];

function isUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function AdEditor({ ad, open, onClose }: { ad: Ad | null; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open ? (
        <DialogContent title={ad ? 'Reklamı düzenle' : 'Yeni reklam / sponsor'} description="Türkiye geneli veya il bazlı yayınlanır." className="sm:max-w-3xl">
          <AdForm key={ad?.id ?? 'new'} ad={ad} onClose={onClose} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function AdForm({ ad, onClose }: { ad: Ad | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const now = new Date();
  const [brand, setBrand] = useState(ad?.brand ?? '');
  const [logo, setLogo] = useState<MediaValue>({ path: ad?.logoPath ?? null, type: ad?.logoPath ? 'image' : null, url: ad?.logoUrl ?? null });
  const [media, setMedia] = useState<MediaValue>({ path: ad?.mediaPath ?? null, type: ad?.mediaType ?? null, url: ad?.mediaUrl ?? null });
  const [product, setProduct] = useState(ad?.product ?? '');
  const [priceText, setPriceText] = useState(ad?.priceText ?? '');
  const [body, setBody] = useState(ad?.body ?? '');
  const [link, setLink] = useState(ad?.link ?? '');
  const [contact, setContact] = useState(ad?.contact ?? '');
  const [scope, setScope] = useState<'country' | 'city'>(ad?.scope ?? 'country');
  const [cities, setCities] = useState<number[]>(ad?.cityPlates ?? []);
  const [placements, setPlacements] = useState<Placement[]>(ad?.placements ?? ['home', 'bulletin']);
  const [startsAt, setStartsAt] = useState(toLocalInputValue(ad ? new Date(ad.startsAt) : now));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(ad ? new Date(ad.endsAt) : new Date(now.getTime() + 30 * 86400_000)));
  const [isActive, setIsActive] = useState(ad?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const upload = trpc.admin.adMediaUpload.useMutation();
  const save = trpc.admin.saveAd.useMutation({
    onSuccess: async () => {
      toast.success('Reklam kaydedildi.');
      await utils.admin.ads.invalidate();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const errors = {
    brand: brand.trim().length < 2 ? 'Marka adı en az 2 karakter olmalı.' : null,
    link: link.trim() && !isUrl(link.trim()) ? 'Geçerli bir bağlantı girin (https://…).' : null,
    cities: scope === 'city' && cities.length === 0 ? 'İl bazlı reklam için en az bir il seçin.' : null,
    placements: placements.length === 0 ? 'En az bir yerleşim seçin.' : null,
    dates: !startsAt || !endsAt ? 'Başlangıç ve bitiş tarihini seçin.' : endsAt <= startsAt ? 'Bitiş tarihi başlangıçtan sonra olmalı.' : null,
  };
  const invalid = Object.values(errors).some(Boolean);

  function submit() {
    setTouched(true);
    if (invalid) return;
    save.mutate({
      id: ad?.id,
      brand: brand.trim(),
      logoPath: logo.path,
      product: product.trim() || null,
      priceText: priceText.trim() || null,
      body: body.trim() || null,
      mediaPath: media.path,
      mediaType: media.path ? media.type : null,
      link: link.trim() || null,
      contact: contact.trim() || null,
      scope,
      cityPlates: scope === 'city' ? cities : [],
      placements,
      startsAt: fromLocalInputValue(startsAt),
      endsAt: fromLocalInputValue(endsAt),
      isActive,
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Field label="Marka" required error={touched ? errors.brand : null}>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={80} placeholder="Ör. Predator Cues" />
          </Field>
          <Field label="Logo">
            <MediaField compact allowVideo={false} label="Logo yükle" value={logo} onChange={setLogo} request={(info) => upload.mutateAsync(info)} />
          </Field>
        </div>
        <Field label="Reklam görseli / videosu">
          <MediaField value={media} onChange={setMedia} request={(info) => upload.mutateAsync(info)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ürün / hizmet">
            <Input value={product} onChange={(e) => setProduct(e.target.value)} maxLength={120} placeholder="Ör. Karbon istaka" />
          </Field>
          <Field label="Fiyat / kampanya bilgisi">
            <Input value={priceText} onChange={(e) => setPriceText(e.target.value)} maxLength={120} placeholder="Ör. BilardoGo kullanıcılarına %15 indirim" />
          </Field>
        </div>
        <Field label="Metin" hint={`${body.length} / 1000`}>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Bağlantı" error={touched ? errors.link : null}>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="İletişim bilgisi">
            <Input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={160} placeholder="Telefon, e-posta veya adres" />
          </Field>
        </div>
        <Field label="Kapsam" required error={touched ? errors.cities : null}>
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { value: 'country', label: 'Türkiye geneli' },
              { value: 'city', label: 'İl bazlı' },
            ]}
          />
          {scope === 'city' ? (
            <div className="mt-2">
              <CityMultiSelect value={cities} onChange={setCities} emptyLabel="İl seçin" />
            </div>
          ) : null}
        </Field>
        <Field label="Yerleşimler" required error={touched ? errors.placements : null} hint="Reklamın uygulamada görüneceği alanlar.">
          <MultiToggle value={placements} onChange={setPlacements} options={AD_PLACEMENTS.map((p) => ({ value: p, label: AD_PLACEMENT_LABELS[p] }))} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Yayın başlangıcı" required error={touched ? errors.dates : null}>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Yayın bitişi" required>
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 px-4">
          <SwitchRow label="Aktif" description="Kapalıysa tarih aralığında olsa bile gösterilmez." checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button loading={save.isPending} disabled={upload.isPending} onClick={submit}>
          Kaydet
        </Button>
      </DialogFooter>
    </>
  );
}
