import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Salon,
  SalonTable,
  MatchRequest,
  MatchResult,
  BilliardGameType,
  SalonPresenceStatus,
  MatchSeekStatus,
  SalonOrder,
  BulletinNewsItem,
  Tournament,
  AdSponsorship,
  ModerationReport,
  NotificationTemplate,
  LoyaltyReward,
  ChatMessage,
  HeadToHeadRecord,
  SoloPracticeRecord,
  WeekendEvent,
} from '../types';
import {
  CITIES,
  INITIAL_USERS,
  INITIAL_SALONS,
  INITIAL_MATCHES,
  INITIAL_TOURNAMENTS,
  INITIAL_ORDERS,
  INITIAL_NEWS,
  INITIAL_ADS,
  INITIAL_NOTIFICATION_TEMPLATES,
  INITIAL_LOYALTY_REWARDS,
  INITIAL_REPORTS,
  INITIAL_HEAD_TO_HEAD,
} from '../data/mockData';

interface AppContextType {
  // Navigation & Role
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedSalonId: string | null;
  setSelectedSalonId: (id: string | null) => void;
  currentSalonId: string | null;

  // Data
  users: User[];
  salons: Salon[];
  matches: MatchRequest[];
  tournaments: Tournament[];
  orders: SalonOrder[];
  cafeOrders: SalonOrder[];
  news: BulletinNewsItem[];
  ads: AdSponsorship[];
  reports: ModerationReport[];
  notificationTemplates: NotificationTemplate[];
  loyaltyRewards: LoyaltyReward[];
  chatMessages: ChatMessage[];
  headToHead: HeadToHeadRecord[];
  soloPracticeRecords: SoloPracticeRecord[];
  weekendEvents: WeekendEvent[];
  friends: string[];
  blockedUsers: string[];

  // User Actions
  updatePresenceStatus: (status: SalonPresenceStatus, salonId?: string, etaMinutes?: number) => void;
  updateMatchStatus: (status: MatchSeekStatus) => void;
  sendMatchRequest: (req: Omit<MatchRequest, 'id' | 'createdAt' | 'status'>) => MatchRequest;
  respondToMatchRequest: (requestId: string, accept: boolean) => void;
  startMatchOnTable: (matchId: string, tableId: string) => boolean;
  quickJoinTableWithoutMatch: (salonId: string, tableNumber: number, opponentId: string, gameType: BilliardGameType) => boolean;
  submitMatchResult: (matchId: string, result: MatchResult) => void;
  confirmMatchResult: (matchId: string) => void;
  recordSoloPractice: (gameType: '3_BANT' | 'KARAMBOL', points: number, innings: number, highestRun?: number, note?: string) => void;
  toggleFriend: (userId: string) => void;
  toggleBlockUser: (userId: string) => void;
  joinWeekendEvent: (eventId: string) => boolean;

  // Orders
  placeOrder: (order: Omit<SalonOrder, 'id' | 'createdAt' | 'status'>) => SalonOrder;
  placeCafeOrder: (order: any) => SalonOrder;
  updateOrderStatus: (orderId: string, status: SalonOrder['status']) => void;
  updateCafeOrderStatus: (orderId: string, status: any) => void;

  // Chat
  sendMessage: (channelId: string, text: string, imageUrl?: string, replyToId?: string, videoUrl?: string, replyToText?: string, replyToSenderName?: string) => void;
  reportUserOrMessage: (reportedUserId: string, targetType: 'KULLANICI' | 'MESAJ', targetId: string, snippet: string, reason: string) => void;

  // Business Panel Actions
  activeSalon: Salon | undefined;
  updateSalonDetails: (updated: Partial<Salon>) => void;
  addTableToSalon: (name: string, allowedGames: BilliardGameType[]) => void;
  removeTableFromSalon: (tableId: string) => void;
  toggleTableStatus: (tableId: string, status: 'BOS' | 'DOLU' | 'BAKIMDA') => void;
  updateTableStatus: (salonId: string, tableId: string, status: 'BOS' | 'DOLU' | 'BAKIMDA', playerNames?: string[]) => void;
  toggleMenuItemAvailability: (menuItemId: string) => void;
  addSalonAnnouncement: (title: string, content: string, type: 'INDIRIM' | 'HABER' | 'ETKINLIK', validUntil: string) => void;
  addAnnouncement: (salonId: string, ann: any) => void;

  // Admin Actions
  toggleUserActive: (userId: string) => void;
  banUser: (userId: string, reason: string) => void;
  unbanUser: (userId: string) => void;
  verifySalon: (salonId: string, status: Salon['verificationStatus']) => void;
  createNewsItem: (item: Omit<BulletinNewsItem, 'id' | 'createdAt'>) => void;
  updateNewsStatus: (id: string, status: BulletinNewsItem['status']) => void;
  createTournament: (t: any) => void;
  joinTournament: (tournamentId: string) => boolean;
  createAd: (ad: Omit<AdSponsorship, 'id'>) => void;
  toggleAdStatus: (adId: string) => void;
  resolveReport: (reportId: string, decision: any) => void;
  updateNotificationTemplate: (id: string, template: string) => void;

  // Active Match helper
  activeMatch: MatchRequest | undefined;
  pendingRequestsForMe: MatchRequest[];

  // Toast / System Notification helper
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('kullanici');
  const [selectedCity, setSelectedCity] = useState<string>('İstanbul');
  const [activeView, setActiveView] = useState<string>('home');
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>('salon-fbn');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core State with fallback to initial data
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('bg_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => users[0]);

  const [salons, setSalons] = useState<Salon[]>(() => {
    const saved = localStorage.getItem('bg_salons');
    return saved ? JSON.parse(saved) : INITIAL_SALONS;
  });

  const [matches, setMatches] = useState<MatchRequest[]>(() => {
    const saved = localStorage.getItem('bg_matches');
    return saved ? JSON.parse(saved) : INITIAL_MATCHES;
  });

  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('bg_tournaments');
    return saved ? JSON.parse(saved) : INITIAL_TOURNAMENTS;
  });

  const [orders, setOrders] = useState<SalonOrder[]>(() => {
    const saved = localStorage.getItem('bg_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [news, setNews] = useState<BulletinNewsItem[]>(() => {
    const saved = localStorage.getItem('bg_news');
    return saved ? JSON.parse(saved) : INITIAL_NEWS;
  });

  const [ads, setAds] = useState<AdSponsorship[]>(() => {
    const saved = localStorage.getItem('bg_ads');
    return saved ? JSON.parse(saved) : INITIAL_ADS;
  });

  const [reports, setReports] = useState<ModerationReport[]>(() => {
    const saved = localStorage.getItem('bg_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>(() => {
    const saved = localStorage.getItem('bg_templates');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATION_TEMPLATES;
  });

  const [loyaltyRewards] = useState<LoyaltyReward[]>(INITIAL_LOYALTY_REWARDS);

  const [headToHead, setHeadToHead] = useState<HeadToHeadRecord[]>(() => {
    const saved = localStorage.getItem('bg_h2h');
    return saved ? JSON.parse(saved) : INITIAL_HEAD_TO_HEAD;
  });

  const [soloPracticeRecords, setSoloPracticeRecords] = useState<SoloPracticeRecord[]>(() => {
    const saved = localStorage.getItem('bg_solo_practice');
    return saved ? JSON.parse(saved) : [
      {
        id: 'prac-1',
        userId: 'usr-berkay',
        gameType: '3_BANT',
        points: 32,
        innings: 28,
        average: 1.142,
        highestRun: 8,
        date: '18 Eylül 2026',
        note: 'Kısa bant - uzun bant bağlantı vuruşları antrenmanı',
      },
      {
        id: 'prac-2',
        userId: 'usr-berkay',
        gameType: '3_BANT',
        points: 40,
        innings: 34,
        average: 1.176,
        highestRun: 11,
        date: '15 Eylül 2026',
        note: 'Kleps ve karşı köşe pikaj denemeleri',
      },
      {
        id: 'prac-3',
        userId: 'usr-berkay',
        gameType: 'KARAMBOL',
        points: 65,
        innings: 38,
        average: 1.710,
        highestRun: 19,
        date: '12 Eylül 2026',
        note: 'Amerikan serisi pozisyon koruma',
      }
    ];
  });

  const [weekendEvents, setWeekendEvents] = useState<WeekendEvent[]>(() => {
    const saved = localStorage.getItem('bg_weekend_events');
    return saved ? JSON.parse(saved) : [
      {
        id: 'we-1',
        salonId: 'salon-fbn',
        salonName: 'FBN Bilardo Salonu',
        title: 'Cumartesi 3 Bant Handikaplı Seri Turnuvası',
        description: 'Her seviyeden oyuncunun handikap sistemiyle eşit şansla yarıştığı eğlenceli hafta sonu mini turnuvası.',
        gameType: '3_BANT',
        date: 'Bu Cumartesi 14:00',
        entryFee: 150,
        prize: '1.ye 2.000 TL Salon Kredisi + Özel Bilardo Tebeşiri',
        capacity: 16,
        registeredCount: 11,
      },
      {
        id: 'we-2',
        salonId: 'salon-arena',
        salonName: 'Arena Bilardo Kulübü',
        title: 'Pazar 9-Top Açık Çift Eleme Mini Turnuva',
        description: 'Pazar akşamı dinamik ve tempolu 9 Top mücadelesi! Kayıtlar salon resepsiyonu veya uygulama üzerinden.',
        gameType: 'DOKUZ_TOP',
        date: 'Bu Pazar 16:30',
        entryFee: 100,
        prize: 'İlk 3\'e Kupa & Madalya + 1 Aylık Ücretsiz İçecek Aboneliği',
        capacity: 12,
        registeredCount: 8,
      },
      {
        id: 'we-3',
        salonId: 'salon-platin',
        salonName: 'Platin Bilardo Salonu',
        title: 'Kadıköy Karambol İkili Takım Etkinliği',
        description: 'İkişerli takımlarla eğlenceli karambol akşamı. Partnerinle gel veya salonda eşleş.',
        gameType: 'KARAMBOL',
        date: 'Pazar 18:00',
        entryFee: 80,
        prize: 'Şampiyon Çifte Akşam Yemeği Menüsü & Hatıra Plaketi',
        capacity: 8,
        registeredCount: 6,
      },
    ];
  });

  const [friends, setFriends] = useState<string[]>(() => {
    const saved = localStorage.getItem('bg_friends');
    return saved ? JSON.parse(saved) : ['usr-tarik', 'usr-halil'];
  });

  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem('bg_blocked_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      senderId: 'usr-berkay',
      senderName: 'Berkay Karakurt',
      senderAvatar: INITIAL_USERS[0].avatar,
      channelId: 'salon_salon-fbn',
      text: 'Masa 1 de ısınmaya başladım, 3 Bant maç yapmak isteyen varsa beklerim!',
      createdAt: '13:45',
    },
    {
      id: 'msg-2',
      senderId: 'usr-tarik',
      senderName: 'Tarık Çelik',
      senderAvatar: INITIAL_USERS[1].avatar,
      channelId: 'salon_salon-fbn',
      text: 'Geldim Berkay abi, 10 dakikaya yanındayım istek gönderdim.',
      createdAt: '13:50',
    },
    {
      id: 'msg-3',
      senderId: 'usr-halil',
      senderName: 'Halil Kiraz',
      senderAvatar: INITIAL_USERS[4].avatar,
      channelId: 'turkiye',
      text: 'Kadıköy FBN salonunda güzel maçlar dönüyor, bilardo severleri bekleriz.',
      createdAt: '14:02',
    },
  ]);

  // Persist important data
  useEffect(() => {
    localStorage.setItem('bg_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('bg_salons', JSON.stringify(salons));
  }, [salons]);

  useEffect(() => {
    localStorage.setItem('bg_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('bg_tournaments', JSON.stringify(tournaments));
  }, [tournaments]);

  useEffect(() => {
    localStorage.setItem('bg_orders', JSON.stringify(orders));
  }, [orders]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Find active salon for business panel or current user
  const activeSalon = salons.find(s => s.id === (selectedSalonId || 'salon-fbn'));

  // Active match for current user
  const activeMatch = matches.find(
    m => (m.senderId === currentUser.id || m.receiverId === currentUser.id) &&
         (m.status === 'KABUL_EDILDI' || m.status === 'MAC_BASLADI' || m.status === 'SONUC_BEKLIYOR')
  );

  const pendingRequestsForMe = matches.filter(
    m => m.receiverId === currentUser.id && m.status === 'BEKLEMEDE'
  );

  // Update presence status (Salondayım / Geleceğim / Çevrimdışı)
  const updatePresenceStatus = (status: SalonPresenceStatus, salonId?: string, etaMinutes?: number) => {
    const updatedUser: User = {
      ...currentUser,
      salonStatus: status,
      currentSalonId: status !== 'CEVRIMDISI' ? (salonId || currentUser.currentSalonId || 'salon-fbn') : undefined,
      etaMinutes: status === 'GELECEK' ? (etaMinutes || 20) : undefined,
      // If leaving salon, reset match status to ISTEMIYOR if not in match
      matchStatus: status === 'CEVRIMDISI' && currentUser.matchStatus !== 'MACTA' ? 'ISTEMIYOR' : currentUser.matchStatus,
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    const sName = salons.find(s => s.id === (salonId || currentUser.currentSalonId))?.name || 'Salonda';
    if (status === 'SALONDA') {
      showToast(`Durum güncellendi: ${sName} salonundasınız.`);
    } else if (status === 'GELECEK') {
      showToast(`Durum güncellendi: ${etaMinutes || 20} dakika içinde salonda olacaksınız.`);
    } else {
      showToast('Durum güncellendi: Çevrimdışısınız.');
    }
  };

  // Update match seeking status (Oynamak istiyorum / istemiyorum)
  const updateMatchStatus = (status: MatchSeekStatus) => {
    if (currentUser.salonStatus === 'CEVRIMDISI' && (status === 'OYNAYACAK')) {
      showToast('Maç aramak için önce bir salonda veya "Geleceğim" durumunda olmalısınız.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      matchStatus: status,
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    showToast(status === 'OYNAYACAK' ? 'Maç isteğiniz açık! Diğer oyuncular size teklif gönderebilir.' : 'Maç durumu kapatıldı.');
  };

  // Send Match Request
  const sendMatchRequest = (req: Omit<MatchRequest, 'id' | 'createdAt' | 'status'>): MatchRequest => {
    // Check if current user is already in active match
    if (activeMatch) {
      showToast('Zaten aktif bir maçınız veya bekleyen oturumunuz var!');
      throw new Error('Aktif maç mevcut');
    }

    const newMatch: MatchRequest = {
      ...req,
      id: `match-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'BEKLEMEDE',
    };

    setMatches(prev => [newMatch, ...prev]);
    showToast('Maç teklifiniz rakibe iletildi!');
    return newMatch;
  };

  // Respond to match request
  const respondToMatchRequest = (requestId: string, accept: boolean) => {
    setMatches(prev =>
      prev.map(m => {
        if (m.id === requestId) {
          if (accept) {
            // Set match status to MAC_YAPACAK
            return { ...m, status: 'KABUL_EDILDI' };
          } else {
            return { ...m, status: 'REDDEDILDI' };
          }
        }
        return m;
      })
    );

    if (accept) {
      // update users matchStatus to MAC_YAPACAK
      const targetMatch = matches.find(m => m.id === requestId);
      if (targetMatch) {
        setUsers(prev =>
          prev.map(u => {
            if (u.id === targetMatch.senderId || u.id === targetMatch.receiverId) {
              return { ...u, matchStatus: 'MAC_YAPACAK' };
            }
            return u;
          })
        );
        if (currentUser.id === targetMatch.senderId || currentUser.id === targetMatch.receiverId) {
          setCurrentUser(prev => ({ ...prev, matchStatus: 'MAC_YAPACAK' }));
        }
      }
      showToast('Maç teklifi kabul edildi! Masaya geçip QR kodunu okutarak maçı başlatabilirsiniz.');
    } else {
      showToast('Maç teklifi reddedildi.');
    }
  };

  // Start match on specific table via QR scan
  const startMatchOnTable = (matchId: string, tableId: string): boolean => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return false;

    // find table
    let foundTable: SalonTable | undefined;
    let targetSalonId = match.salonId;

    for (const salon of salons) {
      const tbl = salon.tables.find(t => t.id === tableId);
      if (tbl) {
        foundTable = tbl;
        targetSalonId = salon.id;
        break;
      }
    }

    if (!foundTable) {
      showToast('Masa bulunamadı!');
      return false;
    }

    if (foundTable.status !== 'BOS') {
      showToast('Bu masa şu anda dolu veya bakımda!');
      return false;
    }

    // Check table game suitability
    if (!foundTable.allowedGames.includes(match.gameType)) {
      showToast(`Bu masa ${match.gameType.replace('_', ' ')} oyunu için uygun değildir!`);
      return false;
    }

    const p1 = users.find(u => u.id === match.senderId);
    const p2 = users.find(u => u.id === match.receiverId);

    // Update match
    setMatches(prev =>
      prev.map(m =>
        m.id === matchId
          ? {
              ...m,
              status: 'MAC_BASLADI',
              tableId: tableId,
              startedAt: new Date().toISOString(),
            }
          : m
      )
    );

    // Update table in salon
    setSalons(prev =>
      prev.map(s => {
        if (s.id === targetSalonId) {
          return {
            ...s,
            tables: s.tables.map(t =>
              t.id === tableId
                ? {
                    ...t,
                    status: 'DOLU',
                    currentMatchId: matchId,
                    activePlayerIds: [match.senderId, match.receiverId],
                    activePlayerNames: [p1?.name || 'Oyuncu 1', p2?.name || 'Oyuncu 2'],
                    startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    elapsedMinutes: 1,
                  }
                : t
            ),
          };
        }
        return s;
      })
    );

    // Update users' status to MACTA
    setUsers(prev =>
      prev.map(u => {
        if (u.id === match.senderId || u.id === match.receiverId) {
          return { ...u, matchStatus: 'MACTA' };
        }
        return u;
      })
    );

    if (currentUser.id === match.senderId || currentUser.id === match.receiverId) {
      setCurrentUser(prev => ({ ...prev, matchStatus: 'MACTA' }));
    }

    showToast(`Masa ${foundTable.tableNumber} açıldı ve maç başladı! İyi oyunlar.`);
    return true;
  };

  // Quick join table without prior request (both players at table)
  const quickJoinTableWithoutMatch = (salonId: string, tableNumber: number, opponentId: string, gameType: BilliardGameType): boolean => {
    const salon = salons.find(s => s.id === salonId);
    if (!salon) return false;

    const table = salon.tables.find(t => t.tableNumber === tableNumber);
    if (!table) return false;

    if (table.status !== 'BOS') {
      showToast('Bu masa şu anda boş değil!');
      return false;
    }

    if (!table.allowedGames.includes(gameType)) {
      showToast('Bu masada seçtiğiniz oyun türü oynanamaz!');
      return false;
    }

    const newMatchId = `match-quick-${Date.now()}`;
    const opponent = users.find(u => u.id === opponentId);

    const newMatch: MatchRequest = {
      id: newMatchId,
      senderId: currentUser.id,
      receiverId: opponentId,
      salonId: salonId,
      gameType: gameType,
      scheduleType: 'HEMEN',
      targetScoreOrRacks: gameType === '3_BANT' || gameType === 'KARAMBOL' ? 30 : 5,
      targetInnings: gameType === '3_BANT' || gameType === 'KARAMBOL' ? 40 : undefined,
      hasHandicap: false,
      senderHandicap: 0,
      receiverHandicap: 0,
      status: 'MAC_BASLADI',
      tableId: table.id,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setMatches(prev => [newMatch, ...prev]);

    // Update table
    setSalons(prev =>
      prev.map(s => {
        if (s.id === salonId) {
          return {
            ...s,
            tables: s.tables.map(t =>
              t.id === table.id
                ? {
                    ...t,
                    status: 'DOLU',
                    currentMatchId: newMatchId,
                    activePlayerIds: [currentUser.id, opponentId],
                    activePlayerNames: [currentUser.name, opponent?.name || 'Rakip'],
                    startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    elapsedMinutes: 1,
                  }
                : t
            ),
          };
        }
        return s;
      })
    );

    // Update players
    setUsers(prev =>
      prev.map(u => {
        if (u.id === currentUser.id || u.id === opponentId) {
          return { ...u, matchStatus: 'MACTA' };
        }
        return u;
      })
    );
    setCurrentUser(prev => ({ ...prev, matchStatus: 'MACTA' }));

    showToast(`Masa ${tableNumber} oturumu açıldı!`);
    return true;
  };

  // Submit Match Result (One player submits -> opponent must confirm)
  const submitMatchResult = (matchId: string, result: MatchResult) => {
    setMatches(prev =>
      prev.map(m => {
        if (m.id === matchId) {
          return {
            ...m,
            status: 'SONUC_BEKLIYOR',
            result: result,
          };
        }
        return m;
      })
    );
    showToast('Maç sonucu girildi. Rakip onayı bekleniyor.');
  };

  // Confirm match result (Opponent confirms -> updates stats & frees table)
  const confirmMatchResult = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || !match.result) return;

    const res = match.result;
    const isP1Winner = res.winnerId === match.senderId;

    // Update match status
    setMatches(prev =>
      prev.map(m =>
        m.id === matchId
          ? {
              ...m,
              status: 'TAMAMLANDI',
              endedAt: new Date().toISOString(),
              result: {
                ...res,
                status: 'ONAYLANDI',
                confirmedBy: currentUser.id,
              },
            }
          : m
      )
    );

    // Release table
    if (match.tableId) {
      setSalons(prev =>
        prev.map(s => {
          if (s.id === match.salonId) {
            return {
              ...s,
              tables: s.tables.map(t =>
                t.id === match.tableId
                  ? {
                      ...t,
                      status: 'BOS',
                      currentMatchId: undefined,
                      activePlayerIds: [],
                      activePlayerNames: [],
                      startTime: undefined,
                      elapsedMinutes: 0,
                    }
                  : t
              ),
            };
          }
          return s;
        })
      );
    }

    // Update user stats (calculate new general average for 3-Bant & Karambol)
    setUsers(prev =>
      prev.map(u => {
        if (u.id === match.senderId || u.id === match.receiverId) {
          const isSender = u.id === match.senderId;
          const won = u.id === res.winnerId;
          const score = isSender ? res.p1Score : res.p2Score;
          const innings = res.innings || 1;
          const run = isSender ? (res.p1HighestRun !== 'unremembered' ? (res.p1HighestRun || 0) : 0) : (res.p2HighestRun !== 'unremembered' ? (res.p2HighestRun || 0) : 0);

          const newTotalMatches = u.stats.totalMatches + 1;
          const newWins = won ? u.stats.wins + 1 : u.stats.wins;
          const newLosses = won ? u.stats.losses : u.stats.losses + 1;

          let newStats = { ...u.stats, totalMatches: newTotalMatches, wins: newWins, losses: newLosses };

          if (match.gameType === '3_BANT') {
            const totPts = u.stats.threeCushion.totalPoints + score;
            const totInn = u.stats.threeCushion.totalInnings + innings;
            const avg = totInn > 0 ? Number((totPts / totInn).toFixed(3)) : 0;
            const bestRun = Math.max(u.stats.threeCushion.highestRun, run);

            newStats.threeCushion = {
              totalPoints: totPts,
              totalInnings: totInn,
              generalAverage: avg,
              highestRun: bestRun,
              matchesCount: u.stats.threeCushion.matchesCount + 1,
            };
          } else if (match.gameType === 'KARAMBOL') {
            const totPts = u.stats.carom.totalPoints + score;
            const totInn = u.stats.carom.totalInnings + innings;
            const avg = totInn > 0 ? Number((totPts / totInn).toFixed(3)) : 0;
            newStats.carom = {
              totalPoints: totPts,
              totalInnings: totInn,
              generalAverage: avg,
              highestRun: Math.max(u.stats.carom.highestRun, run),
              matchesCount: u.stats.carom.matchesCount + 1,
            };
          } else if (match.gameType === 'AMERIKAN') {
            const racks = isSender ? (res.p1RacksOrFrames || 0) : (res.p2RacksOrFrames || 0);
            newStats.american = {
              ...u.stats.american,
              racksWon: u.stats.american.racksWon + racks,
              matchesWon: won ? u.stats.american.matchesWon + 1 : u.stats.american.matchesWon,
            };
          } else if (match.gameType === 'DOKUZ_TOP') {
            const racks = isSender ? (res.p1RacksOrFrames || 0) : (res.p2RacksOrFrames || 0);
            newStats.nineBall = {
              ...u.stats.nineBall,
              racksWon: u.stats.nineBall.racksWon + racks,
              matchesWon: won ? u.stats.nineBall.matchesWon + 1 : u.stats.nineBall.matchesWon,
            };
          } else if (match.gameType === 'SNOOKER') {
            const frames = isSender ? (res.p1RacksOrFrames || 0) : (res.p2RacksOrFrames || 0);
            const brk = isSender ? (res.p1HighestBreak !== 'unremembered' ? (res.p1HighestBreak || 0) : 0) : (res.p2HighestBreak !== 'unremembered' ? (res.p2HighestBreak || 0) : 0);
            newStats.snooker = {
              ...u.stats.snooker,
              framesWon: u.stats.snooker.framesWon + frames,
              highestBreak: Math.max(u.stats.snooker.highestBreak, brk),
              matchesWon: won ? u.stats.snooker.matchesWon + 1 : u.stats.snooker.matchesWon,
            };
          }

          return {
            ...u,
            matchStatus: 'OYNAYACAK',
            stats: newStats,
            loyaltyHoursPlayed: u.loyaltyHoursPlayed + 1,
          };
        }
        return u;
      })
    );

    // Update current user copy if involved
    if (currentUser.id === match.senderId || currentUser.id === match.receiverId) {
      setCurrentUser(prev => ({
        ...prev,
        matchStatus: 'OYNAYACAK',
        loyaltyHoursPlayed: prev.loyaltyHoursPlayed + 1,
      }));
    }

    // Update head to head record
    const opponentId = currentUser.id === match.senderId ? match.receiverId : match.senderId;
    const opponent = users.find(u => u.id === opponentId);
    if (opponent) {
      setHeadToHead(prev => {
        const existing = prev.find(h => h.opponentId === opponentId && h.gameType === match.gameType);
        const didIWin = currentUser.id === res.winnerId;
        if (existing) {
          return prev.map(h =>
            h.opponentId === opponentId && h.gameType === match.gameType
              ? {
                  ...h,
                  matchesPlayed: h.matchesPlayed + 1,
                  myWins: didIWin ? h.myWins + 1 : h.myWins,
                  opponentWins: didIWin ? h.opponentWins : h.opponentWins + 1,
                  lastPlayedDate: 'Bugün',
                }
              : h
          );
        } else {
          return [
            ...prev,
            {
              opponentId,
              opponentName: opponent.name,
              opponentAvatar: opponent.avatar,
              gameType: match.gameType,
              matchesPlayed: 1,
              myWins: didIWin ? 1 : 0,
              opponentWins: didIWin ? 0 : 1,
              lastPlayedDate: 'Bugün',
            },
          ];
        }
      });
    }

    showToast('Maç onaylandı! İstatistikler ve salon masa durumu güncellendi.');
  };

  // Solo Practice recording (Bireysel antrenman ortalaması kaydetme)
  const recordSoloPractice = (gameType: '3_BANT' | 'KARAMBOL', points: number, innings: number, highestRun?: number, note?: string) => {
    if (innings <= 0) return;
    const avg = Number((points / innings).toFixed(3));
    const newRecord: SoloPracticeRecord = {
      id: `prac-${Date.now()}`,
      userId: currentUser.id,
      gameType,
      points,
      innings,
      average: avg,
      highestRun: highestRun || 0,
      date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
      note: note || (gameType === '3_BANT' ? 'Bireysel 3 Bant İsteka & Ortalama Antrenmanı' : 'Bireysel Karambol Antrenmanı'),
    };

    setSoloPracticeRecords(prev => [newRecord, ...prev]);

    setUsers(prev =>
      prev.map(u => {
        if (u.id === currentUser.id) {
          const is3B = gameType === '3_BANT';
          const prevStats = is3B ? u.stats.threeCushion : u.stats.carom;
          const totPts = prevStats.totalPoints + points;
          const totInn = prevStats.totalInnings + innings;
          const genAvg = Number((totPts / totInn).toFixed(3));
          const bestRun = Math.max(prevStats.highestRun, highestRun || 0);

          const updatedTarget = {
            totalPoints: totPts,
            totalInnings: totInn,
            generalAverage: genAvg,
            highestRun: bestRun,
            matchesCount: prevStats.matchesCount + 1,
          };

          const newStats = {
            ...u.stats,
            threeCushion: is3B ? updatedTarget : u.stats.threeCushion,
            carom: !is3B ? updatedTarget : u.stats.carom,
          };

          const updatedUser: User = {
            ...u,
            stats: newStats,
            loyaltyHoursPlayed: u.loyaltyHoursPlayed + 1,
          };

          setCurrentUser(updatedUser);
          return updatedUser;
        }
        return u;
      })
    );

    showToast(`Bireysel antrenman kaydedildi! Yeni Genel Ortalama: ${avg}`);
  };

  const toggleFriend = (userId: string) => {
    setFriends(prev => {
      const isFriend = prev.includes(userId);
      const next = isFriend ? prev.filter(id => id !== userId) : [...prev, userId];
      showToast(isFriend ? 'Kullanıcı arkadaş listesinden çıkarıldı.' : 'Kullanıcı arkadaş olarak eklendi!');
      return next;
    });
  };

  const toggleBlockUser = (userId: string) => {
    setBlockedUsers(prev => {
      const isBlocked = prev.includes(userId);
      const next = isBlocked ? prev.filter(id => id !== userId) : [...prev, userId];
      showToast(isBlocked ? 'Kullanıcının engeli kaldırıldı.' : 'Kullanıcı engellendi.');
      return next;
    });
  };

  const joinWeekendEvent = (eventId: string): boolean => {
    const ev = weekendEvents.find(e => e.id === eventId);
    if (!ev) return false;
    if (ev.isRegistered) {
      showToast('Bu hafta sonu etkinliğine zaten kayıtlısınız.');
      return false;
    }
    if (ev.registeredCount >= ev.capacity) {
      showToast('Kontenjan dolmuştur!');
      return false;
    }

    setWeekendEvents(prev =>
      prev.map(e => (e.id === eventId ? { ...e, registeredCount: e.registeredCount + 1, isRegistered: true } : e))
    );
    showToast(`"${ev.title}" etkinliğine kaydınız başarıyla alındı!`);
    return true;
  };

  // Order food / drinks
  const placeOrder = (order: Omit<SalonOrder, 'id' | 'createdAt' | 'status'>): SalonOrder => {
    const newOrder: SalonOrder = {
      ...order,
      id: `ord-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'ALINDI',
    };

    setOrders(prev => [newOrder, ...prev]);
    showToast('Siparişiniz salona iletildi! Ücret kasada ödenecektir.');
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: SalonOrder['status']) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status } : o))
    );
    showToast(`Sipariş durumu: ${status === 'KASADA_ODENDI_KAPATILDI' ? 'Ödendi ve Kapatıldı' : status}`);
  };

  // Chat message
  const sendMessage = (
    channelId: string,
    text: string,
    imageUrl?: string,
    replyToId?: string,
    videoUrl?: string,
    replyToText?: string,
    replyToSenderName?: string
  ) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      channelId,
      text,
      imageUrl,
      videoUrl,
      mediaType: videoUrl ? 'VIDEO' : imageUrl ? 'IMAGE' : 'TEXT',
      replyToId,
      replyToText,
      replyToSenderName,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, newMsg]);
  };

  const reportUserOrMessage = (
    reportedUserId: string,
    targetType: 'KULLANICI' | 'MESAJ',
    targetId: string,
    snippet: string,
    reason: string
  ) => {
    const newRep: ModerationReport = {
      id: `rep-${Date.now()}`,
      reporterUserId: currentUser.id,
      reportedUserId,
      targetType,
      targetId,
      contextSnippet: snippet,
      reason,
      createdAt: new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'INCELENIYOR',
    };

    setReports(prev => [newRep, ...prev]);
    showToast('Şikayetiniz BilardoGo yönetimine iletildi. Moderasyon ekibimiz inceleyecektir.');
  };

  // Business actions
  const updateSalonDetails = (updated: Partial<Salon>) => {
    if (!activeSalon) return;
    setSalons(prev =>
      prev.map(s => (s.id === activeSalon.id ? { ...s, ...updated } : s))
    );
    showToast('Salon bilgileri güncellendi.');
  };

  const addTableToSalon = (name: string, allowedGames: BilliardGameType[]) => {
    if (!activeSalon) return;
    const nextTableNum = activeSalon.tables.length + 1;
    const newTbl: SalonTable = {
      id: `tbl-${activeSalon.id}-${nextTableNum}`,
      salonId: activeSalon.id,
      tableNumber: nextTableNum,
      name: name || `Masa ${nextTableNum}`,
      allowedGames,
      status: 'BOS',
      qrCode: `BILARDOGO://SALON/${activeSalon.id}/TABLE/${nextTableNum}`,
    };

    setSalons(prev =>
      prev.map(s =>
        s.id === activeSalon.id ? { ...s, tables: [...s.tables, newTbl] } : s
      )
    );
    showToast(`Masa ${nextTableNum} başarıyla eklendi.`);
  };

  const removeTableFromSalon = (tableId: string) => {
    if (!activeSalon) return;
    setSalons(prev =>
      prev.map(s =>
        s.id === activeSalon.id
          ? { ...s, tables: s.tables.filter(t => t.id !== tableId) }
          : s
      )
    );
    showToast('Masa kaldırıldı.');
  };

  const toggleTableStatus = (tableId: string, status: 'BOS' | 'DOLU' | 'BAKIMDA') => {
    if (!activeSalon) return;
    setSalons(prev =>
      prev.map(s =>
        s.id === activeSalon.id
          ? {
              ...s,
              tables: s.tables.map(t =>
                t.id === tableId
                  ? {
                      ...t,
                      status,
                      currentMatchId: status === 'BOS' ? undefined : t.currentMatchId,
                      activePlayerNames: status === 'BOS' ? [] : t.activePlayerNames,
                    }
                  : t
              ),
            }
          : s
      )
    );
    showToast(`Masa durumu: ${status}`);
  };

  const toggleMenuItemAvailability = (menuItemId: string) => {
    if (!activeSalon) return;
    setSalons(prev =>
      prev.map(s =>
        s.id === activeSalon.id
          ? {
              ...s,
              menuItems: s.menuItems.map(m =>
                m.id === menuItemId ? { ...m, isAvailable: !m.isAvailable } : m
              ),
            }
          : s
      )
    );
  };

  const addSalonAnnouncement = (
    title: string,
    content: string,
    type: 'INDIRIM' | 'HABER' | 'ETKINLIK',
    validUntil: string
  ) => {
    if (!activeSalon) return;
    const newAnn = {
      id: `ann-${Date.now()}`,
      salonId: activeSalon.id,
      salonName: activeSalon.name,
      title,
      content,
      validUntil,
      type,
      createdAt: 'Bugün',
    };

    setSalons(prev =>
      prev.map(s =>
        s.id === activeSalon.id
          ? { ...s, announcements: [newAnn, ...s.announcements] }
          : s
      )
    );
    showToast('Duyuru/Kampanya salona eklendi.');
  };

  // Admin Actions
  const toggleUserActive = (userId: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );
    showToast('Kullanıcı durumu güncellendi.');
  };

  const banUser = (userId: string, reason: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, isBanned: true, banReason: reason } : u))
    );
    showToast('Kullanıcı sistemden yasaklandı.');
  };

  const unbanUser = (userId: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, isBanned: false, banReason: undefined } : u))
    );
    showToast('Kullanıcı yasağı kaldırıldı.');
  };

  const verifySalon = (salonId: string, status: Salon['verificationStatus']) => {
    setSalons(prev =>
      prev.map(s => (s.id === salonId ? { ...s, verificationStatus: status } : s))
    );
    showToast(`Salon başvuru durumu: ${status}`);
  };

  const createNewsItem = (item: Omit<BulletinNewsItem, 'id' | 'createdAt'>) => {
    const newItem: BulletinNewsItem = {
      ...item,
      id: `news-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('tr-TR'),
    };
    setNews(prev => [newItem, ...prev]);
    showToast('Bülten içeriği kaydedildi.');
  };

  const updateNewsStatus = (id: string, status: BulletinNewsItem['status']) => {
    setNews(prev =>
      prev.map(n => (n.id === id ? { ...n, status } : n))
    );
    showToast('İçerik yayın durumu güncellendi.');
  };

  const createTournament = (t: Omit<Tournament, 'id' | 'fixtures' | 'registeredUserIds'>) => {
    const newTourn: Tournament = {
      ...t,
      id: `tourn-${Date.now()}`,
      registeredUserIds: [currentUser.id],
      fixtures: [
        { id: 'f-1', round: 'Ceyrek Final', tableNumber: 1, matchTime: '13:00' },
        { id: 'f-2', round: 'Ceyrek Final', tableNumber: 2, matchTime: '14:30' },
        { id: 'f-3', round: 'Yari Final', tableNumber: 1, matchTime: '16:00' },
        { id: 'f-4', round: 'Final', tableNumber: 1, matchTime: '18:00' },
      ],
    };
    setTournaments(prev => [newTourn, ...prev]);
    showToast('Turnuva oluşturuldu ve yayına alındı!');
  };

  const joinTournament = (tournamentId: string): boolean => {
    const t = tournaments.find(x => x.id === tournamentId);
    if (!t) return false;
    if (t.registeredUserIds.includes(currentUser.id)) {
      showToast('Bu turnuvaya zaten kayıtlısınız.');
      return false;
    }
    if (t.registeredUserIds.length >= t.capacity) {
      showToast('Turnuva kontenjanı dolu!');
      return false;
    }

    setTournaments(prev =>
      prev.map(x =>
        x.id === tournamentId
          ? { ...x, registeredUserIds: [...x.registeredUserIds, currentUser.id] }
          : x
      )
    );
    showToast('Turnuva başvurunuz alındı! Katılım ücreti salonda ödenecektir.');
    return true;
  };

  const createAd = (ad: Omit<AdSponsorship, 'id'>) => {
    const newAd: AdSponsorship = {
      ...ad,
      id: `ad-${Date.now()}`,
    };
    setAds(prev => [newAd, ...prev]);
    showToast('Reklam / Sponsorluk yayına alındı.');
  };

  const resolveReport = (reportId: string, decision: 'ISLEM_YAPILDI' | 'REDDEDILDI') => {
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, status: decision } : r))
    );
    showToast(`Şikayet ${decision === 'ISLEM_YAPILDI' ? 'sonuçlandırıldı ve işlem yapıldı' : 'reddedildi'}.`);
  };

  const updateNotificationTemplate = (id: string, template: string) => {
    setNotificationTemplates(prev =>
      prev.map(nt => (nt.id === id ? { ...nt, template } : nt))
    );
    showToast('Bildirim şablonu güncellendi.');
  };

  const currentSalonId = selectedSalonId;
  const cafeOrders = orders;

  const updateTableStatus = (salonId: string, tableId: string, status: 'BOS' | 'DOLU' | 'BAKIMDA', playerNames?: string[]) => {
    setSalons(prev =>
      prev.map(s => {
        if (s.id !== salonId) return s;
        return {
          ...s,
          tables: s.tables.map(t => {
            if (t.id !== tableId) return t;
            return {
              ...t,
              status,
              activePlayerNames: status === 'DOLU' ? (playerNames || ['Misafir 1', 'Misafir 2']) : undefined,
              elapsedMinutes: status === 'DOLU' ? (t.elapsedMinutes || 25) : 0,
            };
          }),
        };
      })
    );
    showToast(`Masa durumu güncellendi: ${status}`);
  };

  const updateCafeOrderStatus = (orderId: string, status: any) => {
    updateOrderStatus(orderId, status);
  };

  const placeCafeOrder = (orderData: any): SalonOrder => {
    return placeOrder({
      salonId: orderData.salonId,
      salonName: salons.find(s => s.id === orderData.salonId)?.name || 'Salon',
      type: 'BIREYSEL',
      tableNumber: orderData.tableNumber,
      locationDescription: `Masa ${orderData.tableNumber}`,
      customerName: orderData.userName || currentUser.name,
      customerId: orderData.userId || currentUser.id,
      items: orderData.items.map((i: any) => ({
        orderedBy: orderData.userName || currentUser.name,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      totalPrice: orderData.totalAmount,
      orderNote: orderData.note,
    });
  };

  const addAnnouncement = (salonId: string, ann: any) => {
    const sName = salons.find(s => s.id === salonId)?.name || 'Salon';
    setSalons(prev =>
      prev.map(s => {
        if (s.id !== salonId) return s;
        const newAnn = {
          id: `ann-${Date.now()}`,
          salonId,
          salonName: sName,
          title: ann.title,
          content: ann.content,
          type: ann.type || 'HABER',
          validUntil: ann.validUntil || '2026-12-31',
          createdAt: new Date().toISOString().split('T')[0],
        };
        return { ...s, announcements: [newAnn, ...s.announcements] };
      })
    );
    showToast('Duyuru yayınlandı.');
  };

  const toggleAdStatus = (adId: string) => {
    setAds(prev =>
      prev.map(a => (a.id === adId ? { ...a, isActive: !a.isActive } : a))
    );
    showToast('Reklam yayın durumu güncellendi.');
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        currentUser,
        setCurrentUser,
        selectedCity,
        setSelectedCity,
        activeView,
        setActiveView,
        selectedSalonId,
        setSelectedSalonId,
        currentSalonId,
        users,
        salons,
        matches,
        tournaments,
        orders,
        cafeOrders,
        news,
        ads,
        reports,
        notificationTemplates,
        loyaltyRewards,
        chatMessages,
        headToHead,
        soloPracticeRecords,
        weekendEvents,
        friends,
        blockedUsers,
        toggleFriend,
        toggleBlockUser,
        joinWeekendEvent,
        updatePresenceStatus,
        updateMatchStatus,
        sendMatchRequest,
        respondToMatchRequest,
        startMatchOnTable,
        quickJoinTableWithoutMatch,
        submitMatchResult,
        confirmMatchResult,
        recordSoloPractice,
        placeOrder,
        placeCafeOrder,
        updateOrderStatus,
        updateCafeOrderStatus,
        sendMessage,
        reportUserOrMessage,
        activeSalon,
        updateSalonDetails,
        addTableToSalon,
        removeTableFromSalon,
        toggleTableStatus,
        updateTableStatus,
        toggleMenuItemAvailability,
        addSalonAnnouncement,
        addAnnouncement,
        toggleUserActive,
        banUser,
        unbanUser,
        verifySalon,
        createNewsItem,
        updateNewsStatus,
        createTournament,
        joinTournament,
        createAd,
        toggleAdStatus,
        resolveReport,
        updateNotificationTemplate,
        activeMatch,
        pendingRequestsForMe,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
