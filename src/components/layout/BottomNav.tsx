import React from 'react';
import { Home, Newspaper, QrCode, MessageSquare, User as UserIcon, Store, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BottomNavProps {
  onOpenQrScanner: () => void;
  onOpenDocs?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenQrScanner, onOpenDocs }) => {
  const { activeView, setActiveView, currentRole } = useApp();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800 pb-safe">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-around relative">
        
        {/* Ana Sayfa */}
        <button
          onClick={() => setActiveView('home')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'home' || activeView === 'salon_detail'
              ? 'text-amber-500 font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Ana Sayfa</span>
        </button>

        {/* Bülten / Etkinlik */}
        <button
          onClick={() => setActiveView('bulletin')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'bulletin' ? 'text-amber-500 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Newspaper className="w-5 h-5" />
          <span className="text-[10px]">Bülten</span>
        </button>

        {/* Center: Big QR Button */}
        <div className="relative -top-4">
          <button
            onClick={onOpenQrScanner}
            className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all border-4 border-neutral-950"
            title="Masa QR Kodunu Tara"
          >
            <QrCode className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="block text-[9px] font-bold text-center mt-1 text-amber-500">QR Oku</span>
        </div>

        {/* Sosyal (Sohbet & DM) */}
        <button
          onClick={() => setActiveView('social')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'social' ? 'text-amber-500 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Sosyal</span>
        </button>

        {/* Profil */}
        <button
          onClick={() => setActiveView('profile')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'profile' ? 'text-amber-500 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px]">Profil</span>
        </button>

      </div>
    </nav>
  );
};
