/** T.C. Kimlik No doğrulaması (11 hane, resmi sağlama algoritması). */
export function isValidTckn(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = value.split('').map(Number);
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const even = d[1]! + d[3]! + d[5]! + d[7]!;
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (d10 !== d[9]) return false;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === d[10];
}

/** Vergi Kimlik No doğrulaması (10 hane, GİB sağlama algoritması). */
export function isValidVkn(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const d = value.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (d[i]! + 10 - (i + 1)) % 10;
    if (tmp === 9) {
      sum += 9;
    } else {
      sum += (tmp * 2 ** (10 - (i + 1))) % 9;
    }
  }
  const check = (10 - (sum % 10)) % 10;
  return check === d[9];
}

export function isValidTaxId(value: string): boolean {
  const v = value.replace(/\s/g, '');
  return v.length === 11 ? isValidTckn(v) : isValidVkn(v);
}

export function maskTaxId(value: string): string {
  if (value.length < 4) return '****';
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

/** +90 5XX XXX XX XX biçimine normalize eder; geçersizse null. */
export function normalizeTrPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('90')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `+90${digits}`;
}

export function formatTrPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const d = e164.replace(/\D/g, '').replace(/^90/, '');
  if (d.length !== 10) return e164;
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}
