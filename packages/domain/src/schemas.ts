import { z } from 'zod';
import { matchFormatSchema } from './format';
import { GAME_TYPES, LEVELS } from './game';
import { openingHoursSchema } from './hours';
import { PLAY_INTENTS, VENUE_STATUSES } from './presence';
import { isValidTaxId } from './tax-id';

export const uuid = z.string().uuid();
export const gameTypeSchema = z.enum(GAME_TYPES);
export const levelSchema = z.enum(LEVELS);
export const cityPlateSchema = z.number().int().min(1).max(81);
const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Kullanıcı adı en az 3 karakter olmalı')
  .max(20, 'Kullanıcı adı en fazla 20 karakter olabilir')
  .regex(/^[a-z0-9_.]+$/, 'Yalnız küçük harf, rakam, nokta ve alt çizgi kullanılabilir');

export const profileUpdateSchema = z.object({
  fullName: trimmed(2, 60),
  username: usernameSchema,
  cityPlate: cityPlateSchema,
  level: levelSchema,
  gameTypes: z.array(gameTypeSchema).min(1, 'En az bir oyun türü seçin').max(5),
  bio: optionalText(280),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const consentKinds = ['kvkk_notice', 'user_agreement', 'explicit_consent', 'marketing', 'business_agreement'] as const;
export const onboardingSchema = profileUpdateSchema.extend({
  acceptUserAgreement: z.literal(true, { message: 'Kullanıcı sözleşmesini kabul etmelisin' }),
  acknowledgeKvkk: z.literal(true, { message: 'KVKK aydınlatma metnini okuduğunu onaylamalısın' }),
  explicitConsent: z.boolean(),
  marketingConsent: z.boolean(),
});

export const presenceSetSchema = z.object({
  venueId: uuid,
  status: z.enum(VENUE_STATUSES),
  eta: z.string().datetime({ offset: true }).nullable().optional(),
  playIntent: z.enum(PLAY_INTENTS).nullable().optional(),
});

export const matchRequestSchema = z
  .object({
    opponentId: uuid,
    venueId: uuid,
    gameType: gameTypeSchema,
    format: matchFormatSchema,
    when: z.enum(['now', 'scheduled']),
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
    note: optionalText(280),
  })
  .refine((v) => v.when === 'now' || !!v.scheduledAt, { message: 'Maç saatini seçin', path: ['scheduledAt'] });
export type MatchRequestInput = z.infer<typeof matchRequestSchema>;

export const practiceSchema = z.object({
  gameType: z.enum(['three_cushion', 'carom']),
  score: z.number().int().min(0).max(5000),
  innings: z.number().int().min(1).max(5000),
  highRun: z.number().int().min(0).max(5000).nullable(),
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: optionalText(280),
});

export const venueInfoSchema = z.object({
  name: trimmed(2, 80),
  cityPlate: cityPlateSchema,
  district: optionalText(60),
  address: trimmed(5, 300),
  lat: z.number().min(35).max(43).nullable(),
  lng: z.number().min(25).max(45.5).nullable(),
  phone: optionalText(20),
  description: optionalText(1000),
  openingHours: openingHoursSchema,
});
export type VenueInfoInput = z.infer<typeof venueInfoSchema>;

export const tableSchema = z.object({
  number: z.number().int().min(1).max(500),
  label: optionalText(40),
  allowedGameTypes: z.array(gameTypeSchema).min(1, 'Masada en az bir oyun türü oynanabilmeli'),
  isActive: z.boolean().default(true),
});

export const taxIdSchema = z
  .string()
  .trim()
  .regex(/^\d{10,11}$/, 'VKN 10, TCKN 11 haneli olmalı')
  .refine(isValidTaxId, 'Geçersiz VKN / TCKN');

export const businessApplySchema = z.object({
  legalName: trimmed(2, 160),
  taxId: taxIdSchema,
  taxOffice: trimmed(2, 80),
  contactPhone: trimmed(10, 20),
  venue: venueInfoSchema,
  acceptBusinessAgreement: z.literal(true, { message: 'İşletme sözleşmesini kabul etmelisin' }),
});
export type BusinessApplyInput = z.infer<typeof businessApplySchema>;

export const ORDER_KINDS = ['match', 'individual', 'group'] as const;
export const ORDER_KIND_LABELS: Record<(typeof ORDER_KINDS)[number], string> = {
  match: 'Maç oturumu',
  individual: 'Bireysel sipariş',
  group: 'Sipariş oturumu',
};
export const orderCreateSchema = z
  .object({
    venueId: uuid,
    kind: z.enum(ORDER_KINDS),
    matchId: uuid.nullable().optional(),
    locationText: optionalText(80),
    note: optionalText(200),
  })
  .refine((v) => v.kind === 'match' || !!v.locationText, {
    message: 'Lütfen bulunduğunuz konumu belirtin (ör. Masa 4, arka salon, bahçe).',
    path: ['locationText'],
  });
export const orderItemsSchema = z.object({
  orderId: uuid,
  items: z
    .array(z.object({ venueProductId: uuid, qty: z.number().int().min(1).max(20), note: optionalText(100) }))
    .min(1)
    .max(30),
});

export const VENUE_POST_KINDS = ['announcement', 'campaign'] as const;
export const venuePostSchema = z.object({
  kind: z.enum(VENUE_POST_KINDS),
  title: trimmed(3, 100),
  body: trimmed(3, 2000),
  imagePath: z.string().max(300).nullable().optional(),
  validFrom: z.string().datetime({ offset: true }).nullable().optional(),
  validTo: z.string().datetime({ offset: true }).nullable().optional(),
});

export const BULLETIN_KINDS = ['news', 'live', 'video', 'training', 'feature', 'system'] as const;
export const BULLETIN_KIND_LABELS: Record<(typeof BULLETIN_KINDS)[number], string> = {
  news: 'Haber',
  live: 'Canlı yayın',
  video: 'Video',
  training: 'Eğitim',
  feature: 'Yeni özellik',
  system: 'Sistem duyurusu',
};
export const BULLETIN_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;
export const BULLETIN_STATUS_LABELS: Record<(typeof BULLETIN_STATUSES)[number], string> = {
  draft: 'Taslak',
  scheduled: 'Planlandı',
  published: 'Yayında',
  archived: 'Arşiv',
};
export const bulletinSchema = z.object({
  kind: z.enum(BULLETIN_KINDS),
  title: trimmed(3, 160),
  body: z.string().trim().max(10000).default(''),
  mediaPath: z.string().max(300).nullable().optional(),
  mediaType: z.enum(['image', 'video']).nullable().optional(),
  videoUrl: z.string().url().max(500).nullable().optional(),
  status: z.enum(BULLETIN_STATUSES),
  publishAt: z.string().datetime({ offset: true }).nullable().optional(),
  cityPlates: z.array(cityPlateSchema).default([]),
  notify: z.boolean().default(false),
});

export const AD_PLACEMENTS = ['home', 'bulletin', 'venue'] as const;
export const adSchema = z.object({
  brand: trimmed(2, 80),
  logoPath: z.string().max(300).nullable().optional(),
  product: optionalText(120),
  priceText: optionalText(120),
  body: optionalText(1000),
  mediaPath: z.string().max(300).nullable().optional(),
  mediaType: z.enum(['image', 'video']).nullable().optional(),
  link: z.string().url().max(500).nullable().optional(),
  contact: optionalText(160),
  scope: z.enum(['country', 'city']),
  cityPlates: z.array(cityPlateSchema).default([]),
  placements: z.array(z.enum(AD_PLACEMENTS)).min(1),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  isActive: z.boolean().default(true),
});

export const REPORT_TARGETS = ['user', 'message', 'venue'] as const;
export const REPORT_REASONS = ['insult', 'spam', 'fake_score', 'inappropriate_media', 'rule_violation', 'other'] as const;
export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  insult: 'Hakaret / taciz',
  spam: 'Spam',
  fake_score: 'Yanıltıcı skor',
  inappropriate_media: 'Uygunsuz içerik',
  rule_violation: 'Kural ihlali',
  other: 'Diğer',
};
export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: uuid,
  reason: z.enum(REPORT_REASONS),
  details: optionalText(500),
});

export const messageSendSchema = z
  .object({
    conversationId: uuid,
    body: z.string().trim().max(2000).default(''),
    mediaPath: z.string().max(300).nullable().optional(),
    mediaType: z.enum(['image', 'video']).nullable().optional(),
    replyToId: uuid.nullable().optional(),
  })
  .refine((v) => v.body.length > 0 || !!v.mediaPath, { message: 'Boş mesaj gönderilemez' });

export const STAFF_PERMISSIONS = ['orders', 'tables', 'posts', 'chat'] as const;
export const STAFF_PERMISSION_LABELS: Record<(typeof STAFF_PERMISSIONS)[number], string> = {
  orders: 'Siparişleri görür, hazırlar ve kapatır',
  tables: 'Masaları ve maçları yönetir (maç bitirme)',
  posts: 'Duyuru ve kampanya girer',
  chat: 'Salon sohbetinde salon adına yazar',
};

export const MEDIA_LIMITS = {
  imageBytes: 10 * 1024 * 1024,
  videoBytes: 50 * 1024 * 1024,
  documentBytes: 15 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  videoTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  documentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;

export const PRODUCT_CATEGORIES = ['hot_drink', 'cold_drink', 'food', 'snack', 'other'] as const;
export const PRODUCT_CATEGORY_LABELS: Record<(typeof PRODUCT_CATEGORIES)[number], string> = {
  hot_drink: 'Sıcak içecekler',
  cold_drink: 'Soğuk içecekler',
  food: 'Yiyecek',
  snack: 'Atıştırmalık',
  other: 'Diğer',
};
