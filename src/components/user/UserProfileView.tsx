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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BilliardGameType } from '../../types';

export const UserProfileView: React.FC = () => {
  const {
    currentUser,
    headToHead,
    recordSoloPractice,
    salons,
    loyaltyRewards,
    showToast,
  } = useApp();

  const [selectedH2hGame, setSelectedH2hGame] = useState<BilliardGameType | 'ALL'>('ALL');
  const [showSoloPracticeModal, setShowSoloPracticeModal] = useState(false);
  const [practiceGame, setPracticeGame] = useState<'3_BANT' | 'KARAMBOL'>('3_BANT');
  const [practicePoints, setPracticePoints] = useState<number>(30);
  const [practiceInnings, setPracticeInnings] = useState<number>(28);
  const [practiceRun, setPracticeRun] = useState<number>(7);

  const winRate = currentUser.stats.totalMatches > 0
    ? Math.round((currentUser.stats.wins / currentUser.stats.totalMatches) * 100)
    : 0;

  const filteredH2H = headToHead.filter(
    h => selectedH2hGame === 'ALL' || h.gameType === selectedH2hGame
  );

  const handleSavePractice = () => {
    if (practiceInnings <= 0) {
      showToast('İsteka sayısı 0 olamaz!');
      return;
    }
    recordSoloPractice(practiceGame, practicePoints, practiceInnings, practiceRun);
    setShowSoloPracticeModal(false);
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
              <span className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800 text-amber-400">
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
                <span>@{currentUser.username}</span>
                <span>•</span>
                <MapPin className="w-3 h-3 text-neutral-500" />
                <span>{currentUser.city}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-amber-400 font-semibold">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>{currentUser.consistencyStreakDays} Gün Devamlılık</span>
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
              <span>Bireysel Antrenman Kaydet</span>
            </button>
          </div>
        </div>

        {/* Played Games Tags */}
        <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center gap-2 text-xs">
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

      {/* 2. Official 3-Cushion & Carom Averages (3 Ondalık Kuralı) */}
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

      {/* 3. Overall Matches Record & Win Rate */}
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
            <span className="text-neutral-500 block text-[11px]">Galibiyet</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block font-mono">
              {currentUser.stats.wins}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 block text-[11px]">Mağlubiyet</span>
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

      {/* 4. Head-to-Head Opponent Records (Page 11: "Oyuncu-Oyuncu Karşılıklı Maç Geçmişi") */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-500" />
              Karşılıklı Maç Geçmişi (Head-to-Head)
            </h3>
            <p className="text-xs text-neutral-400">
              Yalnızca rakip tarafından onaylanmış resmi maç kayıtları baz alınır.
            </p>
          </div>

          {/* Filter by Game Type */}
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

        {/* Opponents List */}
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
                  className="w-11 h-11 rounded-xl object-cover border border-neutral-700"
                />
                <div>
                  <h4 className="font-bold text-sm text-white">{record.opponentName}</h4>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span className="text-amber-400/90 font-medium">{record.gameType.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>Son Maç: {record.lastPlayedDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-white">
                    <span className="text-emerald-400">{record.myWins}G</span>
                    <span className="text-neutral-500 mx-1">-</span>
                    <span className="text-red-400">{record.opponentWins}M</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {record.matchesPlayed} Maç Oynandı
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredH2H.length === 0 && (
            <div className="p-6 text-center text-xs text-neutral-500">
              Bu filtrede onaylanmış karşılıklı maç kaydı bulunamadı.
            </div>
          )}
        </div>
      </div>

      {/* 5. Loyalty & Rewards Program (Masa Süresi Takibi) */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base text-white">Sadakat & Ödül Hedefleri</h3>
          </div>
          <span className="text-xs font-semibold text-amber-400">
            {currentUser.loyaltyHoursPlayed} Saat Doğrulandı
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {loyaltyRewards.map(rew => {
            const isCompleted = currentUser.loyaltyHoursPlayed >= rew.hoursRequired;
            const progress = Math.min(100, Math.round((currentUser.loyaltyHoursPlayed / rew.hoursRequired) * 100));

            return (
              <div
                key={rew.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                  isCompleted
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{rew.title}</span>
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">{rew.description}</p>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                    <span>İlerleme: {progress}%</span>
                    <span>{currentUser.loyaltyHoursPlayed}/{rew.hoursRequired} Saat</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Solo Practice Modal */}
      {showSoloPracticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-base text-white">Bireysel Antrenman Kaydet</h4>
              <button onClick={() => setShowSoloPracticeModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Disiplin</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPracticeGame('3_BANT')}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      practiceGame === '3_BANT' ? 'bg-amber-500 text-neutral-950 border-amber-500' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    3 Bant
                  </button>
                  <button
                    onClick={() => setPracticeGame('KARAMBOL')}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      practiceGame === 'KARAMBOL' ? 'bg-amber-500 text-neutral-950 border-amber-500' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Karambol
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Sayı</label>
                  <input
                    type="number"
                    value={practicePoints}
                    onChange={e => setPracticePoints(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 text-center text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">İsteka</label>
                  <input
                    type="number"
                    value={practiceInnings}
                    onChange={e => setPracticeInnings(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 text-center text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Seri</label>
                  <input
                    type="number"
                    value={practiceRun}
                    onChange={e => setPracticeRun(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 text-center text-white font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-neutral-300">
                Bu antrenman ortalamanız: <strong className="text-amber-400 font-mono">{(practicePoints / (practiceInnings || 1)).toFixed(3)}</strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSoloPracticeModal(false)}
                className="px-4 py-2 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleSavePractice}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md"
              >
                Ortalamaya Ekle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
