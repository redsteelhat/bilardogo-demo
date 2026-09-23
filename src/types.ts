/**
 * BilardoGo - Types & Interfaces
 * Comprehensive schema for players, salons, tables, matchmaking, tournaments, orders, admin & moderation.
 */

export type UserRole = 'kullanici' | 'isletme' | 'calisan' | 'admin' | 'SUPER_ADMIN' | 'SALON_SAHIBI' | 'OYUNCU';

export type BilliardGameType = '3_BANT' | 'KARAMBOL' | 'AMERIKAN' | 'DOKUZ_TOP' | 'SNOOKER';

export type SalonPresenceStatus = 'SALONDA' | 'GELECEK' | 'CEVRIMDISI';

export type MatchSeekStatus = 'OYNAYACAK' | 'ISTEMIYOR' | 'MAC_YAPACAK' | 'MACTA';

export type SkillLevel = 'Başlangıç' | 'Orta' | 'İleri' | 'Usta';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  city: string;
  level: SkillLevel;
  role: UserRole;
  playedGames: BilliardGameType[];
  consistencyStreakDays: number; // Bilardo devamlılığı
  salonStatus: SalonPresenceStatus;
  currentSalonId?: string;
  etaMinutes?: number; // "Gelecek" için tahmini varış dakikası
  matchStatus: MatchSeekStatus;
  friends?: string[];
  blockedUsers?: string[];
  stats: {
    totalMatches: number;
    wins: number;
    losses: number;
    // 3 Bant & Karambol istatistikleri
    threeCushion: {
      totalPoints: number;
      totalInnings: number;
      generalAverage: number; // 3 ondalık (örn. 0.842)
      highestRun: number;
      matchesCount: number;
    };
    carom: {
      totalPoints: number;
      totalInnings: number;
      generalAverage: number;
      highestRun: number;
      matchesCount: number;
    };
    american: {
      racksWon: number;
      racksLost: number;
      matchesWon: number;
    };
    nineBall: {
      racksWon: number;
      racksLost: number;
      matchesWon: number;
    };
    snooker: {
      framesWon: number;
      framesLost: number;
      highestBreak: number;
      matchesWon: number;
    };
  };
  preferredSalons: string[];
  loyaltyHoursPlayed: number;
  isBanned?: boolean;
  banReason?: string;
  isActive: boolean;
  subscription: {
    plan: 'Deneme' | 'Standart' | 'Pro' | 'Kurumsal';
    trialEndDate: string;
    isActive: boolean;
    renewsAt?: string;
  };
}

export interface SalonTable {
  id: string;
  salonId: string;
  tableNumber: number;
  name: string; // Örn: Masa 1 (3 Bant)
  allowedGames: BilliardGameType[];
  status: 'BOS' | 'DOLU' | 'BAKIMDA';
  currentMatchId?: string;
  activePlayerIds?: string[];
  activePlayerNames?: string[];
  startTime?: string;
  elapsedMinutes?: number;
  qrCode: string; // Unique salon-table QR identifier
}

export type TableStatus = 'BOS' | 'DOLU' | 'BAKIMDA';
export type CafeMenuItem = SalonMenuItem;
export type Advertisement = AdSponsorship;
export type SalonStatus = 'ONAYLANDI' | 'BEKLEMEDE' | 'EK_BELGE_GEREKLI' | 'REDDEDILDI' | 'AKTIF' | 'PASIF';

export interface Salon {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  isOpen: boolean;
  openHours: string; // Örn: "11:00 - 02:00"
  coverImage: string;
  photos: string[];
  rating: number;
  followersCount: number;
  description: string;
  taxNumber?: string; // VKN / TCKN for verification
  verificationStatus: 'ONAYLANDI' | 'BEKLEMEDE' | 'EK_BELGE_GEREKLI' | 'REDDEDILDI';
  tables: SalonTable[];
  menuItems: SalonMenuItem[];
  cafeMenu?: SalonMenuItem[];
  status?: SalonStatus;
  amenities: string[];
  announcements: SalonAnnouncement[];
  lat?: number;
  lng?: number;
}

export interface MatchRequest {
  id: string;
  senderId: string;
  receiverId: string;
  salonId: string;
  gameType: BilliardGameType;
  scheduleType: 'HEMEN' | 'BELIRLI_SAAT';
  scheduledTime?: string;
  targetScoreOrRacks: number; // 3 Bant: sayı; Amerikan: rack; Snooker: frame
  targetInnings?: number; // 3 Bant / Karambol isteka sınırlaması
  hasHandicap: boolean;
  senderHandicap: number;
  receiverHandicap: number;
  note?: string;
  status: 'BEKLEMEDE' | 'KABUL_EDILDI' | 'REDDEDILDI' | 'MAC_BASLADI' | 'SONUC_BEKLIYOR' | 'TAMAMLANDI' | 'IPTAL';
  tableId?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  result?: MatchResult;
}

export interface MatchResult {
  submittedBy: string;
  confirmedBy?: string;
  winnerId: string;
  p1Score: number;
  p2Score: number;
  innings?: number; // 3 Bant / Karambol için
  p1Average?: number;
  p2Average?: number;
  p1HighestRun?: number | 'unremembered';
  p2HighestRun?: number | 'unremembered';
  p1RacksOrFrames?: number;
  p2RacksOrFrames?: number;
  p1HighestBreak?: number | 'unremembered';
  p2HighestBreak?: number | 'unremembered';
  status: 'ONAY_BEKLIYOR' | 'ONAYLANDI' | 'ITIRAZ_EDILDI';
}

export interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  opponentAvatar: string;
  gameType: BilliardGameType;
  matchesPlayed: number;
  myWins: number;
  opponentWins: number;
  lastPlayedDate: string;
}

export interface SoloPracticeRecord {
  id: string;
  userId: string;
  gameType: '3_BANT' | 'KARAMBOL';
  points: number;
  innings: number;
  average: number;
  highestRun: number;
  date: string;
  note?: string;
}

export interface WeekendEvent {
  id: string;
  salonId: string;
  salonName: string;
  title: string;
  description: string;
  gameType: BilliardGameType;
  date: string; // e.g. "Cumartesi 15:00"
  entryFee: number;
  prize: string;
  capacity: number;
  registeredCount: number;
  isRegistered?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  channelId: string; // 'turkiye', 'sehir_{city}', 'salon_{salonId}', or direct 'dm_{userId1}_{userId2}'
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'TEXT' | 'IMAGE' | 'VIDEO';
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
  createdAt: string;
  isReported?: boolean;
}

export interface BulletinNewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'HABER' | 'CANLI_YAYIN' | 'EGITIM' | 'SISTEM_DUYURUSU';
  mediaUrl?: string; // YouTube or video
  imageUrl?: string;
  author: string;
  status: 'YAYINDA' | 'TASLAK' | 'PLANLANDI' | 'ARSIV';
  createdAt: string;
}

export interface SalonAnnouncement {
  id: string;
  salonId: string;
  salonName: string;
  title: string;
  content: string;
  validUntil: string;
  type: 'INDIRIM' | 'HABER' | 'ETKINLIK';
  createdAt: string;
}

export interface Tournament {
  id: string;
  title: string;
  salonId: string;
  salonName: string;
  organizerRole: 'isletme' | 'admin';
  gameType: BilliardGameType;
  capacity: number;
  designatedTables: number[];
  startDate: string;
  entryFee: number;
  prizeDescription: string;
  registeredUserIds: string[];
  status: 'KAYIT_ACIK' | 'DEVAM_EDIYOR' | 'TAMAMLANDI';
  rules: string;
  fixtures: TournamentMatch[];
}

export interface TournamentMatch {
  id: string;
  round: 'Ceyrek Final' | 'Yari Final' | 'Final';
  tableNumber: number;
  matchTime: string;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  scoreDisplay?: string;
}

export interface SalonMenuItem {
  id: string;
  name: string;
  category: 'Sicak Icecek' | 'Soguk Icecek' | 'Atistirmalik' | 'Yiyecek';
  price: number;
  isAvailable: boolean;
  image?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

export interface SalonOrder {
  id: string;
  salonId: string;
  salonName: string;
  type: 'MAC_OTURUMU' | 'BIREYSEL' | 'GRUP_OTURUMU';
  orderCode?: string; // e.g. "BGO-4029"
  tableNumber?: number;
  locationDescription: string; // e.g. "Masa 3", "Bahçe locası", "Arka salon"
  customerName: string;
  customerId: string;
  userName?: string;
  userId?: string;
  items: {
    orderedBy: string; // e.g. "Ahmet", "Mert", "Halil Kiraz (İzleyici)"
    name: string;
    quantity: number;
    price: number;
  }[];
  totalPrice: number;
  totalAmount?: number;
  orderNote?: string;
  note?: string;
  status: 'ALINDI' | 'HAZIRLANIYOR' | 'SERVIS_EDILDI' | 'KASADA_ODENDI_KAPATILDI' | 'TESLIM_EDILDI';
  createdAt: string;
}

export interface AdSponsorship {
  id: string;
  brand: string;
  logo: string;
  bannerImage: string;
  targetScope: 'TURKIYE_GENELI' | 'SEHIR_BAZLI';
  targetCity?: string;
  title: string;
  description: string;
  link: string;
  targetLink?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ModerationReport {
  id: string;
  reporterUserId: string;
  reporterId?: string;
  reportedUserId: string;
  targetType: 'KULLANICI' | 'MESAJ' | 'SALON';
  targetId: string;
  contextSnippet: string;
  messageSnippet?: string;
  reason: string;
  createdAt: string;
  status: 'INCELENIYOR' | 'ISLEM_YAPILDI' | 'REDDEDILDI' | 'BEKLEMEDE';
}

export interface NotificationTemplate {
  id: string;
  event: 'SALONDA' | 'GELECEK' | 'MAC_BASLADI' | 'MAC_SONUCU' | 'TURNUVA' | 'BULTEN';
  template: string;
  description: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  hoursRequired: number;
  rewardType: 'BILARDO_ELDIVENI' | 'SALON_INDIRIMI' | 'MASA_INDIRIMI' | 'SPONSOR_URUNU';
  description: string;
}
