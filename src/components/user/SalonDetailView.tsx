import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  CircleDot,
  Users,
  Swords,
  QrCode,
  Utensils,
  Trophy,
  Megaphone,
  Check,
  MessageSquare,
  Share2,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Salon, User, BilliardGameType } from '../../types';

interface SalonDetailViewProps {
  salonId: string;
  onBack: () => void;
  onOpenMatchModal: (targetOpponent: User, preferredGame?: BilliardGameType) => void;
  onOpenQrScanner: () => void;
  onOpenTableQr: (tableNumber: number, allowedGames: BilliardGameType[]) => void;
}

export const SalonDetailView: React.FC<SalonDetailViewProps> = ({
  salonId,
  onBack,
  onOpenMatchModal,
  onOpenQrScanner,
  onOpenTableQr,
}) => {
  const {
    salons,
    users,
    currentUser,
    tournaments,
    joinTournament,
    setActiveView,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'oyuncular' | 'masalar' | 'duyurular' | 'turnuvalar'>('oyuncular');
  const [isFollowing, setIsFollowing] = useState(false);

  const salon = salons.find(s => s.id === salonId) || salons[0];

  // Players in this salon
  const playersPresent = users.filter(
    u => u.salonStatus === 'SALONDA' && u.currentSalonId === salon.id
  );

  const playersComingSoon = users.filter(
    u => u.salonStatus === 'GELECEK' && u.currentSalonId === salon.id
  );

  const salonTournaments = tournaments.filter(t => t.salonId === salon.id);

  // Group table counts
  const threeCushionTables = salon.tables.filter(t => t.allowedGames.includes('3_BANT')).length;
  const americanTables = salon.tables.filter(t => t.allowedGames.includes('AMERIKAN')).length;
  const snookerTables = salon.tables.filter(t => t.allowedGames.includes('SNOOKER')).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* Top Back & Actions Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Şehirdeki Salonlar</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsFollowing(!isFollowing);
              showToast(isFollowing ? 'Takipten çıkıldı.' : `${salon.name} takip ediliyor.`);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isFollowing
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isFollowing ? 'Takiptesin' : 'Takip Et'}</span>
          </button>

          <button
            onClick={() => setActiveView('social')}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Salon Sohbeti"
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Hero Salon Banner Card */}
      <div className="relative rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-900">
        <div className="h-52 sm:h-64 relative">
          <img
            src={salon.coverImage}
            alt={salon.name}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
          
          <div className="absolute bottom-5 inset-x-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold">
                  ★ {salon.rating}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-neutral-200 border border-white/15">
                  {salon.followersCount + (isFollowing ? 1 : 0)} Takipçi
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Açık ({salon.openHours})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
                {salon.name}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                {salon.address}
              </p>
            </div>

            {/* In-Salon Order button */}
            <button
              onClick={() => setActiveView('order')}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
            >
              <Utensils className="w-4 h-4" />
              <span>Kafeterya Siparişi Ver</span>
            </button>
          </div>
        </div>

        {/* Salon Quick Info & Table Counts Strip */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-400 block text-[11px]">3 Bant / Karambol</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{threeCushionTables} Masa</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-400 block text-[11px]">Amerikan / 9 Top</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{americanTables} Masa</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-400 block text-[11px]">Snooker</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{snookerTables} Masa</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-400 block text-[11px]">İletişim & Rez.</span>
            <span className="text-xs font-bold text-amber-400 mt-0.5 block truncate">{salon.phone}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('oyuncular')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'oyuncular'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Salondaki Oyuncular ({playersPresent.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('masalar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'masalar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Masa Durumu ({salon.tables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('duyurular')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'duyurular'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Duyuru & Kampanya ({salon.announcements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('turnuvalar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'turnuvalar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Turnuva & Etkinlik ({salonTournaments.length})</span>
        </button>
      </div>

      {/* Tab 1: Oyuncular (Salondakiler & Birazdan Gelecekler) */}
      {activeTab === 'oyuncular' && (
        <div className="space-y-6">
          {/* Salondakiler */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Şu An Salondakiler ({playersPresent.length})
              </h3>
              <span className="text-xs text-neutral-400">Anlık durum güncellemesi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playersPresent.map(player => (
                <div
                  key={player.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-700"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{player.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {player.level}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {player.playedGames.map(g => g.replace('_', ' ')).join(', ')}
                      </div>
                      <div className="text-[11px] text-amber-400/90 font-medium">
                        3 Bant Ort: {player.stats.threeCushion.generalAverage.toFixed(3)}
                      </div>
                    </div>
                  </div>

                  {player.id !== currentUser.id && (
                    <button
                      onClick={() => onOpenMatchModal(player, player.playedGames[0])}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Maç Teklifi</span>
                    </button>
                  )}
                </div>
              ))}

              {playersPresent.length === 0 && (
                <div className="col-span-2 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center text-xs text-neutral-400">
                  Şu an bu salonda aktif oyuncu bulunmuyor. İlk gelen siz olun!
                </div>
              )}
            </div>
          </div>

          {/* Birazdan Gelecekler */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Birazdan Gelecekler ({playersComingSoon.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playersComingSoon.map(player => (
                <div
                  key={player.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-11 h-11 rounded-xl object-cover border border-neutral-700"
                    />
                    <div>
                      <div className="font-bold text-sm text-white">{player.name}</div>
                      <div className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Tahmini {player.etaMinutes || 20} dakika sonra</span>
                      </div>
                    </div>
                  </div>

                  {player.id !== currentUser.id && (
                    <button
                      onClick={() => onOpenMatchModal(player, player.playedGames[0])}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 transition-colors shrink-0"
                    >
                      Randevu Ayarla
                    </button>
                  )}
                </div>
              ))}

              {playersComingSoon.length === 0 && (
                <div className="col-span-2 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center text-xs text-neutral-500">
                  Birazdan gelecek oyuncu kaydı henüz yok.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Masalar (Boş / Dolu Canlı Durum & QR) */}
      {activeTab === 'masalar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">Canlı Masa Müsaitliği</h3>
              <p className="text-xs text-neutral-400">Masadaki QR kodu telefonunuzla okutarak anında maçı başlatabilirsiniz.</p>
            </div>
            <button
              onClick={onOpenQrScanner}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 self-start shadow-md shadow-amber-500/20"
            >
              <QrCode className="w-4 h-4" />
              <span>Masa QR Kodunu Tara</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {salon.tables.map(table => {
              const isOccupied = table.status === 'DOLU';

              return (
                <div
                  key={table.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    isOccupied
                      ? 'bg-neutral-900/90 border-red-500/30 shadow-md'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-white">
                          Masa {table.tableNumber}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isOccupied
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isOccupied ? 'DOLU' : 'BOŞ'}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400 mt-0.5 block">
                        {table.name}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenTableQr(table.tableNumber, table.allowedGames)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                      title="Masa QR Kodunu Gör"
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs">
                    {isOccupied ? (
                      <div className="space-y-1">
                        <div className="text-neutral-400 flex items-center justify-between">
                          <span>Aktif Oyuncular:</span>
                          <span className="text-amber-400 font-semibold">
                            {table.elapsedMinutes ? `${table.elapsedMinutes} dk oynanıyor` : 'Maçta'}
                          </span>
                        </div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Swords className="w-3.5 h-3.5 text-red-400" />
                          <span>{table.activePlayerNames?.join(' vs ') || 'Maç devam ediyor'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-neutral-400">
                        <span>Oyun Türleri:</span>
                        <span className="text-neutral-300 font-medium">
                          {table.allowedGames.map(g => g.replace('_', ' ')).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Duyurular & Kampanyalar */}
      {activeTab === 'duyurular' && (
        <div className="space-y-3">
          {salon.announcements.map(ann => (
            <div
              key={ann.id}
              className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                  {ann.type}
                </span>
                <span className="text-xs text-neutral-500">{ann.createdAt}</span>
              </div>
              <h4 className="text-base font-bold text-white">{ann.title}</h4>
              <p className="text-xs text-neutral-300 leading-relaxed">{ann.content}</p>
              <div className="text-[11px] text-neutral-500 pt-1">
                Son Geçerlilik: {ann.validUntil}
              </div>
            </div>
          ))}

          {salon.announcements.length === 0 && (
            <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-xs text-neutral-500">
              Bu salon için güncel duyuru bulunmamaktadır.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Turnuvalar */}
      {activeTab === 'turnuvalar' && (
        <div className="space-y-4">
          {salonTournaments.map(t => (
            <div
              key={t.id}
              className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold">
                      {t.gameType.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                      {t.registeredUserIds.length}/{t.capacity} Kontenjan
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white font-display">{t.title}</h4>
                </div>

                <button
                  onClick={() => joinTournament(t.id)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl self-start sm:self-auto shadow-md"
                >
                  Turnuvaya Başvur
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block text-[11px]">Tarih & Saat</span>
                  <span className="font-semibold text-white mt-0.5 block">{t.startDate}</span>
                </div>
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block text-[11px]">Katılım Ücreti</span>
                  <span className="font-semibold text-emerald-400 mt-0.5 block">{t.entryFee} TL (Salonda Ödenir)</span>
                </div>
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block text-[11px]">Ödül</span>
                  <span className="font-semibold text-amber-400 mt-0.5 block truncate">{t.prizeDescription}</span>
                </div>
              </div>

              {/* Mandatory Legal & Tournament Disclaimers from PDF page 15 */}
              <div className="p-3.5 bg-neutral-950/80 rounded-2xl border border-neutral-800 text-xs space-y-2 text-neutral-400">
                <div className="flex items-start gap-2 text-amber-400/90 font-medium">
                  <span>⚠️</span>
                  <span>Oyuncuların ilan edilen maç saatinde salonda bulunmaları ve maça hazır olmaları gerekir.</span>
                </div>
                <div className="flex items-start gap-2 text-neutral-400">
                  <span>ⓘ</span>
                  <span>Katılım ücreti ilgili salon tarafından belirlenir ve doğrudan salona ödenir. BilardoGo üzerinden tahsil edilmez.</span>
                </div>
                <div className="flex items-start gap-2 text-neutral-400">
                  <span>ⓘ</span>
                  <span>Bu turnuva, ilgili salon tarafından BilardoGo altyapısı kullanılarak düzenlenen özel bir turnuvadır. TBF resmi müsabakaları için değildir.</span>
                </div>
              </div>
            </div>
          ))}

          {salonTournaments.length === 0 && (
            <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-xs text-neutral-500">
              Şu an bu salonda aktif turnuva kaydı bulunmamaktadır.
            </div>
          )}
        </div>
      )}

    </div>
  );
};
