import { describe, expect, it } from 'vitest';
import {
  ablative,
  canTransition,
  computeAverage,
  computePresenceExpiry,
  defaultFormat,
  deriveMatchState,
  formatAverage,
  genitive,
  generateJoinCode,
  generateQrToken,
  isOpenAt,
  isValidTckn,
  isValidVkn,
  locative,
  nextStatus,
  normalizeJoinCode,
  normalizePlayIntent,
  normalizeTrPhone,
  renderTemplate,
  slugify,
  validateResult,
  type MatchFormat,
  type OpeningHours,
} from '../src';

describe('ortalama', () => {
  it('3 ondalık, 4. haneye göre yuvarlar', () => {
    expect(computeAverage(30, 40)).toBe(0.75);
    expect(computeAverage(25, 36)).toBe(0.694); // 0.69444
    expect(computeAverage(1, 8)).toBe(0.125);
    expect(computeAverage(2, 3)).toBe(0.667); // 0.66666
    expect(computeAverage(10, 1600)).toBe(0.006); // 0.00625 → 0.006 (4. hane 2)
    expect(computeAverage(1, 1600)).toBe(0.001); // 0.000625 → 0.001 (4. hane 6)
    expect(computeAverage(1, 2000)).toBe(0.001); // 0.0005 → yarım yukarı
    expect(computeAverage(5, 0)).toBeNull();
  });
  it('Türkçe biçimler', () => {
    expect(formatAverage(0.75)).toBe('0,750');
    expect(formatAverage(null)).toBe('—');
  });
});

describe('sonuç doğrulama — 3 Bant / Karambol', () => {
  const f: MatchFormat = { category: 'points', targetPoints: 30, inningLimit: 40, handicap: null };
  const base = {
    category: 'points' as const,
    inningsMode: 'shared' as const,
    innings: 35,
    p1Innings: null,
    p2Innings: null,
    p1HighRun: 5,
    p2HighRun: null,
  };
  it('kazananı ve istekaları normalize eder; hatırlamıyorum = null', () => {
    const r = validateResult('three_cushion', f, { ...base, winner: 'p1', p1Score: 30, p2Score: 22 });
    expect(r).toMatchObject({ winnerSlot: 1, p1Innings: 35, p2Innings: 35, p1HighRun: 5, p2HighRun: null });
  });
  it('beraberlik yalnız sayılar eşitse', () => {
    expect(validateResult('carom', f, { ...base, winner: 'draw', p1Score: 20, p2Score: 20 }).winnerSlot).toBeNull();
    expect(() => validateResult('carom', f, { ...base, winner: 'draw', p1Score: 21, p2Score: 20 })).toThrow(/Kazanan/);
  });
  it('yanlış kazananı reddeder', () => {
    expect(() => validateResult('three_cushion', f, { ...base, winner: 'p2', p1Score: 30, p2Score: 22 })).toThrow();
  });
  it('ayrı isteka alanlarında fark en fazla 1', () => {
    const sep = { ...base, inningsMode: 'separate' as const, innings: null };
    expect(validateResult('three_cushion', f, { ...sep, winner: 'p1', p1Score: 30, p2Score: 29, p1Innings: 30, p2Innings: 29 }).p2Innings).toBe(29);
    expect(() =>
      validateResult('three_cushion', f, { ...sep, winner: 'p1', p1Score: 30, p2Score: 29, p1Innings: 30, p2Innings: 28 }),
    ).toThrow(/en fazla 1/);
  });
  it('seri sayıdan büyük olamaz, isteka sınırı aşılamaz', () => {
    expect(() => validateResult('three_cushion', f, { ...base, winner: 'p1', p1Score: 10, p2Score: 5, p1HighRun: 11 })).toThrow();
    expect(() => validateResult('three_cushion', f, { ...base, innings: 41, winner: 'p1', p1Score: 10, p2Score: 5 })).toThrow(/sınır/);
  });
  it('handikap başlangıç sayısı olarak hesaba katılır', () => {
    const h: MatchFormat = { ...f, handicap: { p1: 0, p2: 5 } };
    expect(validateResult('three_cushion', h, { ...base, winner: 'p2', p1Score: 28, p2Score: 25 }).winnerSlot).toBe(2);
    expect(validateResult('three_cushion', h, { ...base, winner: 'draw', p1Score: 30, p2Score: 25 }).winnerSlot).toBeNull();
  });
  it('form ile oyun türü uyuşmalı', () => {
    expect(() =>
      validateResult('snooker', defaultFormat('snooker'), { ...base, winner: 'p1', p1Score: 3, p2Score: 1 }),
    ).toThrow();
  });
});

describe('sonuç doğrulama — rack / frame', () => {
  const f: MatchFormat = { category: 'racks', target: 7, handicap: null };
  it('kazanan hedefe eşit, rakip hedeften düşük', () => {
    expect(validateResult('nine_ball', f, { category: 'racks', winner: 'p2', target: 7, p1Count: 5, p2Count: 7 }).winnerSlot).toBe(2);
    expect(() => validateResult('nine_ball', f, { category: 'racks', winner: 'p2', target: 7, p1Count: 5, p2Count: 6 })).toThrow(/eşit/);
    expect(() => validateResult('eight_ball', f, { category: 'racks', winner: 'p1', target: 7, p1Count: 7, p2Count: 7 })).toThrow(/düşük/);
  });
  it('handikapta her oyuncunun kendi hedefi geçerli', () => {
    const h: MatchFormat = { category: 'racks', target: 8, handicap: { p1Target: 5, p2Target: 3 } };
    expect(validateResult('eight_ball', h, { category: 'racks', winner: 'p2', target: 8, p1Count: 4, p2Count: 3 }).winnerSlot).toBe(2);
    expect(() => validateResult('eight_ball', h, { category: 'racks', winner: 'p1', target: 8, p1Count: 5, p2Count: 3 })).toThrow();
  });
  it('snooker en yüksek break, hatırlamıyorum null', () => {
    const s: MatchFormat = { category: 'frames', target: 5, handicap: null };
    const r = validateResult('snooker', s, { category: 'frames', winner: 'p1', target: 5, p1Count: 5, p2Count: 2, p1HighBreak: 87, p2HighBreak: null });
    expect(r).toMatchObject({ p1HighRun: 87, p2HighRun: null });
  });
});

describe('maç durum makinesi', () => {
  it('kabul edilen maç doğrudan Maçta olmaz', () => {
    expect(nextStatus('requested', 'accept', 'opponent')).toBe('accepted');
    expect(canTransition('requested', 'start', 'challenger')).toBe(false);
    expect(nextStatus('accepted', 'start', 'challenger')).toBe('in_progress');
  });
  it('yalnız rakip kabul eder', () => {
    expect(canTransition('requested', 'accept', 'challenger')).toBe(false);
  });
  it('sonuç akışı: gir → onayla / reddet → düzelt', () => {
    expect(nextStatus('in_progress', 'finish', 'venue_staff')).toBe('awaiting_result');
    expect(nextStatus('awaiting_result', 'submit_result', 'opponent')).toBe('pending_confirmation');
    expect(nextStatus('pending_confirmation', 'reject_result', 'challenger')).toBe('awaiting_result');
    expect(nextStatus('pending_confirmation', 'confirm_result', 'challenger')).toBe('completed');
    expect(() => nextStatus('completed', 'confirm_result', 'challenger')).toThrow();
  });
  it('türetilmiş maç durumu', () => {
    expect(deriveMatchState('wants', 'in_progress')).toBe('in_match');
    expect(deriveMatchState('not', 'accepted')).toBe('will_play');
    expect(deriveMatchState('wants', null)).toBe('wants');
  });
});

describe('durum (presence)', () => {
  const now = new Date('2026-10-01T15:00:00Z');
  it('Salondayım 4 saat sonra kapanır', () => {
    expect(computePresenceExpiry('at_venue', now, null)?.toISOString()).toBe('2026-10-01T19:00:00.000Z');
  });
  it('Geleceğim, seçilen saat + 1 saat', () => {
    expect(computePresenceExpiry('coming', now, new Date('2026-10-01T17:00:00Z'))?.toISOString()).toBe('2026-10-01T18:00:00.000Z');
    expect(() => computePresenceExpiry('coming', now, null)).toThrow();
    expect(() => computePresenceExpiry('coming', now, new Date('2026-10-01T10:00:00Z'))).toThrow();
  });
  it('maç niyeti yalnız salondayken', () => {
    expect(normalizePlayIntent('coming', 'wants')).toBeNull();
    expect(normalizePlayIntent('at_venue', null)).toBe('not');
  });
});

describe('çalışma saatleri', () => {
  const hours: OpeningHours = {
    mon: { open: '12:00', close: '02:00' },
    tue: null,
    wed: { open: '10:00', close: '22:00' },
    thu: { open: '00:00', close: '00:00' },
    fri: null,
    sat: null,
    sun: null,
  };
  // İstanbul UTC+3
  it('gece yarısını geçen saatler', () => {
    expect(isOpenAt(hours, new Date('2026-09-28T20:00:00Z'))).toBe(true); // Pzt 23:00
    expect(isOpenAt(hours, new Date('2026-09-28T22:30:00Z'))).toBe(true); // Salı 01:30 (Pzt'den taşan)
    expect(isOpenAt(hours, new Date('2026-09-29T00:30:00Z'))).toBe(false); // Salı 03:30
    expect(isOpenAt(hours, new Date('2026-09-29T12:00:00Z'))).toBe(false); // Salı kapalı
    expect(isOpenAt(hours, new Date('2026-09-30T19:30:00Z'))).toBe(false); // Çar 22:30
    expect(isOpenAt(hours, new Date('2026-10-01T03:00:00Z'))).toBe(true); // Per 24 saat
  });
});

describe('Türkçe ekler ve şablon', () => {
  it('bulunma eki', () => {
    expect(locative('Masters Bilardo')).toBe("Masters Bilardo'da");
    expect(locative('FBN')).toBe("FBN'de");
    expect(locative('Kulüp')).toBe("Kulüp'te");
    expect(locative('Salon 3')).toBe("Salon 3'te");
    expect(locative('Salon 6')).toBe("Salon 6'da");
  });
  it('ayrılma eki saatlerde okunuşa göre', () => {
    expect(ablative('20:00')).toBe("20:00'den");
    expect(ablative('19:30')).toBe("19:30'dan");
    expect(ablative('18:00')).toBe("18:00'den");
    expect(ablative('16:00')).toBe("16:00'dan");
  });
  it('ilgi eki', () => {
    expect(genitive('Berkay')).toBe("Berkay'ın");
    expect(genitive('Mehmet')).toBe("Mehmet'in");
    expect(genitive('Ayşe')).toBe("Ayşe'nin");
  });
  it('şablon işleme', () => {
    expect(renderTemplate('✅ {{kullanici}} {{salon|de}}!', { kullanici: 'Berkay', salon: 'FBN' })).toBe("✅ Berkay FBN'de!");
    expect(renderTemplate("🏆 {{kazanan}}, {{salon|de}}ki mücadeleyi kazandı!", { kazanan: 'Ali', salon: 'Masters Bilardo' })).toBe(
      "🏆 Ali, Masters Bilardo'daki mücadeleyi kazandı!",
    );
    expect(renderTemplate('{{eksik}} x', {})).toBe(' x');
  });
  it('slug', () => {
    expect(slugify('Çağlayan Şişli Bilardo Kulübü')).toBe('caglayan-sisli-bilardo-kulubu');
    expect(slugify('İZMİR')).toBe('izmir');
  });
});

describe('kimlik ve kodlar', () => {
  it('TCKN', () => {
    expect(isValidTckn('10000000146')).toBe(true);
    expect(isValidTckn('10000000147')).toBe(false);
    expect(isValidTckn('00000000146')).toBe(false);
  });
  it('VKN', () => {
    // algoritmaya göre geçerli bir örnek üret
    const base = '123456789';
    const valid = [...'0123456789'].map((d) => base + d).filter(isValidVkn);
    expect(valid).toHaveLength(1);
    expect(isValidVkn('12345')).toBe(false);
  });
  it('telefon', () => {
    expect(normalizeTrPhone('0532 123 45 67')).toBe('+905321234567');
    expect(normalizeTrPhone('+90 (532) 123-4567')).toBe('+905321234567');
    expect(normalizeTrPhone('123')).toBeNull();
  });
  it('katılım kodu ve QR token', () => {
    expect(generateJoinCode()).toMatch(/^BGO-[A-Z2-9]{4}$/);
    expect(normalizeJoinCode(' bgo 7k2p ')).toBe('BGO-7K2P');
    expect(generateQrToken()).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });
});
