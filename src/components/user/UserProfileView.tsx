import React, { useState } from 'react';
import {
  User as UserIcon,
  Award,
  Flame,
  Clock,
  Swords,
  Trophy,
  History,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  Plus,
  Shield,
  Layers,
  Store,
  Check,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BilliardGameType, SoloPracticeRecord } from '../../types';

export const UserProfileView: React.FC = () => {
  const {
    currentUser,
    users,
    headToHead,
    matches,
    soloPracticeRecords,
    recordSoloPractice,
    salons,
    loyaltyRewards,
    showToast,
    setActiveView,
    setCurrentRole,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'istatistikler' | 'rakip_gecmisi' | 'son_maclar' | 'manuel_gecmis' | 'salonlar'>('istatistikler');
  const [selectedH2hGame, setSelectedH2hGame] = useState<BilliardGameType | 'ALL'>('ALL');
  const [showSoloPracticeModal, setShowSoloPracticeModal] = useState(false);
  const [practiceGame, setPracticeGame] = useState<'3_BANT' | 'KARAMBOL'>('3_BANT');
  const [practicePoints, setPracticePoints] = useState<number>(30);
  const [practiceInnings, setPracticeInnings] = useState<number>(28);
  const [practiceRun, setPracticeRun] = useState<number>(7);
  const [practiceNote, setPracticeNote] = useState<string>('');

  const winRate = currentUser.stats.totalMatches > 0
    ? Math.round((currentUser.stats.wins / currentUser.stats.totalMatches) * 100)
    : 0;

  // Filter H2H
  const filteredH2H = headToHead.filter(
    h => selectedH2hGame === 'ALL' || h.gameType === selectedH2hGame
  );

  // Recent matches for this user
  const recentMatches = matches.filter(
    m => m.senderId === currentUser.id || m.receiverId === currentUser.id
  );

  // Preferred / Favorite Salons
  const preferredSalons = salons.slice(0, 3);

  const handleSavePractice = () => {
    if (practiceInnings <= 0) {
      showToast('İsteka sayısı 0 veya negatif olamaz!');
      return;
    }
    if (practicePoints < 0) {
      showToast('Sayı negatif olamaz!');
      return;
    }
    recordSoloPractice(practiceGame, practicePoints, practiceInnings, practiceRun, practiceNote);
    setShowSoloPracticeModal(false);
    setPracticeNote('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Profile Header Card */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-3xl object-cover border-2 border-amber-500/40 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-400">
                <Award className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                  {currentUser.name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                  {currentUser.level}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="text-neutral-300 font-medium">@{currentUser.username}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentUser.city}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-amber-400 font-semibold">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>{currentUser.consistencyStreakDays} Gün Bilardo Devamlılığı</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-emerald-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentUser.loyaltyHoursPlayed} Saat Masa Süresi</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowSoloPracticeModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Manuel Ortalama / Antrenman Ekle</span>
            </button>
          </div>
        </div>

        {/* Played Games Tags */}
        <div className="mt-5 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-400 font-medium">Oynadığı Türler:</span>
          <div className="flex flex-wrap gap-1.5">
            {currentUser.playedGames.map(game => (
              <span
                key={game}
                className="px-2.5 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px] font-semibold"
              >
                {game.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('istatistikler')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'istatistikler'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          Ortalamalar & İstatistikler
        </button>

        <button
          onClick={() => setActiveTab('rakip_gecmisi')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'rakip_gecmisi'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          <span>Rakip Geçmişi (H2H)</span>
        </button>

        <button
          onClick={() => setActiveTab('son_maclar')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'son_maclar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Son Maçlar ({recentMatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('manuel_gecmis')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'manuel_gecmis'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Manuel Ortalama Geçmişi ({soloPracticeRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('salonlar')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'salonlar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Tercih Edilen Salonlar ({preferredSalons.length})</span>
        </button>
      </div>

      {/* TAB 1: İSTATİSTİKLER & ORTALAMALAR */}
      {activeTab === 'istatistikler' && (
        <div className="space-y-5">
          {/* 3 Bant ve Karambol Ortalamaları (3 Ondalık Kuralı) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 3 Bant Ortalama Kartı */}
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    3B
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">3 Bant Genel Ortalama</h3>
                    <p className="text-[11px] text-neutral-400">Resmi Sayı / İsteka Hesaplaması</p>
                  </div>
                </div>
                <span className="text-2xl font-extrabold text-amber-400 font-mono">
                  {currentUser.stats.threeCushion.generalAverage.toFixed(3)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Toplam Sayı</span>
                  <span className="font-bold text-white mt-0.5 block">{currentUser.stats.threeCushion.totalPoints}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Toplam İsteka</span>
                  <span className="font-bold text-white mt-0.5 block">{currentUser.stats.threeCushion.totalInnings}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">En Yüksek Seri</span>
                  <span className="font-bold text-amber-400 mt-0.5 block">{currentUser.stats.threeCushion.highestRun}</span>
                </div>
              </div>
            </div>

            {/* Karambol Ortalama Kartı */}
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    KR
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Karambol Genel Ortalama</h3>
                    <p className="text-[11px] text-neutral-400">Resmi Sayı / İsteka Hesaplaması</p>
                  </div>
                </div>
                <span className="text-2xl font-extrabold text-blue-400 font-mono">
                  {currentUser.stats.carom.generalAverage.toFixed(3)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Toplam Sayı</span>
                  <span className="font-bold text-white mt-0.5 block">{currentUser.stats.carom.totalPoints}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Toplam İsteka</span>
                  <span className="font-bold text-white mt-0.5 block">{currentUser.stats.carom.totalInnings}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">En Yüksek Seri</span>
                  <span className="font-bold text-blue-400 mt-0.5 block">{currentUser.stats.carom.highestRun}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kariyer Maç Bilgileri & Başarı Oranı */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Kariyer Maç Bilgileri & Başarı Oranı
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[11px]">Toplam Maç</span>
                <span className="text-xl font-bold text-white mt-1 block font-mono">
                  {currentUser.stats.totalMatches}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[11px]">Kazanılan Maçlar</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block font-mono">
                  {currentUser.stats.wins}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[11px]">Kaybedilen Maçlar</span>
                <span className="text-xl font-bold text-red-400 mt-1 block font-mono">
                  {currentUser.stats.losses}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[11px]">Kazanma Oranı</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block font-mono">
                  %{winRate}
                </span>
              </div>
            </div>
          </div>

          {/* Oyun Türüne Göre İstatistikler */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Oyun Türüne Göre İstatistikler
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>3 Bant</span>
                  <span className="text-amber-400 font-mono font-extrabold">{currentUser.stats.threeCushion.generalAverage.toFixed(3)}</span>
                </div>
                <div className="text-neutral-400 text-[11px] pt-1 flex justify-between">
                  <span>Maç Sayısı:</span>
                  <span className="text-white font-semibold">{currentUser.stats.threeCushion.matchesCount}</span>
                </div>
                <div className="text-neutral-400 text-[11px] flex justify-between">
                  <span>En Yüksek Seri:</span>
                  <span className="text-amber-400 font-semibold">{currentUser.stats.threeCushion.highestRun}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Karambol</span>
                  <span className="text-blue-400 font-mono font-extrabold">{currentUser.stats.carom.generalAverage.toFixed(3)}</span>
                </div>
                <div className="text-neutral-400 text-[11px] pt-1 flex justify-between">
                  <span>Maç Sayısı:</span>
                  <span className="text-white font-semibold">{currentUser.stats.carom.matchesCount}</span>
                </div>
                <div className="text-neutral-400 text-[11px] flex justify-between">
                  <span>En Yüksek Seri:</span>
                  <span className="text-blue-400 font-semibold">{currentUser.stats.carom.highestRun}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Amerikan / 9 Top</span>
                  <span className="text-emerald-400 font-mono font-extrabold">%68 Galibiyet</span>
                </div>
                <div className="text-neutral-400 text-[11px] pt-1 flex justify-between">
                  <span>Toplam El:</span>
                  <span className="text-white font-semibold">44 Frame</span>
                </div>
                <div className="text-neutral-400 text-[11px] flex justify-between">
                  <span>Kazanılan:</span>
                  <span className="text-emerald-400 font-semibold">30 Frame</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RAKİP GEÇMİŞİ (HEAD-TO-HEAD) */}
      {activeTab === 'rakip_gecmisi' && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-500" />
                Oyuncu-Oyuncu Karşılıklı Maç Geçmişi
              </h3>
              <p className="text-xs text-neutral-400">
                Karşılıklı onaylanmış resmi maçların oyuncu bazında tutulan net skoru.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {(['ALL', '3_BANT', 'KARAMBOL', 'AMERIKAN'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedH2hGame(g)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                    selectedH2hGame === g
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {g === 'ALL' ? 'Tümü' : g.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredH2H.map((record, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={record.opponentAvatar}
                    alt={record.opponentName}
                    className="w-12 h-12 rounded-xl object-cover border border-neutral-700"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-white">{record.opponentName}</h4>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                      <span className="text-amber-400 font-medium">{record.gameType.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>Son Karşılaşma: {record.lastPlayedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-white">
                    <span className="text-emerald-400">{record.myWins} Galibiyet</span>
                    <span className="text-neutral-500 mx-1.5">-</span>
                    <span className="text-red-400">{record.opponentWins} Mağlubiyet</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    {record.matchesPlayed} Toplam Karşılaşma
                  </span>
                </div>
              </div>
            ))}

            {filteredH2H.length === 0 && (
              <div className="p-8 text-center text-xs text-neutral-500">
                Bu oyun türünde karşılıklı maç kaydı bulunmuyor.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SON MAÇLAR */}
      {activeTab === 'son_maclar' && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              Son Oynanan Maçlar
            </h3>
            <span className="text-xs text-neutral-400">Onaylanmış maç tutanakları</span>
          </div>

          <div className="space-y-3">
            {recentMatches.map(m => {
              const isSender = m.senderId === currentUser.id;
              const opponentId = isSender ? m.receiverId : m.senderId;
              const opponent = users.find(u => u.id === opponentId);
              const opponentName = opponent?.name || (isSender ? 'Rakip Oyuncu' : 'Davet Eden');
              const matchSalon = salons.find(s => s.id === m.salonId);
              const isWon = m.result?.winnerId === currentUser.id;
              const myScore = m.result ? (isSender ? m.result.p1Score : m.result.p2Score) : m.targetScoreOrRacks;
              const opponentScore = m.result ? (isSender ? m.result.p2Score : m.result.p1Score) : 0;

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        isWon ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {isWon ? 'GALİBİYET' : 'MAĞLUBİYET'}
                      </span>
                      <span className="text-xs text-amber-400 font-semibold">{m.gameType.replace('_', ' ')}</span>
                      <span className="text-xs text-neutral-500">• {matchSalon?.name || 'Bilardo Salonu'}</span>
                    </div>

                    <div className="text-sm font-bold text-white">
                      vs {opponentName}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {m.targetInnings ? `${m.targetInnings} İsteka Sınırı` : `${m.targetScoreOrRacks} Sayı Hedefi`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-mono font-extrabold text-white">
                      <span className={isWon ? 'text-emerald-400' : 'text-neutral-300'}>{myScore}</span>
                      <span className="text-neutral-500 mx-1">-</span>
                      <span className={!isWon ? 'text-emerald-400' : 'text-neutral-300'}>{opponentScore}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      {new Date(m.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              );
            })}

            {recentMatches.length === 0 && (
              <div className="p-8 text-center text-xs text-neutral-500">
                Henüz kayıtlı maç bulunmuyor. Salonda QR kod okutarak veya maç teklif ederek başlayabilirsiniz!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MANUEL ORTALAMA GEÇMİŞİ (Bireysel Antrenman Kayıtları) */}
      {activeTab === 'manuel_gecmis' && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                Manuel Ortalama & Bireysel Antrenman Geçmişi
              </h3>
              <p className="text-xs text-neutral-400">
                Kendi antrenmanlarınızda aldığınız sayı ve istekaları kaydedip ortalamanızı düzenli takip edin.
              </p>
            </div>

            <button
              onClick={() => setShowSoloPracticeModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Antrenman Ekle</span>
            </button>
          </div>

          <div className="space-y-3">
            {soloPracticeRecords.map(rec => (
              <div
                key={rec.id}
                className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {rec.gameType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-neutral-400">{rec.date}</span>
                  </div>
                  <div className="text-xs text-white font-medium">{rec.note || 'Bireysel Antrenman'}</div>
                  <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-3">
                    <span>Sayı: <strong className="text-white">{rec.points}</strong></span>
                    <span>İsteka: <strong className="text-white">{rec.innings}</strong></span>
                    <span>En Yüksek Seri: <strong className="text-amber-400">{rec.highestRun}</strong></span>
                  </div>
                </div>

                <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Hesaplanan Ortalama</span>
                  <span className="text-xl font-mono font-extrabold text-amber-400 block">
                    {rec.average.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}

            {soloPracticeRecords.length === 0 && (
              <div className="p-8 text-center text-xs text-neutral-500">
                Henüz kayıtlı bireysel antrenman bulunmuyor. "Yeni Antrenman Ekle" butonuna basarak ilk kaydınızı girin!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TERCİH EDİLEN SALONLAR */}
      {activeTab === 'salonlar' && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-500" />
                Tercih Edilen / Favori Salonlar
              </h3>
              <p className="text-xs text-neutral-400">En sık maç yaptığınız ve sadakat süresi biriktirdiğiniz kulüpler.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {preferredSalons.map(salon => (
              <div
                key={salon.id}
                className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-3 shadow-md"
              >
                <div>
                  <div className="h-28 rounded-xl overflow-hidden mb-3 relative">
                    <img
                      src={salon.coverImage}
                      alt={salon.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-amber-400">
                      ★ {salon.rating}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{salon.name}</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                    <span>{salon.district}, {salon.city}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-800 text-xs flex items-center justify-between">
                  <span className="text-emerald-400 font-medium">Açık ({salon.openHours})</span>
                  <span className="text-neutral-400">{salon.tables.length} Masa</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Yönetim & İşletme Panellerine Geçiş */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            Yönetim & İşletme Panelleri
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Salon yetkilileri, çalışanlar ve sistem yöneticileri için yönetim ekranlarına buradan doğrudan geçiş yapabilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <button
            onClick={() => {
              setActiveView('business_auth');
              window.location.hash = 'salon';
            }}
            className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 transition-all text-left flex items-start gap-3.5 group shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span>Salon İşletme Girişi / Kaydı</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">/salon</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                İşletme hesabı oluşturma, masa ekleme, saat ücreti, menü & sipariş ve profil yönetimi.
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveView('admin_auth');
              window.location.hash = 'admin';
            }}
            className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-red-500/50 transition-all text-left flex items-start gap-3.5 group shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                <span>Süper Admin Girişi / Kaydı</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">/admin</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Platform geneli salon onayları, şikayet & moderasyon takibi, sponsorluk ve reklam yönetimi.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Solo Practice Entry Modal */}
      {showSoloPracticeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                Bireysel Antrenman Ortalaması Kaydet
              </h3>
              <button
                onClick={() => setShowSoloPracticeModal(false)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                Vazgeç
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1.5 font-medium">Disiplin Seçimi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPracticeGame('3_BANT')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      practiceGame === '3_BANT'
                        ? 'bg-amber-500 text-neutral-950 border-amber-500'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    3 Bant
                  </button>
                  <button
                    type="button"
                    onClick={() => setPracticeGame('KARAMBOL')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      practiceGame === 'KARAMBOL'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    Karambol
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">Yapılan Sayı</label>
                  <input
                    type="number"
                    min="0"
                    value={practicePoints}
                    onChange={e => setPracticePoints(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">İsteka Sayısı</label>
                  <input
                    type="number"
                    min="1"
                    value={practiceInnings}
                    onChange={e => setPracticeInnings(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">En Yüksek Seri</label>
                  <input
                    type="number"
                    min="0"
                    value={practiceRun}
                    onChange={e => setPracticeRun(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Calculated preview */}
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400">Hesaplanan Ortalama:</span>
                <span className="text-base font-mono font-extrabold text-amber-400">
                  {practiceInnings > 0 ? (practicePoints / practiceInnings).toFixed(3) : '0.000'}
                </span>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-medium">Antrenman Notu (İsteğe bağlı)</label>
                <input
                  type="text"
                  placeholder="Örn: Bant bağlantı vuruşları, pikaj denemeleri..."
                  value={practiceNote}
                  onChange={e => setPracticeNote(e.target.value)}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={handleSavePractice}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition-all"
            >
              Antrenmanı Kaydet ve Genel Ortalamayı Güncelle
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
