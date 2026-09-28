/** Admin paneline özgü durum etiketleri ve renk tonları. Paylaşılan etiketler @bilardogo/domain'den gelir. */
type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type LabelTone = { label: string; tone: Tone };

export const ACCOUNT_STATUS: Record<'active' | 'passive' | 'banned', LabelTone> = {
  active: { label: 'Aktif', tone: 'success' },
  passive: { label: 'Pasif', tone: 'neutral' },
  banned: { label: 'Banlı', tone: 'danger' },
};

export const ROLE_LABELS: Record<'user' | 'admin', string> = { user: 'Kullanıcı', admin: 'Admin' };

export const BUSINESS_STATUS: Record<'pending' | 'needs_docs' | 'approved' | 'rejected', LabelTone> = {
  pending: { label: 'Onay bekliyor', tone: 'warning' },
  needs_docs: { label: 'Ek belge istendi', tone: 'info' },
  approved: { label: 'Onaylı', tone: 'success' },
  rejected: { label: 'Reddedildi', tone: 'danger' },
};

export const SUB_STATUS: Record<'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none', LabelTone> = {
  trialing: { label: 'Deneme', tone: 'info' },
  active: { label: 'Aktif', tone: 'success' },
  past_due: { label: 'Ödeme bekliyor', tone: 'warning' },
  canceled: { label: 'İptal', tone: 'neutral' },
  expired: { label: 'Süresi doldu', tone: 'danger' },
  none: { label: 'Abonelik yok', tone: 'neutral' },
};

export const PAYMENT_METHODS = ['bank_transfer', 'cash', 'card', 'manual', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Havale / EFT',
  cash: 'Nakit',
  card: 'Kart (harici POS)',
  manual: 'Manuel',
  other: 'Diğer',
};

export const PAYMENT_STATUS: Record<'paid' | 'refunded' | 'failed', LabelTone> = {
  paid: { label: 'Ödendi', tone: 'success' },
  refunded: { label: 'İade', tone: 'warning' },
  failed: { label: 'Başarısız', tone: 'danger' },
};

export const SUB_EVENT_LABELS: Record<string, string> = {
  trial_started: 'Deneme başladı',
  trial_extended: 'Deneme uzatıldı',
  activated: 'Aktive edildi',
  canceled: 'İptal edildi',
  expired: 'Süresi doldu',
  past_due: 'Ödeme gecikti',
  payment_paid: 'Ödeme kaydedildi',
  payment_refunded: 'İade kaydedildi',
  payment_failed: 'Başarısız ödeme kaydedildi',
};

export const PRODUCT_CATEGORIES = ['hot_drink', 'cold_drink', 'food', 'snack', 'other'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  hot_drink: 'Sıcak içecek',
  cold_drink: 'Soğuk içecek',
  food: 'Yiyecek',
  snack: 'Atıştırmalık',
  other: 'Diğer',
};

export const CONSENT_KIND_LABELS: Record<string, string> = {
  kvkk_notice: 'KVKK aydınlatma metni',
  user_agreement: 'Kullanıcı sözleşmesi',
  explicit_consent: 'Açık rıza metni',
  marketing: 'Ticari ileti izni',
  business_agreement: 'İşletme sözleşmesi',
};

export const NOTIF_CATEGORY_LABELS: Record<string, string> = {
  presence: 'Salon durumu',
  match: 'Maç',
  social: 'Sosyal',
  order: 'Sipariş',
  venue: 'Salon',
  bulletin: 'Bülten',
  account: 'Hesap',
};

export const AD_PLACEMENT_LABELS: Record<'home' | 'bulletin' | 'venue', string> = {
  home: 'Ana sayfa',
  bulletin: 'Bülten',
  venue: 'Salon sayfası',
};

export const REPORT_TARGET_LABELS: Record<'user' | 'message' | 'venue', string> = {
  user: 'Kullanıcı',
  message: 'Mesaj',
  venue: 'Salon',
};

export const REPORT_STATUS: Record<'open' | 'actioned' | 'dismissed', LabelTone> = {
  open: { label: 'Açık', tone: 'warning' },
  actioned: { label: 'İşlem yapıldı', tone: 'success' },
  dismissed: { label: 'Reddedildi', tone: 'neutral' },
};

export const CONVERSATION_TYPE_LABELS: Record<string, string> = {
  country: 'Türkiye sohbeti',
  city: 'Şehir sohbeti',
  venue: 'Salon sohbeti',
  dm: 'Özel mesaj',
};

export const VENUE_STATE: Record<'active' | 'passive', LabelTone> = {
  active: { label: 'Aktif', tone: 'success' },
  passive: { label: 'Pasif', tone: 'neutral' },
};

export const DOC_KIND_LABELS: Record<string, string> = {
  tax_certificate: 'Vergi levhası',
  signature_circular: 'İmza sirküleri',
  trade_registry: 'Ticaret sicil gazetesi',
  id_copy: 'Kimlik fotokopisi',
  other: 'Diğer belge',
};

export const AUDIT_ACTION_PREFIXES: { value: string; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'user.', label: 'Kullanıcı' },
  { value: 'business.', label: 'İşletme' },
  { value: 'venue.', label: 'Salon' },
  { value: 'match.', label: 'Maç' },
  { value: 'moderation.', label: 'Moderasyon' },
  { value: 'bulletin.', label: 'Bülten' },
  { value: 'ad.', label: 'Reklam' },
  { value: 'template.', label: 'Şablon' },
  { value: 'subscription.', label: 'Abonelik' },
  { value: 'settings.', label: 'Ayarlar' },
  { value: 'legal.', label: 'Sözleşme' },
  { value: 'table.', label: 'Masa' },
  { value: 'account.', label: 'Hesap' },
];

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'user.status.active': 'Kullanıcı aktif yapıldı',
  'user.status.passive': 'Kullanıcı pasife alındı',
  'user.status.banned': 'Kullanıcı banlandı',
  'user.role': 'Kullanıcı rolü değişti',
  'business.viewed': 'İşletme detayı görüntülendi',
  'business.applied': 'İşletme başvurusu',
  'business.resubmitted': 'Başvuru yeniden gönderildi',
  'business.staff_added': 'Çalışan eklendi',
  'business.staff_removed': 'Çalışan çıkarıldı',
  'table.qr_regenerated': 'Masa QR yenilendi',
  'account.deleted': 'Hesap silindi',
  'business.approve': 'İşletme onaylandı',
  'business.needs_docs': 'Ek belge istendi',
  'business.reject': 'İşletme reddedildi',
  'business.activated': 'İşletme aktif yapıldı',
  'business.deactivated': 'İşletme pasife alındı',
  'venue.active': 'Salon aktif yapıldı',
  'venue.passive': 'Salon pasife alındı',
  'match.voided': 'Maç sonuçsuz kapatıldı',
  'bulletin.saved': 'Bülten kaydedildi',
  'bulletin.deleted': 'Bülten silindi',
  'ad.created': 'Reklam oluşturuldu',
  'ad.updated': 'Reklam güncellendi',
  'ad.deleted': 'Reklam silindi',
  'moderation.context_opened': 'Şikâyet bağlamı açıldı',
  'moderation.dismiss': 'Şikâyet reddedildi',
  'moderation.hide_message': 'Mesaj kaldırıldı',
  'moderation.warn': 'Kullanıcı uyarıldı',
  'moderation.ban_user': 'Kullanıcı banlandı (şikâyet)',
  'moderation.passive_venue': 'Salon pasife alındı (şikâyet)',
  'template.updated': 'Bildirim şablonu güncellendi',
  'subscription.activated': 'Abonelik aktive edildi',
  'settings.updated': 'Ayar güncellendi',
  'legal.published': 'Sözleşme sürümü yayınlandı',
};
