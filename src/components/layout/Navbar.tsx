import React, { useState } from 'react';
import {
  MapPin,
  Bell,
  Flame,
  CheckCircle2,
  ChevronDown,
  X,
  User as UserIcon,
  Store,
  Shield,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CITIES } from '../../data/mockData';

interface NavbarProps {
  onOpenQrScanner?: () => void;
  onOpenDocs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenQrScanner, onOpenDocs }) => {
  const {
    currentUser,
    selectedCity,
    setSelectedCity,
    pendingRequestsForMe,
    activeMatch,
    setActiveView,
    setCurrentRole,
    toastMessage,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
      {/* Toast Bar */}
      {toastMessage && (
        <div className="bg-amber-500 text-neutral-950 px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & City Picker */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-2.5 focus:outline-none group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-extrabold text-neutral-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <span className="text-lg">8</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-display">
                  Bilardo<span className="text-amber-500">Go</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  TR
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 hidden sm:block">Bilardo Oyuncuları ve Salonları Platformu</p>
            </div>
          </button>

          {/* City Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCityPicker(!showCityPicker)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-white">{selectedCity}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showCityPicker && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[11px] font-medium text-neutral-400 border-b border-neutral-800">
                  Şehir Değiştir
                </div>
                {CITIES.map(city => (
                  <button
                    key={city}
                    onClick={() => {
                      setSelectedCity(city);
                      setShowCityPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-800 transition-colors ${
                      selectedCity === city ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-neutral-300'
                    }`}
                  >
                    <span>{city}</span>
                    {selectedCity === city && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* BilardoGo Nedir Döküman butonu */}
          {onOpenDocs && (
            <button
              onClick={onOpenDocs}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-neutral-300 hover:text-amber-400 text-xs font-semibold transition-colors"
              title="BilardoGo Nedir? Salon ve Sistem Dökümantasyonu"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>BilardoGo Nedir?</span>
            </button>
          )}

          {/* Salon Portali Hızlı Buton */}
          <button
            onClick={() => {
              setActiveView('business_auth');
              window.location.hash = 'salon';
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-all shadow-sm"
            title="Salon İşletme Girişi & Kaydı (/salon)"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salon Portali</span>
            <span className="sm:hidden text-[10px]">Salon</span>
          </button>

          {/* Admin Portali Hızlı Buton */}
          <button
            onClick={() => {
              setActiveView('admin_auth');
              window.location.hash = 'admin';
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all shadow-sm"
            title="Süper Admin Girişi & Kaydı (/admin)"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          {/* Active match indicator if exists */}
          {activeMatch && (
            <button
              onClick={() => setActiveView('active_match')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold animate-pulse transition-all"
            >
              <Flame className="w-3.5 h-3.5 fill-red-400" />
              <span className="hidden sm:inline">Aktif Maç</span>
            </button>
          )}

          {/* Pending Match Requests */}
          {pendingRequestsForMe.length > 0 && (
            <button
              onClick={() => setActiveView('active_match')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-1"
            >
              <span>{pendingRequestsForMe.length} Maç Teklifi</span>
            </button>
          )}

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    Bildirimler
                  </div>
                  <span className="text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                    Canlı Topluluk
                  </span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                    <div className="font-semibold text-amber-400 flex items-center gap-1">
                      ✅ Berkay Karakurt FBN Bilardo'da!
                    </div>
                    <p className="text-neutral-400 text-[11px]">Takip ettiğiniz oyuncu Kadıköy salonunda masaya geçti.</p>
                    <span className="text-[10px] text-neutral-400 block pt-1">5 dk önce</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1">
                      🏆 Yeni Turnuva: Kadıköy 3 Bant Kupası
                    </div>
                    <p className="text-neutral-400 text-[11px]">Kayıtlar başladı! FBN Bilardo Salonu ev sahipliğinde 16 kontenjan.</p>
                    <span className="text-[10px] text-neutral-400 block pt-1">1 saat önce</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                    <div className="font-semibold text-blue-400 flex items-center gap-1">
                      📰 Bülten: Berkay Karakurt Çeyrek Finalde
                    </div>
                    <p className="text-neutral-400 text-[11px]">Canlı yayın saat 20:00 de başlayacaktır.</p>
                    <span className="text-[10px] text-neutral-400 block pt-1">Bugün 12:40</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User profile avatar thumbnail & role menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
              title="Profil & Yönetim Menüsü"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover"
              />
              <span className="text-xs font-semibold text-white hidden sm:inline max-w-[100px] truncate">
                {currentUser.name}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-neutral-800/80 mb-1">
                  <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-neutral-400 font-mono">@{currentUser.username}</div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveView('profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-200 hover:bg-neutral-800 flex items-center gap-2.5 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-amber-400" />
                    <span>Profilim & İstatistikler</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('business_auth');
                      window.location.hash = 'salon';
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-200 hover:bg-neutral-800 flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-amber-500" />
                      <span>Salon Girişi & Kaydı</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold group-hover:bg-amber-500/20">
                      İşletme
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('admin_auth');
                      window.location.hash = 'admin';
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-200 hover:bg-neutral-800 flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-red-400" />
                      <span>Süper Admin Girişi & Kaydı</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-semibold group-hover:bg-red-500/20">
                      Yönetici
                    </span>
                  </button>

                  {onOpenDocs && (
                    <button
                      onClick={() => {
                        onOpenDocs();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-200 hover:bg-neutral-800 flex items-center gap-2.5 transition-colors"
                    >
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>BilardoGo Nedir? (Doküman)</span>
                    </button>
                  )}

                  <div className="pt-1 border-t border-neutral-800/80">
                    <button
                      onClick={() => {
                        setCurrentRole('kullanici');
                        setActiveView('home');
                        window.location.hash = '';
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5 transition-colors"
                    >
                      <span>🎱 Oyuncu Ana Sayfası</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
