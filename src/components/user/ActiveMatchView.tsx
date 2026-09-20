import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Swords,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Minus,
  Trophy,
  Utensils,
  Share2,
  RefreshCw,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BilliardGameType, MatchResult } from '../../types';

interface ActiveMatchViewProps {
  onOpenQrScanner: () => void;
  onOpenOrder: () => void;
}

export const ActiveMatchView: React.FC<ActiveMatchViewProps> = ({
  onOpenQrScanner,
  onOpenOrder,
}) => {
  const {
    activeMatch,
    currentUser,
    users,
    salons,
    respondToMatchRequest,
    submitMatchResult,
    confirmMatchResult,
    pendingRequestsForMe,
    startMatchOnTable,
    showToast,
    setActiveView,
  } = useApp();

  // Local scoreboard counters during live match
  const [p1LiveScore, setP1LiveScore] = useState<number>(() => activeMatch?.result?.p1Score || 15);
  const [p2LiveScore, setP2LiveScore] = useState<number>(() => activeMatch?.result?.p2Score || 12);
  const [liveInnings, setLiveInnings] = useState<number>(() => activeMatch?.result?.innings || 14);
  const [p1Run, setP1Run] = useState<number>(5);
  const [p2Run, setP2Run] = useState<number>(4);
  const [p1RunUnremembered, setP1RunUnremembered] = useState(false);
  const [p2RunUnremembered, setP2RunUnremembered] = useState(false);

  // Result dialog state
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Pending match invites waiting for response
  if (!activeMatch && pendingRequestsForMe.length > 0) {
    const invite = pendingRequestsForMe[0];
    const sender = users.find(u => u.id === invite.senderId);
    const salon = salons.find(s => s.id === invite.salonId);

    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-150">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Yeni Maç Teklifi Geldi!</h3>
              <p className="text-xs text-neutral-400">{sender?.name} size maç teklifinde bulundu.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Rakip:</span>
              <span className="font-bold text-white text-sm">{sender?.name} ({sender?.level})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Oyun Türü:</span>
              <span className="font-bold text-amber-400">{invite.gameType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Hedef:</span>
              <span className="font-bold text-white">{invite.targetScoreOrRacks} {invite.gameType === '3_BANT' ? 'Sayı' : 'Rack'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Salon:</span>
              <span className="font-medium text-neutral-300">{salon?.name}</span>
            </div>
            {invite.note && (
              <div className="pt-2 border-t border-neutral-800 text-neutral-300 italic">
                "{invite.note}"
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => respondToMatchRequest(invite.id, false)}
              className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors"
            >
              Reddet
            </button>
            <button
              onClick={() => respondToMatchRequest(invite.id, true)}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/25"
            >
              Kabul Et (Maç Yapacak)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeMatch) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 text-neutral-600 flex items-center justify-center mx-auto">
          <Swords className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white">Şu Anda Aktif Maçınız Yok</h3>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
          Şehirdeki bir salona gidip salondaki oyunculara maç teklifi gönderebilir veya masadaki QR kodu okutabilirsiniz.
        </p>
        <button
          onClick={() => setActiveView('home')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md"
        >
          Salonları Keşfet
        </button>
      </div>
    );
  }

  const p1 = users.find(u => u.id === activeMatch.senderId);
  const p2 = users.find(u => u.id === activeMatch.receiverId);
  const salon = salons.find(s => s.id === activeMatch.salonId);
  const table = salon?.tables.find(t => t.id === activeMatch.tableId);

  // Live average calculations
  const p1Avg = liveInnings > 0 ? (p1LiveScore / liveInnings).toFixed(3) : '0.000';
  const p2Avg = liveInnings > 0 ? (p2LiveScore / liveInnings).toFixed(3) : '0.000';

  const handleFinishMatch = () => {
    const isP1Win = p1LiveScore >= p2LiveScore;
    const winnerId = isP1Win ? activeMatch.senderId : activeMatch.receiverId;

    const result: MatchResult = {
      submittedBy: currentUser.id,
      winnerId,
      p1Score: p1LiveScore,
      p2Score: p2LiveScore,
      innings: liveInnings,
      p1Average: Number(p1Avg),
      p2Average: Number(p2Avg),
      p1HighestRun: p1RunUnremembered ? 'unremembered' : p1Run,
      p2HighestRun: p2RunUnremembered ? 'unremembered' : p2Run,
      p1RacksOrFrames: p1LiveScore,
      p2RacksOrFrames: p2LiveScore,
      status: 'ONAY_BEKLIYOR',
    };

    submitMatchResult(activeMatch.id, result);
    setShowFinishModal(false);
  };

  const handleConfirmResult = () => {
    confirmMatchResult(activeMatch.id);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header State Banner */}
      <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-white">
                {activeMatch.gameType.replace('_', ' ')} Maçı
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeMatch.status === 'KABUL_EDILDI'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : activeMatch.status === 'MAC_BASLADI'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {activeMatch.status === 'KABUL_EDILDI'
                  ? 'MAÇ YAPACAK'
                  : activeMatch.status === 'MAC_BASLADI'
                  ? 'CANLI MAÇTA'
                  : 'SONUÇ ONAYI BEKLENİYOR'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {salon?.name} {table ? `• Masa ${table.tableNumber}` : '• Masaya geçilmesi bekleniyor'}
            </p>
          </div>
        </div>

        {/* Cafe order shortcut during match */}
        <button
          onClick={onOpenOrder}
          className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto border border-neutral-700"
        >
          <Utensils className="w-3.5 h-3.5 text-amber-400" />
          <span>Masaya İçecek / Yiyecek İste</span>
        </button>
      </div>

      {/* 2. If Accepted but waiting for Table Connection (Maç Yapacak Durumu) */}
      {activeMatch.status === 'KABUL_EDILDI' && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
            <QrCode className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Masaya Geçip Maçı Başlatın</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
              Her iki oyuncu da salonda hazır olduğunda masadaki QR kodunu okutarak maçı canlı sisteme bağlayabilir.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenQrScanner}
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Masa QR Kodunu Oku & Başlat</span>
            </button>
            <button
              onClick={() => {
                if (salon && salon.tables.length > 0) {
                  startMatchOnTable(activeMatch.id, salon.tables[0].id);
                }
              }}
              className="w-full sm:w-auto px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl border border-neutral-700"
            >
              Masa 1 ile Doğrudan Başlat (Test)
            </button>
          </div>
        </div>
      )}

      {/* 3. Live Scoreboard (Maç Başladı) */}
      {activeMatch.status === 'MAC_BASLADI' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6">
          
          {/* Innings & Target Score bar */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Hedef:</span>
              <span className="font-bold text-white">{activeMatch.targetScoreOrRacks} Sayı</span>
              {activeMatch.targetInnings && (
                <span className="text-neutral-500">({activeMatch.targetInnings} İsteka Sınırı)</span>
              )}
            </div>

            {/* Innings Counter for 3-Bant / Karambol */}
            {(activeMatch.gameType === '3_BANT' || activeMatch.gameType === 'KARAMBOL') && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-medium">İsteka:</span>
                <button
                  onClick={() => setLiveInnings(Math.max(1, liveInnings - 1))}
                  className="w-6 h-6 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-7 text-center font-bold text-sm text-amber-400">{liveInnings}</span>
                <button
                  onClick={() => setLiveInnings(liveInnings + 1)}
                  className="w-6 h-6 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Players Scoreboard Grid */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Player 1 Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-between space-y-4">
              <div className="text-center space-y-1">
                <img
                  src={p1?.avatar}
                  alt={p1?.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/40 mx-auto"
                />
                <h4 className="font-bold text-sm text-white mt-1">{p1?.name}</h4>
                <div className="text-[11px] text-neutral-400">
                  Canlı Ort: <strong className="text-amber-400">{p1Avg}</strong>
                </div>
              </div>

              {/* Big Score Display */}
              <div className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight py-2">
                {p1LiveScore}
              </div>

              {/* Quick Score Buttons */}
              <div className="flex items-center gap-2 w-full max-w-[140px]">
                <button
                  onClick={() => setP1LiveScore(Math.max(0, p1LiveScore - 1))}
                  className="flex-1 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setP1LiveScore(p1LiveScore + 1);
                    setP1Run(p1Run + 1);
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Highest Run tracker */}
              <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <span>En Yüksek Seri:</span>
                <span className="font-bold text-white">{p1Run}</span>
              </div>
            </div>

            {/* Player 2 Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-between space-y-4">
              <div className="text-center space-y-1">
                <img
                  src={p2?.avatar}
                  alt={p2?.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-neutral-700 mx-auto"
                />
                <h4 className="font-bold text-sm text-white mt-1">{p2?.name}</h4>
                <div className="text-[11px] text-neutral-400">
                  Canlı Ort: <strong className="text-amber-400">{p2Avg}</strong>
                </div>
              </div>

              {/* Big Score Display */}
              <div className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight py-2">
                {p2LiveScore}
              </div>

              {/* Quick Score Buttons */}
              <div className="flex items-center gap-2 w-full max-w-[140px]">
                <button
                  onClick={() => setP2LiveScore(Math.max(0, p2LiveScore - 1))}
                  className="flex-1 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setP2LiveScore(p2LiveScore + 1);
                    setP2Run(p2Run + 1);
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Highest Run tracker */}
              <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <span>En Yüksek Seri:</span>
                <span className="font-bold text-white">{p2Run}</span>
              </div>
            </div>

          </div>

          {/* Action: Finish Match */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Maç sonunda skorlar sisteme girilir ve rakip onayıyla masa boşalır.
            </span>
            <button
              onClick={() => setShowFinishModal(true)}
              className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-colors shadow-md shadow-red-500/20"
            >
              Maçı Bitir
            </button>
          </div>
        </div>
      )}

      {/* 4. Result Confirmation Flow (Sonuç Onayı Bekliyor) */}
      {activeMatch.status === 'SONUC_BEKLIYOR' && activeMatch.result && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Maç Sonucu Onayı</h3>
              <p className="text-xs text-neutral-400">
                {activeMatch.result.submittedBy === currentUser.id
                  ? 'Sonucu girdiniz. Rakibinizin onayı bekleniyor.'
                  : 'Rakibiniz maç sonucunu girdi. Lütfen doğrulayın.'}
              </p>
            </div>
          </div>

          {/* Summary Table */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
            <div className="flex items-center justify-between font-bold text-sm border-b border-neutral-800 pb-2">
              <span className="text-white">{p1?.name}</span>
              <span className="text-amber-400">{activeMatch.result.p1Score} - {activeMatch.result.p2Score}</span>
              <span className="text-white">{p2?.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] text-neutral-400">
              <div>İsteka: <strong className="text-white">{activeMatch.result.innings || '-'}</strong></div>
              <div>Kazanan: <strong className="text-amber-400">{activeMatch.result.winnerId === p1?.id ? p1?.name : p2?.name}</strong></div>
              <div>{p1?.name} Ort: <strong className="text-white">{activeMatch.result.p1Average?.toFixed(3) || '-'}</strong></div>
              <div>{p2?.name} Ort: <strong className="text-white">{activeMatch.result.p2Average?.toFixed(3) || '-'}</strong></div>
            </div>
          </div>

          {/* Confirm Button for the opponent */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={handleConfirmResult}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sonucu Onayla & Masayı Boşalt</span>
            </button>
          </div>
        </div>
      )}

      {/* Finish Match Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-5 text-neutral-100 shadow-2xl">
            <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
              <h4 className="font-bold text-base text-white">Maç Sonucunu Onayla & Gönder</h4>
              <button onClick={() => setShowFinishModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">{p1?.name} Skor:</span>
                  <span className="font-bold text-base text-white">{p1LiveScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">{p2?.name} Skor:</span>
                  <span className="font-bold text-base text-white">{p2LiveScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">İsteka:</span>
                  <span className="font-bold text-base text-amber-400">{liveInnings}</span>
                </div>
              </div>

              {/* "Hatırlamıyorum" rule from PDF page 11 */}
              <div className="space-y-2">
                <div className="text-neutral-300 font-semibold">En Yüksek Seri (Opsiyonel)</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <input
                      type="checkbox"
                      checked={p1RunUnremembered}
                      onChange={e => setP1RunUnremembered(e.target.checked)}
                      className="rounded border-neutral-700 text-amber-500"
                    />
                    <span className="text-[11px] text-neutral-400">Seri Hatırlamıyorum</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <input
                      type="checkbox"
                      checked={p2RunUnremembered}
                      onChange={e => setP2RunUnremembered(e.target.checked)}
                      className="rounded border-neutral-700 text-amber-500"
                    />
                    <span className="text-[11px] text-neutral-400">Rakip Serisini Hatırlamıyorum</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                className="px-4 py-2 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleFinishMatch}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md"
              >
                Sonucu Rakibe Gönder
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
