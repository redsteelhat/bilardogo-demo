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
  Navigation,
  Image as ImageIcon,
  Flame,
  X,
  Info,
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
    weekendEvents,
    joinTournament,
    joinWeekendEvent,
    setActiveView,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'oyuncular' | 'mac_arayanlar' | 'masalar' | 'etkinlikler' | 'duyurular' | 'harita'>('oyuncular');
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const salon = salons.find(s => s.id === salonId) || salons[0];

  // Additional salon gallery photos for a rich visual showcase
  const salonGalleryImages = [
    salon.coverImage,
    'https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80',
  ];

  // Players currently in this salon
  const playersPresent = users.filter(
    u => u.salonStatus === 'SALONDA' && u.currentSalonId === salon.id
  );

  // Players coming soon to this salon
  const playersComingSoon = users.filter(
    u => u.salonStatus === 'GELECEK' && u.currentSalonId === salon.id
  );

  // Players seeking match (in this salon or matching city)
  const matchSeekers = users.filter(
    u => u.matchStatus === 'OYNAYACAK' && (u.currentSalonId === salon.id || u.city === salon.city)
  );

  const salonTournaments = tournaments.filter(t => t.salonId === salon.id);
  const salonWeekendEvents = weekendEvents.filter(e => e.salonId === salon.id);

  // Table counts breakdown
  const threeCushionTables = salon.tables.filter(t => t.allowedGames.includes('3_BANT'));
  const caromTables = salon.tables.filter(t => t.allowedGames.includes('KARAMBOL'));
  const americanTables = salon.tables.filter(t => t.allowedGames.includes('AMERIKAN') || t.allowedGames.includes('DOKUZ_TOP'));
  const snookerTables = salon.tables.filter(t => t.allowedGames.includes('SNOOKER'));

  const emptyTables = salon.tables.filter(t => t.status === 'BOS');
  const fullTables = salon.tables.filter(t => t.status === 'DOLU');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* Top Back & Header Actions */}
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
            title="Salon Sohbet Kanalı"
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Hero Salon Banner Card */}
      <div className="relative rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-900">
        <div className="h-56 sm:h-72 relative">
          <img
            src={salon.coverImage}
            alt={salon.name}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
          
          {/* Top Floating Badges */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500 text-neutral-950 font-extrabold flex items-center gap-1 shadow-md">
                ★ {salon.rating}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-neutral-200 border border-white/10">
                {salon.followersCount + (isFollowing ? 1 : 0)} Takipçi
              </span>
            </div>

            <button
              onClick={() => setSelectedImage(salon.coverImage)}
              className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-black/90 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Görselleri Gör ({salonGalleryImages.length})</span>
            </button>
          </div>

          {/* Bottom Title & Actions */}
          <div className="absolute bottom-5 inset-x-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  salon.isOpen
                    ? 'bg-emerald-500/90 text-neutral-950'
                    : 'bg-red-500/90 text-white'
                }`}>
                  {salon.isOpen ? 'ŞU ANDA AÇIK' : 'KAPALI'}
                </span>
                <span className="text-xs text-neutral-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{salon.openHours}</span>
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

            <div className="flex items-center gap-2">
              <a
                href={`tel:${salon.phone}`}
                className="px-3 py-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs font-semibold border border-neutral-700 flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>{salon.phone}</span>
              </a>

              <button
                onClick={() => setActiveView('order')}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all"
              >
                <Utensils className="w-4 h-4" />
                <span>Kafeterya</span>
              </button>
            </div>
          </div>
        </div>

        {/* Salon Quick Table Stats Strip */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-400 block text-[11px]">3 Bant Masaları</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{threeCushionTables.length} Masa</span>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-400 block text-[11px]">Karambol Masaları</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{caromTables.length} Masa</span>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-400 block text-[11px]">Amerikan / 9-Top</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{americanTables.length} Masa</span>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
            <span className="text-neutral-400 block text-[11px]">Masa Durumu</span>
            <span className="text-sm font-bold text-amber-400 mt-0.5 block">
              {emptyTables.length} Boş / {fullTables.length} Dolu
            </span>
          </div>
        </div>
      </div>

      {/* Visual Gallery Preview Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-neutral-400 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
            Salon Görselleri
          </span>
          <span className="text-neutral-500">Büyütmek için fotoğrafa tıklayın</span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {salonGalleryImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedImage(img)}
              className="h-20 sm:h-24 rounded-2xl overflow-hidden border border-neutral-800 hover:border-amber-500/50 transition-all group relative"
            >
              <img
                src={img}
                alt={`${salon.name} fotoğraf ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('oyuncular')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'oyuncular'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Salondaki Oyuncular ({playersPresent.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mac_arayanlar')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'mac_arayanlar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Maç Arayanlar ({matchSeekers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('masalar')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'masalar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span>Boş/Dolu Masalar ({salon.tables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('etkinlikler')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'etkinlikler'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Turnuva & Etkinlikler ({salonTournaments.length + salonWeekendEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('duyurular')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'duyurular'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Duyurular ({salon.announcements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('harita')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'harita'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Harita & İletişim</span>
        </button>
      </div>

      {/* TAB 1: SALONDAKİ OYUNCULAR & BİRAZDAN GELECEKLER */}
      {activeTab === 'oyuncular' && (
        <div className="space-y-6">
          {/* Şu an salondakiler */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Şu An Salondakiler ({playersPresent.length})
              </h3>
              <span className="text-xs text-neutral-400">Canlı oyuncu listesi</span>
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
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
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

          {/* Birazdan gelecekler */}
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
                        <span>Tahmini {player.etaMinutes || 20} dk sonra</span>
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
                  Birazdan gelecek oyuncu kaydı henüz bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MAÇ ARAYANLAR */}
      {activeTab === 'mac_arayanlar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Maç Aramakta Olan Oyuncular ({matchSeekers.length})
              </h3>
              <p className="text-xs text-neutral-400">Bu salonda veya civarında rakip bekleyen aktif bilardo severler.</p>
            </div>

            <button
              onClick={() => setActiveView('social')}
              className="text-xs text-amber-400 hover:underline"
            >
              Topluluk Sohbetinde Yaz →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchSeekers.map(seeker => (
              <div
                key={seeker.id}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 shadow-md hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={seeker.avatar}
                    alt={seeker.name}
                    className="w-12 h-12 rounded-xl object-cover border border-neutral-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">{seeker.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {seeker.level}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Tercih: {seeker.playedGames.map(g => g.replace('_', ' ')).join(', ')}
                    </div>
                    <div className="text-[11px] text-amber-400 font-medium">
                      {seeker.currentSalonId === salon.id ? '📍 Şu an bu salonda' : `📍 ${seeker.city}`}
                    </div>
                  </div>
                </div>

                {seeker.id !== currentUser.id && (
                  <button
                    onClick={() => onOpenMatchModal(seeker, seeker.playedGames[0])}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Maç Teklifi</span>
                  </button>
                )}
              </div>
            ))}

            {matchSeekers.length === 0 && (
              <div className="col-span-2 p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center text-xs text-neutral-400 space-y-2">
                <p>Şu an aktif maç arayan oyuncu bulunamadı.</p>
                <p className="text-amber-400 font-semibold">Ana sayfadan "Maç İsteği Aç" butonuna tıklayarak ilk teklifi siz oluşturun!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MASALAR (BOŞ / DOLU CANLI DURUM) */}
      {activeTab === 'masalar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">Canlı Masa Müsaitliği ({salon.tables.length} Masa)</h3>
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

      {/* TAB 4: TURNUVALAR & HAFTA SONU ETKİNLİKLERİ */}
      {activeTab === 'etkinlikler' && (
        <div className="space-y-6">
          {/* Turnuvalar */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Salon Turnuvaları ({salonTournaments.length})
            </h3>

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
              </div>
            ))}

            {salonTournaments.length === 0 && (
              <div className="p-6 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-xs text-neutral-500">
                Bu salonda şu an planlanan büyük turnuva bulunmuyor.
              </div>
            )}
          </div>

          {/* Hafta sonu etkinlikleri */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Hafta Sonu Mini Etkinlikleri ({salonWeekendEvents.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {salonWeekendEvents.map(we => (
                <div
                  key={we.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {we.date}
                      </span>
                      <span className="text-neutral-400">{we.registeredCount}/{we.capacity} Kontenjan</span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{we.title}</h4>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{we.description}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between">
                    <span className="text-neutral-400">Katılım: <strong className="text-emerald-400">{we.entryFee} TL</strong></span>
                    <button
                      onClick={() => joinWeekendEvent(we.id)}
                      disabled={we.isRegistered}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                        we.isRegistered
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                      }`}
                    >
                      {we.isRegistered ? '✓ Kayıtlısınız' : 'Etkinliğe Başvur'}
                    </button>
                  </div>
                </div>
              ))}

              {salonWeekendEvents.length === 0 && (
                <div className="col-span-2 p-6 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-xs text-neutral-500">
                  Bu hafta sonu için özel mini turnuva planlanmamış.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DUYURULAR / KAMPANYALAR */}
      {activeTab === 'duyurular' && (
        <div className="space-y-3">
          {salon.announcements.map(ann => (
            <div
              key={ann.id}
              className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 shadow-md"
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

      {/* TAB 6: HARİTA & İLETİŞİM */}
      {activeTab === 'harita' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  Salon Konumu & Yol Tarifi
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">{salon.address}</p>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.name + ' ' + salon.address)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-amber-500/20 self-start sm:self-auto"
              >
                <Navigation className="w-4 h-4" />
                <span>Google Maps ile Aç</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Simulated Map Visual Card */}
            <div className="h-64 rounded-2xl bg-neutral-950 border border-neutral-800 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="relative z-10 text-center space-y-2 p-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="font-bold text-white text-sm">{salon.name}</div>
                <div className="text-xs text-neutral-400 max-w-sm">{salon.address}</div>
                <div className="text-[11px] text-amber-400 pt-1 font-mono">
                  Enlem: {(salon.lat || 40.9876).toFixed(4)} | Boylam: {(salon.lng || 29.0254).toFixed(4)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-neutral-500 block text-[11px]">Telefon & İletişim</span>
                <a href={`tel:${salon.phone}`} className="text-sm font-bold text-white hover:text-amber-400 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-amber-500" />
                  <span>{salon.phone}</span>
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-neutral-500 block text-[11px]">Haftalık Çalışma Saatleri</span>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>{salon.openHours} (Haftanın 7 Günü)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Büyük Salon Görseli"
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-neutral-800"
            />
          </div>
        </div>
      )}

    </div>
  );
};
