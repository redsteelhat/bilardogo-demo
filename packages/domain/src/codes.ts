const JOIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

/** Sipariş oturumu katılım kodu: BGO-7K2P */
export function generateJoinCode(): string {
  const bytes = randomBytes(4);
  let out = '';
  for (const b of bytes) out += JOIN_ALPHABET[b % JOIN_ALPHABET.length];
  return `BGO-${out}`;
}

export function normalizeJoinCode(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = clean.startsWith('BGO') ? clean.slice(3) : clean;
  return `BGO-${body}`;
}

/** Masa QR token'ı: 128 bit rastgele, URL güvenli. QR yalnız salon + masayı tanımlar. */
export function generateQrToken(): string {
  const bytes = randomBytes(16);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const QR_TOKEN_REGEX = /^[A-Za-z0-9_-]{16,64}$/;
