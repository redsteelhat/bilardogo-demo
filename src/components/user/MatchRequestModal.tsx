import React, { useState } from 'react';
import { X, Swords, Plus, Minus, Send, Clock, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, BilliardGameType } from '../../types';

interface MatchRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponent: User;
  initialGameType?: BilliardGameType;
}

export const MatchRequestModal: React.FC<MatchRequestModalProps> = ({
  isOpen,
  onClose,
  opponent,
  initialGameType = '3_BANT',
}) => {
  const { salons, sendMatchRequest, currentUser, showToast } = useApp();

  const [gameType, setGameType] = useState<BilliardGameType>(initialGameType);
  const [salonId, setSalonId] = useState<string>(opponent.currentSalonId || 'salon-fbn');
  const [scheduleType, setScheduleType] = useState<'HEMEN' | 'BELIRLI_SAAT'>('HEMEN');
  const [scheduledTime, setScheduledTime] = useState('18:00');

  // Format controls
  const [targetScore, setTargetScore] = useState<number>(30);
  const [targetInnings, setTargetInnings] = useState<number>(40);
  const [targetRacks, setTargetRacks] = useState<number>(7);
  const [targetFrames, setTargetFrames] = useState<number>(5);
  const [highestBreakTarget, setHighestBreakTarget] = useState<number>(75);

  // Handicap
  const [hasHandicap, setHasHandicap] = useState(false);
  const [myHandicap, setMyHandicap] = useState(0);
  const [opponentHandicap, setOpponentHandicap] = useState(0);

  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const targetScoreOrRacks =
      gameType === '3_BANT' || gameType === 'KARAMBOL'
        ? targetScore
        : gameType === 'SNOOKER'
        ? targetFrames
        : targetRacks;

    try {
      sendMatchRequest({
        senderId: currentUser.id,
        receiverId: opponent.id,
        salonId,
        gameType,
        scheduleType,
        scheduledTime: scheduleType === 'BELIRLI_SAAT' ? scheduledTime : undefined,
        targetScoreOrRacks,
        targetInnings: gameType === '3_BANT' || gameType === 'KARAMBOL' ? targetInnings : undefined,
        hasHandicap,
        senderHandicap: hasHandicap ? myHandicap : 0,
        receiverHandicap: hasHandicap ? opponentHandicap : 0,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      // toast shown in context
    }
  };

  const gameTypes: { type: BilliardGameType; label: string }[] = [
    { type: '3_BANT', label: '3 Bant' },
    { type: 'KARAMBOL', label: 'Karambol' },
    { type: 'AMERIKAN', label: 'Amerikan' },
    { type: 'DOKUZ_TOP', label: '9 Top' },
    { type: 'SNOOKER', label: 'Snooker' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-neutral-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Maç İsteği Gönder</h3>
              <p className="text-xs text-neutral-400">Oyun formatı ve handikap kurallarını belirleyin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Rakip Kartı */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={opponent.avatar}
                alt={opponent.name}
                className="w-11 h-11 rounded-xl object-cover border border-neutral-700"
              />
              <div>
                <div className="font-bold text-sm text-white">{opponent.name}</div>
                <div className="text-neutral-400 text-[11px]">
                  {opponent.salonStatus === 'SALONDA' ? '🟢 Salonda' : '🟡 Gelecek'} • {opponent.level}
                </div>
              </div>
            </div>
            <span className="text-amber-400 text-xs font-semibold px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
              Rakip
            </span>
          </div>

          {/* Bilardo Türü Seçimi */}
          <div className="space-y-1.5">
            <label className="font-bold text-white block">Bilardo Türü</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {gameTypes.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setGameType(type)}
                  className={`py-2 px-1 rounded-xl font-bold text-center transition-all ${
                    gameType === type
                      ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Oyuna Özel Format Kuralları (Screenshots on pages 6 & 7) */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3.5">
            <div className="font-bold text-neutral-200 border-b border-neutral-800 pb-2">
              Oyun Formatı Ayarları
            </div>

            {(gameType === '3_BANT' || gameType === 'KARAMBOL') && (
              <>
                {/* Hedef Sayı */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">Hedef Sayı</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetScore(Math.max(10, targetScore - 5))}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-amber-400">{targetScore}</span>
                    <button
                      type="button"
                      onClick={() => setTargetScore(targetScore + 5)}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* İsteka Sayısı */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">İsteka Sayısı (Maksimum)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetInnings(Math.max(15, targetInnings - 5))}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-white">{targetInnings}</span>
                    <button
                      type="button"
                      onClick={() => setTargetInnings(targetInnings + 5)}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {(gameType === 'AMERIKAN' || gameType === 'DOKUZ_TOP') && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-300 font-medium">Hedef Rack (Kazanılacak Set)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetRacks(Math.max(3, targetRacks - 1))}
                    className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-amber-400">{targetRacks}</span>
                  <button
                    type="button"
                    onClick={() => setTargetRacks(targetRacks + 1)}
                    className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {gameType === 'SNOOKER' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">Hedef Frame</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetFrames(Math.max(1, targetFrames - 1))}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-amber-400">{targetFrames}</span>
                    <button
                      type="button"
                      onClick={() => setTargetFrames(targetFrames + 1)}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">En Yüksek Break Hedefi (Opsiyonel)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHighestBreakTarget(Math.max(25, highestBreakTarget - 5))}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-white">{highestBreakTarget}</span>
                    <button
                      type="button"
                      onClick={() => setHighestBreakTarget(highestBreakTarget + 5)}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Handikap Toggle */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
              <span className="text-neutral-300 font-medium">Handikap Durumu</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHasHandicap(false)}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    !hasHandicap ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Yok
                </button>
                <button
                  type="button"
                  onClick={() => setHasHandicap(true)}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    hasHandicap ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Var
                </button>
              </div>
            </div>

            {hasHandicap && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Benim Handikapım:</span>
                  <input
                    type="number"
                    value={myHandicap}
                    onChange={e => setMyHandicap(Number(e.target.value))}
                    className="w-16 text-center bg-neutral-900 border border-neutral-800 rounded-lg py-1 text-white font-bold"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">{opponent.name} (Handikap):</span>
                  <input
                    type="number"
                    value={opponentHandicap}
                    onChange={e => setOpponentHandicap(Number(e.target.value))}
                    className="w-16 text-center bg-neutral-900 border border-neutral-800 rounded-lg py-1 text-white font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Salon Seçimi */}
          <div className="space-y-1.5">
            <label className="font-bold text-white block">Maç Yapılacak Salon</label>
            <select
              value={salonId}
              onChange={e => setSalonId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              {salons.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.city} - {s.district})</option>
              ))}
            </select>
          </div>

          {/* Zamanlama: Hemen / Belirli Saat */}
          <div className="space-y-1.5">
            <label className="font-bold text-white block">Zaman</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('HEMEN')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                  scheduleType === 'HEMEN'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                Hemen Oyna
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('BELIRLI_SAAT')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                  scheduleType === 'BELIRLI_SAAT'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                Belirli Saat
              </button>
            </div>
            {scheduleType === 'BELIRLI_SAAT' && (
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full mt-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* Not / Mesaj (Opsiyonel) */}
          <div className="space-y-1.5">
            <label className="font-bold text-white block">Not (Opsiyonel)</label>
            <input
              type="text"
              placeholder="Rakibe iletmek istediğiniz mesaj..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Maç İsteğini Gönder</span>
          </button>
        </div>

      </div>
    </div>
  );
};
