const BACK_VOWELS = 'aıou';
const FRONT_VOWELS = 'eiöü';
const VOWELS = BACK_VOWELS + FRONT_VOWELS;
const VOICELESS = 'fstkçşhp';
/** Harf okunuşları (kısaltmalar için: "FBN" → "fe be ne" → 'de'). */
const LETTER_NAMES: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', ç: 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', ğ: 'yumuşak ge', h: 'he', ı: 'ı', i: 'i',
  j: 'je', k: 'ka', l: 'le', m: 'me', n: 'ne', o: 'o', ö: 'ö', p: 'pe', r: 're', s: 'se', ş: 'şe', t: 'te', u: 'u',
  ü: 'ü', v: 've', y: 'ye', z: 'ze', q: 'kü', w: 've', x: 'iks',
};
const DIGIT_NAMES = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS_NAMES = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

/** Sayının okunuşundaki son sözcük: 20 → "yirmi", 45 → "beş", 100 → "yüz", 1000 → "bin". */
function spokenNumber(digits: string): string {
  const n = Number(digits);
  if (n === 0) return 'sıfır';
  if (n % 1000 === 0) return 'bin';
  if (n % 100 === 0) return 'yüz';
  const ones = n % 10;
  if (ones !== 0) return DIGIT_NAMES[ones]!;
  return TENS_NAMES[Math.floor((n % 100) / 10)]!;
}

export function trLower(s: string): string {
  return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}
export function trUpper(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

/** Sözcüğün okunuşa göre son hecesini döndürür (kısaltma ve rakamları çözer). */
function spokenTail(word: string): string {
  const trimmed = word.trim();
  const time = trimmed.match(/(\d{1,2})[:.](\d{2})$/);
  if (time) return spokenNumber(time[2] === '00' ? time[1]! : time[2]!);
  const trailingNumber = trimmed.match(/(\d+)$/);
  if (trailingNumber) return spokenNumber(trailingNumber[1]!);
  const last = trimmed.split(/\s+/).pop() ?? '';
  const clean = last.replace(/[^\p{L}\p{N}]/gu, '');
  if (!clean) return '';
  const lastChar = clean[clean.length - 1]!;
  if (/\d/.test(lastChar)) return DIGIT_NAMES[Number(lastChar)]!;
  const isAcronym = clean.length > 1 && clean === trUpper(clean) && !/[aeıioöuü]/.test(trLower(clean).slice(-2));
  if (isAcronym) return LETTER_NAMES[trLower(lastChar)] ?? trLower(clean);
  return trLower(clean);
}

function lastVowel(s: string): string | null {
  for (let i = s.length - 1; i >= 0; i--) if (VOWELS.includes(s[i]!)) return s[i]!;
  return null;
}

/** Bulunma eki: "FBN'de", "Masters Bilardo'da", "Kulüp'te". */
export function locative(name: string): string {
  const tail = spokenTail(name);
  const v = lastVowel(tail) ?? 'e';
  const vowel = BACK_VOWELS.includes(v) ? 'a' : 'e';
  const endsVoiceless = VOICELESS.includes(tail[tail.length - 1] ?? '');
  return `${name.trim()}'${endsVoiceless ? 't' : 'd'}${vowel}`;
}

/** Ayrılma eki: "20:00'den", "19:30'dan", "Kulüp'ten". */
export function ablative(name: string): string {
  const tail = spokenTail(name);
  const v = lastVowel(tail) ?? 'e';
  const vowel = BACK_VOWELS.includes(v) ? 'a' : 'e';
  const endsVoiceless = VOICELESS.includes(tail[tail.length - 1] ?? '');
  return `${name.trim()}'${endsVoiceless ? 't' : 'd'}${vowel}n`;
}

/** İlgi eki: "Berkay'ın", "FBN'nin", "Kulüp'ün". */
export function genitive(name: string): string {
  const tail = spokenTail(name);
  const v = lastVowel(tail) ?? 'e';
  const map: Record<string, string> = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' };
  const harmonized = map[v] ?? 'i';
  const endsVowel = VOWELS.includes(tail[tail.length - 1] ?? '');
  return `${name.trim()}'${endsVowel ? 'n' : ''}${harmonized}n`;
}

/** Arama ve slug için Türkçe karakterleri sadeleştirir. */
export function slugify(input: string): string {
  return trLower(input)
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.length >= 2 ? [parts[0]![0], parts[parts.length - 1]![0]] : [parts[0]?.[0], parts[0]?.[1]];
  return trUpper(chars.filter(Boolean).join('')) || '?';
}
