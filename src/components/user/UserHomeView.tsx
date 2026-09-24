import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Users,
  ChevronRight,
  Clock,
  CircleDot,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Flame,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Salon, SalonPresenceStatus, MatchSeekStatus } from '../../types';

interface UserHomeViewProps {
  onSelectSalon: (salonId: string) => void;
  onOpenQrScanner: () => void;
}

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
  }
  return (parts[0]?.slice(0, 2) || '').toLocaleUpperCase('tr-TR');
};

export const UserHomeView: React.FC<UserHomeViewProps> = ({ onSelectSalon, onOpenQrScanner }) => {
  const {
    currentUser,
    salons,
    selectedCity,
    users,
    ads,
    updatePresenceStatus,
    updateMatchStatus,
    setActiveView,
    setSelectedSalonId,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [etaInput, setEtaInput] = useState(20);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Filter salons by city and search query
  const citySalons = salons.filter(
    s => s.city.toLowerCase() === selectedCity.toLowerCase() &&
         (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.district.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Active players in the city
  const playersInCity = users.filter(u => u.city === selectedCity);
  const activeInSalonPlayers = playersInCity.filter(u => u.salonStatus === 'SALONDA');
  const comingSoonPlayers = playersInCity.filter(u => u.salonStatus === 'GELECEK');
  const seekingMatchPlayers = playersInCity.filter(u => u.matchStatus === 'OYNAYACAK');

  // Active Ads for this city or Turkey general
  const activeAds = ads.filter(
    a => a.isActive && (a.targetScope === 'TURKIYE_GENELI' || a.targetCity === selectedCity)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* 1. Status Bar Card (User presence & Match Seeking) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-13 h-13 rounded-2xl object-cover border-2 border-neutral-700"
              />
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-neutral-900 ${
                  currentUser.salonStatus === 'SALONDA'
                    ? 'bg-emerald-500'
                    : currentUser.salonStatus === 'GELECEK'
                    ? 'bg-amber-500'
                    : 'bg-neutral-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Merhaba, {currentUser.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                  {currentUser.level}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Bugün bilardo maçı yapacak kimse var mı?
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowStatusModal(true)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-neutral-700 transition-colors"
          >
            <span>Durumumu Değiştir</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current status display tags */}
        <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
            <span className="text-neutral-400">Salon Durumu:</span>
            {currentUser.salonStatus === 'SALONDA' ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Salondayım
              </span>
            ) : currentUser.salonStatus === 'GELECEK' ? (
              <span className="text-amber-400 font-bold">
                Geleceğim ({currentUser.etaMinutes || 20} dk)
              </span>
            ) : (
              <span className="text-neutral-400 font-medium">Çevrimdışı</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
            <span className="text-neutral-400">Maç Durumu:</span>
            {currentUser.matchStatus === 'OYNAYACAK' ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Oynamak İstiyorum
              </span>
            ) : currentUser.matchStatus === 'MACTA' ? (
              <span className="text-red-400 font-bold">Maçta</span>
            ) : currentUser.matchStatus === 'MAC_YAPACAK' ? (
              <span className="text-blue-400 font-bold">Maç Yapacak</span>
            ) : (
              <span className="text-neutral-400">Oynamak İstemiyorum</span>
            )}
          </div>

          <button
            onClick={() => updateMatchStatus(currentUser.matchStatus === 'OYNAYACAK' ? 'ISTEMIYOR' : 'OYNAYACAK')}
            className={`ml-auto px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
              currentUser.matchStatus === 'OYNAYACAK'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            {currentUser.matchStatus === 'OYNAYACAK' ? '✓ Maç İsteği Açık' : '+ Maç İsteği Aç'}
          </button>
        </div>
      </div>

      {/* 2. City Overview Stats Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <div className="text-xl font-bold text-white font-display">{activeInSalonPlayers.length}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Salonda Aktif</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <div className="text-xl font-bold text-amber-400 font-display">{seekingMatchPlayers.length}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Maç Arayan</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <div className="text-xl font-bold text-neutral-200 font-display">{comingSoonPlayers.length}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Birazdan Gelecek</div>
        </div>
      </div>

      {/* 3. Sponsor / Advertisement Banner */}
      {activeAds.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden border border-neutral-800 group shadow-lg">
          <img
            src={activeAds[0].bannerImage}
            alt={activeAds[0].brand}
            className="w-full h-28 sm:h-32 object-cover brightness-75 group-hover:scale-102 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950">
                Sponsor
              </span>
              <span className="text-xs font-bold text-white">{activeAds[0].brand}</span>
            </div>
            <p className="text-xs text-neutral-200 font-medium line-clamp-1">
              {activeAds[0].title}
            </p>
          </div>
        </div>
      )}

      {/* 4. Salons in City Header & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <MapPin className="w-5 h-5 text-amber-500" />
              {selectedCity}'deki Salonlar
            </h3>
            <p className="text-xs text-neutral-400">
              Şu anda {citySalons.length} aktif bilardo salonu listeleniyor
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Salon veya semt ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Salon Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {citySalons.map(salon => {
            // Count active players in this salon
            const playersInThisSalon = users.filter(
              u => u.salonStatus === 'SALONDA' && u.currentSalonId === salon.id
            );
            const occupiedTables = salon.tables.filter(t => t.status === 'DOLU').length;

            return (
              <div
                key={salon.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-neutral-700 transition-all flex flex-col group shadow-lg"
              >
                {/* Salon Cover Photo */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={salon.coverImage}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                  
                  {/* Top Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                    {playersInThisSalon.length > 0 ? (
                      <div
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/15 text-xs shadow-md"
                        title={`Salondaki Aktif Oyuncular: ${playersInThisSalon.map(p => p.name).join(', ')}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-0.5" />
                        <div className="flex items-center -space-x-1.5">
                          {playersInThisSalon.slice(0, 3).map(p => (
                            <div
                              key={p.id}
                              title={p.name}
                              className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 font-black text-[9px] flex items-center justify-center border-2 border-neutral-950 shadow-sm"
                            >
                              {getInitials(p.name)}
                            </div>
                          ))}
                          {/* Yuvarlak içinde ... rozeti */}
                          <div
                            title={`Ve diğer aktif oyuncular`}
                            className="w-6 h-6 rounded-full bg-neutral-800 text-amber-400 font-black text-[10px] flex items-center justify-center border-2 border-neutral-950 tracking-tighter"
                          >
                            ...
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-medium text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Müsait Masalar</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <div className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-xs font-bold text-amber-400">
                        ★ {salon.rating}
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-amber-500 text-neutral-950 text-xs font-extrabold shadow-sm">
                        {salon.hourlyRate || 300} ₺/sa
                      </div>
                    </div>
                  </div>

                  {/* Open / Closed and District Badge */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-neutral-950 font-bold text-[10px]">
                      AÇIK ({salon.openHours})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-900/90 text-neutral-300 text-[10px] font-medium border border-neutral-700">
                      {salon.district}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors font-display">
                      {salon.name}
                    </h4>
                    <p className="text-xs text-neutral-400 flex items-start gap-1.5 mt-1.5 line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                      {salon.address}
                    </p>

                    {/* Table Status summary */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <CircleDot className="w-3.5 h-3.5 text-amber-400" />
                        <span>{salon.tables.length} Masa ({occupiedTables} Dolu, {salon.tables.length - occupiedTables} Müsait)</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.name + ' ' + salon.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5 text-amber-400" />
                      <span>Yol Tarifi</span>
                    </a>

                    <button
                      onClick={() => onSelectSalon(salon.id)}
                      className="flex-1 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                    >
                      <span>Salona Gir</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {citySalons.length === 0 && (
          <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-3xl space-y-2">
            <p className="text-sm text-neutral-300 font-medium">Bu şehirde eşleşen salon bulunamadı.</p>
            <p className="text-xs text-neutral-500">Üst menüden şehri değiştirebilir veya arama filtrenizi temizleyebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Status Selection Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-white text-base">Salon Durumunuzu Seçin</h4>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Vazgeç
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Salondayım */}
              <button
                onClick={() => {
                  updatePresenceStatus('SALONDA', salons[0]?.id);
                  setShowStatusModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  currentUser.salonStatus === 'SALONDA'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">Salondayım</div>
                  <div className="text-xs text-neutral-400 font-normal">Şu an salondayım, maç davetlerine açığım.</div>
                </div>
                {currentUser.salonStatus === 'SALONDA' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </button>

              {/* Option 2: Geleceğim */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-amber-400">Geleceğim</div>
                    <div className="text-xs text-neutral-400">Birazdan salonda olacağım.</div>
                  </div>
                  <button
                    onClick={() => {
                      updatePresenceStatus('GELECEK', salons[0]?.id, etaInput);
                      setShowStatusModal(false);
                    }}
                    className="px-3 py-1.5 bg-amber-500 text-neutral-950 font-bold text-xs rounded-xl"
                  >
                    Kaydet
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400">Kaç dakika sonra?</span>
                  <div className="flex items-center gap-1">
                    {[15, 30, 45, 60].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setEtaInput(mins)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                          etaInput === mins
                            ? 'bg-amber-500 text-neutral-950 border-amber-500'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                        }`}
                      >
                        {mins} dk
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Option 3: Çevrimdışı */}
              <button
                onClick={() => {
                  updatePresenceStatus('CEVRIMDISI');
                  setShowStatusModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  currentUser.salonStatus === 'CEVRIMDISI'
                    ? 'bg-neutral-800 border-neutral-600 text-white font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">Çevrimdışı</div>
                  <div className="text-xs text-neutral-500 font-normal">Salonda değilim.</div>
                </div>
                {currentUser.salonStatus === 'CEVRIMDISI' && <CheckCircle2 className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
