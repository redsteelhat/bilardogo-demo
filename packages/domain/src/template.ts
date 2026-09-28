import { ablative, genitive, locative } from './turkish';

/**
 * Bildirim şablonları admin panelinden düzenlenir; metinler kodda sabit değildir.
 * Söz dizimi: {{degisken}} veya Türkçe ek filtresiyle {{salon|de}} ("FBN'de"), {{oyuncu|in}} ("Berkay'ın").
 */
const FILTERS: Record<string, (v: string) => string> = {
  de: locative,
  da: locative,
  den: ablative,
  dan: ablative,
  in: genitive,
  nin: genitive,
  upper: (v) => v.toLocaleUpperCase('tr-TR'),
};

export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\s*([a-z]+)\s*)?\}\}/g, (_m, key: string, filter?: string) => {
    const raw = vars[key];
    if (raw === null || raw === undefined || raw === '') return '';
    const value = String(raw);
    const fn = filter ? FILTERS[filter] : undefined;
    return fn ? fn(value) : value;
  });
}

export function templateVariables(template: string): string[] {
  const out = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)/g)) out.add(m[1]!);
  return [...out];
}

/** Varsayılan bildirim şablonları (seed). Admin düzenleyebilir. */
export const NOTIFICATION_TEMPLATE_KEYS = [
  'venue_checkin',
  'venue_coming',
  'match_request',
  'match_accepted',
  'match_declined',
  'match_started',
  'match_result',
  'result_submitted',
  'result_confirmed',
  'result_rejected',
  'walkin_join',
  'friend_request',
  'friend_accepted',
  'new_dm',
  'order_ready',
  'venue_post',
  'bulletin',
  'business_approved',
  'business_needs_docs',
  'business_rejected',
  'subscription_expiring',
] as const;
export type NotificationTemplateKey = (typeof NOTIFICATION_TEMPLATE_KEYS)[number];

export type NotificationCategory = 'presence' | 'match' | 'social' | 'order' | 'venue' | 'bulletin' | 'account';

export const DEFAULT_TEMPLATES: Record<
  NotificationTemplateKey,
  { title: string; body: string; category: NotificationCategory; description: string }
> = {
  venue_checkin: { title: 'Salonda', body: '✅ {{kullanici}} {{salon|de}}!', category: 'presence', description: 'Takip edilen salona / arkadaşa giriş' },
  venue_coming: { title: 'Gelecek', body: "⏳ {{kullanici}} saat {{saat|den}} itibaren {{salon|de}} olacak.", category: 'presence', description: 'Arkadaş veya takip edilen salon için "Geleceğim"' },
  match_request: { title: 'Yeni maç isteği', body: '🎱 {{kullanici}} seninle {{oyun}} maçı yapmak istiyor.', category: 'match', description: 'Maç isteği alındığında' },
  match_accepted: { title: 'Maç isteği kabul edildi', body: '🤝 {{kullanici}} maç isteğini kabul etti. Masaya geçince QR okut.', category: 'match', description: 'İstek kabul edildiğinde' },
  match_declined: { title: 'Maç isteği reddedildi', body: '{{kullanici}} maç isteğini şu an kabul edemedi.', category: 'match', description: 'İstek reddedildiğinde' },
  match_started: { title: 'Maç başladı', body: "🔥 {{oyuncu1}} ile {{oyuncu2}}, {{salon|de}} mücadeleye başladı!", category: 'match', description: 'Takipçilere ve arkadaşlara' },
  match_result: { title: 'Maç sonucu', body: '🏆 {{kazanan}}, {{salon|de}}ki mücadeleyi kazandı! Tebrikler.', category: 'match', description: 'Onaylanan sonuç, takipçilere ve arkadaşlara' },
  result_submitted: { title: 'Sonucu onayla', body: '{{kullanici}} maç sonucunu girdi: {{skor}}. Onaylıyor musun?', category: 'match', description: 'Rakibe onay isteği' },
  result_confirmed: { title: 'Sonuç onaylandı', body: '{{kullanici}} sonucu onayladı. İstatistiklerin güncellendi.', category: 'match', description: 'Sonucu giren oyuncuya' },
  result_rejected: { title: 'Sonuç reddedildi', body: '{{kullanici}} sonucu reddetti: {{sebep}}. Lütfen düzeltin.', category: 'match', description: 'Sonucu giren oyuncuya' },
  walkin_join: { title: 'Masana katılmak isteyen var', body: '{{kullanici}} Masa {{masa}} oturumuna katılmak istiyor.', category: 'match', description: 'Masa oturumunu açan oyuncuya' },
  friend_request: { title: 'Arkadaşlık isteği', body: '{{kullanici}} seni arkadaş olarak eklemek istiyor.', category: 'social', description: 'Arkadaşlık isteği' },
  friend_accepted: { title: 'Artık arkadaşsınız', body: '{{kullanici}} arkadaşlık isteğini kabul etti.', category: 'social', description: 'İstek kabul edildiğinde' },
  new_dm: { title: '{{kullanici}}', body: '{{mesaj}}', category: 'social', description: 'Yeni özel mesaj' },
  order_ready: { title: 'Siparişin hazır', body: '☕ {{salon}} siparişini hazırladı.', category: 'order', description: 'Sipariş teslim edildiğinde' },
  venue_post: { title: '{{salon}}', body: '📣 {{baslik}}', category: 'venue', description: 'Takip edilen salonun duyuru / kampanyası' },
  bulletin: { title: 'Bülten', body: "📰 BilardoGo'da yeni içerik yayınlandı: {{baslik}}", category: 'bulletin', description: 'Admin bülteni' },
  business_approved: { title: 'İşletmen onaylandı', body: '🎉 {{isletme}} onaylandı. Salonun artık BilardoGo’da görünüyor.', category: 'account', description: 'İşletme başvurusu onayı' },
  business_needs_docs: { title: 'Ek belge gerekiyor', body: '{{isletme}} başvurusu için ek belge istendi: {{not}}', category: 'account', description: 'Ek belge talebi' },
  business_rejected: { title: 'Başvuru reddedildi', body: '{{isletme}} başvurusu reddedildi: {{not}}', category: 'account', description: 'Başvuru reddi' },
  subscription_expiring: { title: 'Aboneliğin bitiyor', body: 'Aboneliğin {{gun}} gün içinde sona erecek.', category: 'account', description: 'Deneme / abonelik bitişine 3 gün kala' },
};
