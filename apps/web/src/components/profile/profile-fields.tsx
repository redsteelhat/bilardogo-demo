'use client';
import { CITIES, GAME_LABELS, GAME_TYPES, LEVEL_LABELS, LEVELS, type GameType, type Level } from '@bilardogo/domain';
import { Field, Input, MultiToggle, Segmented, Select, Textarea } from '@bilardogo/ui';
import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';

export type ProfileFormValue = {
  fullName: string;
  username: string;
  cityPlate: number;
  level: Level;
  gameTypes: GameType[];
  bio: string;
};

/** Profil alanları (profil tamamlama ve profil düzenleme ortak). */
export function ProfileFields({
  value,
  onChange,
  initialUsername,
}: {
  value: ProfileFormValue;
  onChange: (v: ProfileFormValue) => void;
  initialUsername?: string | null;
}) {
  const [debounced, setDebounced] = useState(value.username);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.username.trim().toLowerCase()), 400);
    return () => clearTimeout(t);
  }, [value.username]);
  const validFormat = /^[a-z0-9_.]{3,20}$/.test(debounced);
  const check = trpc.me.checkUsername.useQuery(
    { username: debounced },
    { enabled: validFormat && debounced !== initialUsername, staleTime: 30_000 },
  );
  const usernameHint =
    !value.username
      ? '3–20 karakter; küçük harf, rakam, nokta, alt çizgi'
      : !validFormat
        ? 'Yalnız küçük harf, rakam, nokta ve alt çizgi (3–20)'
        : debounced === initialUsername
          ? 'Mevcut kullanıcı adın'
          : check.isFetching
            ? 'Kontrol ediliyor…'
            : check.data?.available
              ? 'Kullanılabilir'
              : check.data
                ? 'Bu kullanıcı adı alınmış'
                : '';
  const usernameIcon =
    validFormat && debounced !== initialUsername ? (
      check.isFetching ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted" />
      ) : check.data?.available ? (
        <Check className="h-4 w-4 text-success" />
      ) : check.data ? (
        <X className="h-4 w-4 text-danger" />
      ) : null
    ) : null;

  return (
    <div className="space-y-4">
      <Field label="Ad soyad" required>
        <Input value={value.fullName} onChange={(e) => onChange({ ...value, fullName: e.target.value })} maxLength={60} autoComplete="name" />
      </Field>
      <Field label="Kullanıcı adı" required hint={usernameHint}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle">@</span>
          <Input
            className="pl-8 pr-9"
            value={value.username}
            onChange={(e) => onChange({ ...value, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{usernameIcon}</span>
        </div>
      </Field>
      <Field label="Şehir" required>
        <Select value={value.cityPlate} onChange={(e) => onChange({ ...value, cityPlate: Number(e.target.value) })}>
          {[...CITIES]
            .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
            .map((c) => (
              <option key={c.plate} value={c.plate}>
                {c.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Seviye" required>
        <Segmented
          wrap
          value={value.level}
          onChange={(level) => onChange({ ...value, level })}
          options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
        />
      </Field>
      <Field label="Oynadığın türler" required hint="En az birini seç">
        <MultiToggle
          value={value.gameTypes}
          onChange={(gameTypes) => onChange({ ...value, gameTypes })}
          options={GAME_TYPES.map((g) => ({ value: g, label: GAME_LABELS[g] }))}
        />
      </Field>
      <Field label="Hakkımda" hint="Opsiyonel, en fazla 280 karakter">
        <Textarea value={value.bio} onChange={(e) => onChange({ ...value, bio: e.target.value })} maxLength={280} />
      </Field>
    </div>
  );
}

export function isProfileValid(v: ProfileFormValue) {
  return v.fullName.trim().length >= 2 && /^[a-z0-9_.]{3,20}$/.test(v.username) && v.gameTypes.length > 0;
}
