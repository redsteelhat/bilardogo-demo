import React, { useState } from 'react';
import {
  Newspaper,
  Trophy,
  Calendar,
  Megaphone,
  Sparkles,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  ChevronRight,
  Filter,
  Flame,
  Award,
  ExternalLink,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WeekendEvent } from '../../types';

export const EventsBulletinView: React.FC = () => {
  const {
    news,
    tournaments,
    weekendEvents,
    salons,
    selectedCity,
    currentUser,
    joinTournament,
    joinWeekendEvent,
    setActiveView,
    setSelectedSalonId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'hepsi' | 'bulten' | 'turnuvalar' | 'hafta_sonu' | 'duyurular'>('hepsi');
  const [filterCity, setFilterCity] = useState<string>(selectedCity);

  // Filtered lists
  const filteredNews = news.filter(n => n.status === 'YAYINDA');
  
  const filteredTournaments = tournaments.filter(t => {
    const salon = salons.find(s => s.id === t.salonId);
    if (!salon) return true;
    return filterCity === 'TÜMÜ' || salon.city.toLowerCase() === filterCity.toLowerCase();
  });

  const filteredWeekendEvents = weekendEvents.filter(e => {
    const salon = salons.find(s => s.id === e.salonId);
    if (!salon) return true;
    return filterCity === 'TÜMÜ' || salon.city.toLowerCase() === filterCity.toLowerCase();
  });

  // Extract all salon announcements
  const allAnnouncements = salons
    .filter(s => filterCity === 'TÜMÜ' || s.city.toLowerCase() === filterCity.toLowerCase())
    .flatMap(s => s.announcements.map(a => ({ ...a, salonName: s.name, salonId: s.id, salonCity: s.city })));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Etkinlik & Bülten Merkezi
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
              Bilardo Gündemi & Etkinlikler
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl">
              Turnuvalar, hafta sonu mini şampiyonaları, resmi salon duyuruları ve bülten haberlerine tek yerden başvurun.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-950/80 p-2 rounded-2xl border border-neutral-800">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="TÜMÜ" className="bg-neutral-900 text-white">Tüm Türkiye</option>
              <option value="İstanbul" className="bg-neutral-900 text-white">İstanbul</option>
              <option value="Ankara" className="bg-neutral-900 text-white">Ankara</option>
              <option value="İzmir" className="bg-neutral-900 text-white">İzmir</option>
              <option value="Bursa" className="bg-neutral-900 text-white">Bursa</option>
              <option value="Antalya" className="bg-neutral-900 text-white">Antalya</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-neutral-800/80 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('hepsi')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'hepsi'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white bg-neutral-950/60'
            }`}
          >
            Tüm Akış
          </button>

          <button
            onClick={() => setActiveTab('turnuvalar')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'turnuvalar'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white bg-neutral-950/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Turnuvalar ({filteredTournaments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('hafta_sonu')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'hafta_sonu'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white bg-neutral-950/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Hafta Sonu Etkinlikleri ({filteredWeekendEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('duyurular')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'duyurular'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white bg-neutral-950/60'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Duyuru & Kampanyalar ({allAnnouncements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bulten')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'bulten'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white bg-neutral-950/60'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Bülten Haberleri ({filteredNews.length})</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: TURNUVALAR */}
      {(activeTab === 'hepsi' || activeTab === 'turnuvalar') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Trophy className="w-5 h-5 text-amber-500" />
              Aktif Turnuvalar
            </h2>
            <span className="text-xs text-neutral-400">
              Başvurular uygulama üzerinden alınır, katılım ücreti salonda ödenir
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTournaments.map(t => {
              const isRegistered = t.registeredUserIds.includes(currentUser.id);
              const isFull = t.registeredUserIds.length >= t.capacity;

              return (
                <div
                  key={t.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500 text-neutral-950 uppercase">
                        {t.gameType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.registeredUserIds.length}/{t.capacity} Kontenjan</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white font-display leading-snug">
                      {t.title}
                    </h3>
                    <p className="text-xs text-neutral-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-neutral-500" />
                      <span>{t.salonName}</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Tarih</span>
                      <span className="font-semibold text-white mt-0.5 block">{t.startDate}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Katılım</span>
                      <span className="font-semibold text-emerald-400 mt-0.5 block">{t.entryFee} TL</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Ödül</span>
                      <span className="font-semibold text-amber-400 mt-0.5 block truncate" title={t.prizeDescription}>
                        {t.prizeDescription}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setSelectedSalonId(t.salonId);
                        setActiveView('salon_detail');
                      }}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      Salonu İncele →
                    </button>

                    <button
                      onClick={() => joinTournament(t.id)}
                      disabled={isRegistered || isFull}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                        isRegistered
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : isFull
                          ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                      }`}
                    >
                      {isRegistered ? '✓ Başvuruldu' : isFull ? 'Kontenjan Dolu' : 'Turnuvaya Başvur'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: HAFTA SONU ETKİNLİKLERİ */}
      {(activeTab === 'hepsi' || activeTab === 'hafta_sonu') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Hafta Sonu Etkinlikleri & Mini Turnuvalar
            </h2>
            <span className="text-xs text-neutral-400">
              Cumartesi ve Pazar günlerine özel handikaplı ve tempolu etkinlikler
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredWeekendEvents.map(event => {
              const isRegistered = event.isRegistered;
              const isFull = event.registeredCount >= event.capacity;

              return (
                <div
                  key={event.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {event.date}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {event.registeredCount}/{event.capacity} Kişi
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white font-display">
                      {event.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Salon:</span>
                      <span className="font-semibold text-white">{event.salonName}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Katılım:</span>
                      <span className="font-semibold text-emerald-400">{event.entryFee} TL</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Ödül:</span>
                      <span className="font-semibold text-amber-400 truncate max-w-[120px]">{event.prize}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => joinWeekendEvent(event.id)}
                    disabled={isRegistered || isFull}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      isRegistered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                        : isFull
                        ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-extrabold'
                    }`}
                  >
                    {isRegistered ? '✓ Kayıt Alındı' : isFull ? 'Kontenjan Doldu' : 'Etkinliğe Başvur'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: SALON DUYURU VE KAMPANYALARI */}
      {(activeTab === 'hepsi' || activeTab === 'duyurular') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Megaphone className="w-5 h-5 text-amber-400" />
              Salon Duyuru & Kampanyaları
            </h2>
            <span className="text-xs text-neutral-400">
              Salonların sunduğu mutlu saatler, ekipman indirimleri ve özel fırsatlar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allAnnouncements.map((ann, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-3 shadow-md hover:border-neutral-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                      {ann.type}
                    </span>
                    <span className="text-xs text-neutral-500">{ann.salonCity}</span>
                  </div>

                  <h3 className="font-bold text-sm text-white">{ann.title}</h3>
                  <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">{ann.content}</p>
                </div>

                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                  <div className="text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{ann.salonName}</span>
                  </div>
                  <span className="text-[11px] text-amber-400 font-medium">
                    Son: {ann.validUntil}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: BÜLTEN HABERLERİ */}
      {(activeTab === 'hepsi' || activeTab === 'bulten') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Newspaper className="w-5 h-5 text-blue-400" />
              BilardoGo Bülteni
            </h2>
            <span className="text-xs text-neutral-400">
              Türk ve dünya bilardosundan en güncel haberler
            </span>
          </div>

          <div className="space-y-4">
            {filteredNews.map(item => (
              <div
                key={item.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col sm:flex-row shadow-lg hover:border-neutral-700 transition-all group"
              >
                <div className="sm:w-56 h-48 sm:h-auto shrink-0 overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-amber-400 border border-white/10">
                    {item.category}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-xs text-neutral-500">{item.createdAt}</div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors font-display">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/70 text-xs">
                    <span className="text-neutral-400">Bilardo Dünyası Özel Bülten</span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Devamını Oku</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
