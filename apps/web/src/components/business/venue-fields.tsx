'use client';
import {
  CITIES,
  DEFAULT_OPENING_HOURS,
  formatTrPhone,
  normalizeTrPhone,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type OpeningHours,
  type VenueInfoInput,
} from '@bilardogo/domain';
import { Button, Field, Input, Select, Switch, Textarea, cn, toast } from '@bilardogo/ui';
import { Crosshair, MapPin } from 'lucide-react';
import { useState } from 'react';
import { mapEmbedUrl } from '@/lib/format';

export type VenueFormValue = {
  name: string;
  cityPlate: number | null;
  district: string;
  address: string;
  phone: string;
  description: string;
  lat: string;
  lng: string;
  openingHours: OpeningHours;
};

export type VenueFormErrors = Partial<Record<keyof VenueFormValue, string>>;

export const EMPTY_VENUE: VenueFormValue = {
  name: '',
  cityPlate: null,
  district: '',
  address: '',
  phone: '',
  description: '',
  lat: '',
  lng: '',
  openingHours: DEFAULT_OPENING_HOURS,
};

export function venueToForm(v: {
  name: string;
  cityPlate: number;
  district: string | null;
  address: string;
  phone: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  openingHours: OpeningHours;
}): VenueFormValue {
  return {
    name: v.name,
    cityPlate: v.cityPlate,
    district: v.district ?? '',
    address: v.address,
    phone: formatTrPhone(v.phone) || (v.phone ?? ''),
    description: v.description ?? '',
    lat: v.lat != null ? String(v.lat) : '',
    lng: v.lng != null ? String(v.lng) : '',
    openingHours: v.openingHours ?? DEFAULT_OPENING_HOURS,
  };
}

const SHORT_DAYS = { mon: 'Pzt', tue: 'Sal', wed: 'Çar', thu: 'Per', fri: 'Cum', sat: 'Cmt', sun: 'Paz' } as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseCoord(s: string): number | null | 'invalid' {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : 'invalid';
}

/** İstemci doğrulaması (Türkçe hata mesajları); geçerliyse API girdisini döner. */
export function validateVenue(v: VenueFormValue): { errors: VenueFormErrors; data: VenueInfoInput | null } {
  const e: VenueFormErrors = {};
  const name = v.name.trim();
  if (name.length < 2) e.name = 'Salon adı en az 2 karakter olmalı.';
  else if (name.length > 80) e.name = 'Salon adı en fazla 80 karakter olabilir.';
  if (!v.cityPlate) e.cityPlate = 'İl seçin.';
  if (v.district.trim().length > 60) e.district = 'İlçe en fazla 60 karakter olabilir.';
  const address = v.address.trim();
  if (address.length < 5) e.address = 'Açık adresi girin (en az 5 karakter).';
  else if (address.length > 300) e.address = 'Adres en fazla 300 karakter olabilir.';
  if (v.phone.trim() && !normalizeTrPhone(v.phone)) e.phone = 'Geçerli bir telefon numarası girin (ör. 0212 555 44 33).';
  if (v.description.trim().length > 1000) e.description = 'Açıklama en fazla 1000 karakter olabilir.';
  const lat = parseCoord(v.lat);
  const lng = parseCoord(v.lng);
  if (lat === 'invalid' || lng === 'invalid') e.lat = 'Enlem ve boylam sayı olmalı.';
  else if ((lat === null) !== (lng === null)) e.lat = 'Enlem ve boylamı birlikte girin ya da ikisini de boş bırakın.';
  else if (lat !== null && lng !== null && (lat < 35 || lat > 43 || lng < 25 || lng > 45.5)) e.lat = 'Konum Türkiye sınırları içinde olmalı.';
  for (const d of WEEKDAYS) {
    const h = v.openingHours[d];
    if (h && (!HHMM.test(h.open) || !HHMM.test(h.close))) {
      e.openingHours = `${WEEKDAY_LABELS[d]} için açılış ve kapanış saatini girin.`;
      break;
    }
  }
  if (Object.keys(e).length) return { errors: e, data: null };
  return {
    errors: e,
    data: {
      name,
      cityPlate: v.cityPlate!,
      district: v.district.trim() || null,
      address,
      lat: lat as number | null,
      lng: lng as number | null,
      phone: v.phone.trim() || null,
      description: v.description.trim() || null,
      openingHours: v.openingHours,
    },
  };
}

export function HoursEditor({ value, onChange, error }: { value: OpeningHours; onChange: (v: OpeningHours) => void; error?: string }) {
  return (
    <div>
      <div className="divide-y divide-border rounded-2xl border border-border bg-surface-2/50">
        {WEEKDAYS.map((d) => {
          const h = value[d];
          return (
            <div key={d} className="flex items-center gap-2 px-3 py-2.5">
              <Switch
                checked={!!h}
                onCheckedChange={(on) => onChange({ ...value, [d]: on ? (DEFAULT_OPENING_HOURS[d] ?? { open: '12:00', close: '00:00' }) : null })}
                aria-label={`${WEEKDAY_LABELS[d]} açık`}
              />
              <span className={cn('w-9 shrink-0 text-sm font-medium sm:w-24', !h && 'text-subtle')}>
                <span className="sm:hidden">{SHORT_DAYS[d]}</span>
                <span className="hidden sm:inline">{WEEKDAY_LABELS[d]}</span>
              </span>
              {h ? (
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                  <input
                    type="time"
                    value={h.open}
                    onChange={(e) => onChange({ ...value, [d]: { ...h, open: e.target.value } })}
                    className="h-9 min-w-0 flex-1 max-w-[7rem] rounded-lg border border-border bg-surface-2 px-2 text-sm tabular-nums focus:border-brand focus:outline-none"
                    aria-label={`${WEEKDAY_LABELS[d]} açılış`}
                  />
                  <span className="text-subtle">–</span>
                  <input
                    type="time"
                    value={h.close}
                    onChange={(e) => onChange({ ...value, [d]: { ...h, close: e.target.value } })}
                    className="h-9 min-w-0 flex-1 max-w-[7rem] rounded-lg border border-border bg-surface-2 px-2 text-sm tabular-nums focus:border-brand focus:outline-none"
                    aria-label={`${WEEKDAY_LABELS[d]} kapanış`}
                  />
                </div>
              ) : (
                <span className="flex-1 text-right text-sm text-subtle">Kapalı</span>
              )}
            </div>
          );
        })}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-subtle">Gece yarısını geçen saatler desteklenir (ör. 12:00 – 02:00). Açılış ve kapanış aynıysa 24 saat açık sayılır.</p>
      )}
    </div>
  );
}

function LocationField({ value, onChange, error }: { value: VenueFormValue; onChange: (patch: Partial<VenueFormValue>) => void; error?: string }) {
  const [locating, setLocating] = useState(false);
  const lat = parseCoord(value.lat);
  const lng = parseCoord(value.lng);
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const useMine = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Tarayıcın konum özelliğini desteklemiyor.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        toast.success('Konum alındı. Haritadan doğruluğunu kontrol et.');
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? 'Konum izni verilmedi.' : 'Konum alınamadı, tekrar dene.');
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };
  const showMap = hasCoords || value.address.trim().length >= 5;
  return (
    <Field label="Konum" error={error} hint="Oyuncuların yol tarifi alabilmesi için salonun konumunu ekle.">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input inputMode="decimal" placeholder="Enlem (ör. 40.9876)" value={value.lat} onChange={(e) => onChange({ lat: e.target.value })} aria-label="Enlem" />
          <Input inputMode="decimal" placeholder="Boylam (ör. 29.0271)" value={value.lng} onChange={(e) => onChange({ lng: e.target.value })} aria-label="Boylam" />
        </div>
        <Button variant="secondary" size="sm" onClick={useMine} loading={locating}>
          <Crosshair className="h-4 w-4" />
          Konumumu kullan
        </Button>
        {showMap ? (
          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe
              title="Harita önizleme"
              src={mapEmbedUrl({
                lat: hasCoords ? (lat as number) : null,
                lng: hasCoords ? (lng as number) : null,
                address: value.address,
                name: value.name,
              })}
              className="h-48 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="flex items-center gap-1.5 bg-surface-2 px-3 py-1.5 text-[11px] text-muted">
              <MapPin className="h-3 w-3" />
              {hasCoords ? 'Koordinata göre önizleme' : 'Adrese göre önizleme — kesin konum için koordinat ekle'}
            </div>
          </div>
        ) : null}
      </div>
    </Field>
  );
}

/** Salon bilgileri formu (başvuru 2. adım ve salon profili). */
export function VenueFields({
  value,
  onChange,
  errors = {},
}: {
  value: VenueFormValue;
  onChange: (v: VenueFormValue) => void;
  errors?: VenueFormErrors;
}) {
  const patch = (p: Partial<VenueFormValue>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-4">
      <Field label="Salon adı" required error={errors.name}>
        <Input value={value.name} onChange={(e) => patch({ name: e.target.value })} placeholder="ör. FBN Bilardo" maxLength={80} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="İl" required error={errors.cityPlate}>
          <Select value={value.cityPlate ?? ''} onChange={(e) => patch({ cityPlate: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Seçin</option>
            {CITIES.map((c) => (
              <option key={c.plate} value={c.plate}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="İlçe" error={errors.district}>
          <Input value={value.district} onChange={(e) => patch({ district: e.target.value })} placeholder="ör. Kadıköy" maxLength={60} />
        </Field>
      </div>
      <Field label="Açık adres" required error={errors.address}>
        <Textarea value={value.address} onChange={(e) => patch({ address: e.target.value })} rows={2} placeholder="Mahalle, cadde, no, kat" maxLength={300} />
      </Field>
      <Field label="Salon telefonu" error={errors.phone}>
        <Input type="tel" inputMode="tel" value={value.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="0212 555 44 33" maxLength={20} />
      </Field>
      <Field label="Açıklama" error={errors.description} hint={`${value.description.length}/1000`}>
        <Textarea
          value={value.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={3}
          placeholder="Masa sayısı, oyun türleri, ortam, otopark…"
          maxLength={1000}
        />
      </Field>
      <LocationField value={value} onChange={patch} error={errors.lat} />
      <Field label="Çalışma saatleri">
        <HoursEditor value={value.openingHours} onChange={(openingHours) => patch({ openingHours })} error={errors.openingHours} />
      </Field>
    </div>
  );
}
