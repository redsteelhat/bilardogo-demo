import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { UserHomeView } from './components/user/UserHomeView';
import { SalonDetailView } from './components/user/SalonDetailView';
import { ActiveMatchView } from './components/user/ActiveMatchView';
import { UserProfileView } from './components/user/UserProfileView';
import { SocialView } from './components/user/SocialView';
import { EventsBulletinView } from './components/user/EventsBulletinView';
import { OrderFoodView } from './components/user/OrderFoodView';
import { BusinessDashboardView } from './components/business/BusinessDashboardView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AdminAuthView } from './components/auth/AdminAuthView';
import { BusinessAuthView } from './components/auth/BusinessAuthView';
import { TechDocsModal } from './components/common/TechDocsModal';
import { MatchRequestModal } from './components/user/MatchRequestModal';
import { QrModal } from './components/common/QrModal';
import { User, BilliardGameType } from './types';

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    currentRole,
    selectedSalonId,
    setSelectedSalonId,
    salons,
    currentSalonId,
    toastMessage,
  } = useApp();

  // Modal States
  const [matchModalUser, setMatchModalUser] = useState<User | null>(null);
  const [matchModalGameType, setMatchModalGameType] = useState<BilliardGameType>('3_BANT');
  const [showDocsModal, setShowDocsModal] = useState(false);
  
  const [qrModalConfig, setQrModalConfig] = useState<{
    isOpen: boolean;
    mode: 'SCAN' | 'GENERATE_TABLE' | 'GENERATE_ORDER';
    salonId: string;
    tableNumber: number;
    allowedGames: BilliardGameType[];
  }>({
    isOpen: false,
    mode: 'SCAN',
    salonId: selectedSalonId || 'salon-fbn',
    tableNumber: 1,
    allowedGames: ['3_BANT', 'KARAMBOL'],
  });

  // URL Hash & Path routing synchronization
  useEffect(() => {
    const handleUrlRouting = () => {
      const rawHash = window.location.hash.toLowerCase();
      const hash = rawHash.replace(/^#+/, '').replace(/^\/+/, '').replace(/\/+$/, '');
      const rawPath = window.location.pathname.toLowerCase();
      const path = rawPath.replace(/\/+$/, '');

      if (hash === 'admin' || path === '/admin' || path.startsWith('/admin/')) {
        if (currentRole === 'admin') {
          setActiveView('admin_dashboard');
        } else {
          setActiveView('admin_auth');
        }
      } else if (
        hash === 'salon' ||
        hash === 'isletme' ||
        path === '/salon' ||
        path === '/isletme' ||
        path.startsWith('/salon/') ||
        path.startsWith('/isletme/')
      ) {
        if (currentRole === 'isletme') {
          setActiveView('business_dashboard');
        } else {
          setActiveView('business_auth');
        }
      } else if (hash === 'belge' || hash === 'docs' || path === '/docs' || path === '/belge') {
        setShowDocsModal(true);
      } else if (hash === 'bulten' || path === '/bulletin') {
        setActiveView('bulletin');
      } else if (hash === 'profil' || path === '/profile') {
        setActiveView('profile');
      } else if (hash === 'sosyal' || path === '/social') {
        setActiveView('social');
      } else if (path === '' || path === '/' || hash === '' || hash === 'home') {
        // Back to home
        if (
          activeView === 'business_dashboard' ||
          activeView === 'business_auth' ||
          activeView === 'admin_dashboard' ||
          activeView === 'admin_auth'
        ) {
          setActiveView('home');
        }
      }
    };

    handleUrlRouting();
    window.addEventListener('hashchange', handleUrlRouting);
    window.addEventListener('popstate', handleUrlRouting);
    return () => {
      window.removeEventListener('hashchange', handleUrlRouting);
      window.removeEventListener('popstate', handleUrlRouting);
    };
  }, [currentRole, setActiveView, activeView]);

  const handleOpenMatchModal = (targetUser: User, preferredGame: BilliardGameType = '3_BANT') => {
    setMatchModalUser(targetUser);
    setMatchModalGameType(preferredGame);
  };

  const handleOpenTableQr = (tableNumber: number, allowedGames: BilliardGameType[]) => {
    setQrModalConfig({
      isOpen: true,
      mode: 'GENERATE_TABLE',
      salonId: selectedSalonId || currentSalonId || 'salon-fbn',
      tableNumber,
      allowedGames,
    });
  };

  const handleOpenScanner = () => {
    setQrModalConfig({
      isOpen: true,
      mode: 'SCAN',
      salonId: selectedSalonId || 'salon-fbn',
      tableNumber: 1,
      allowedGames: ['3_BANT'],
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950 pb-20 sm:pb-8">
      
      {/* Top Navbar */}
      <Navbar
        onOpenQrScanner={handleOpenScanner}
        onOpenDocs={() => setShowDocsModal(true)}
      />

      {/* Main Dynamic View Content */}
      <main className="flex-1 w-full">
        {activeView === 'home' && (
          <UserHomeView
            onSelectSalon={id => {
              setSelectedSalonId(id);
              setActiveView('salon_detail');
            }}
            onOpenQrScanner={handleOpenScanner}
          />
        )}

        {activeView === 'salon_detail' && (
          <SalonDetailView
            salonId={selectedSalonId || salons[0]?.id || 'salon-fbn'}
            onBack={() => setActiveView('home')}
            onOpenMatchModal={handleOpenMatchModal}
            onOpenQrScanner={handleOpenScanner}
            onOpenTableQr={handleOpenTableQr}
          />
        )}

        {/* Dedicated Admin Portal Routes */}
        {activeView === 'admin_auth' && <AdminAuthView />}

        {/* Dedicated Salon / Business Portal Routes */}
        {activeView === 'business_auth' && <BusinessAuthView />}

        {activeView === 'bulletin' && <EventsBulletinView />}

        {activeView === 'active_match' && (
          <ActiveMatchView
            onOpenQrScanner={handleOpenScanner}
            onOpenOrder={() => setActiveView('order')}
          />
        )}

        {activeView === 'profile' && <UserProfileView />}

        {activeView === 'social' && <SocialView />}

        {activeView === 'order' && <OrderFoodView />}

        {activeView === 'business_dashboard' && (
          <div className="space-y-2">
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-400 max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="font-extrabold flex items-center gap-1.5">
                  🏢 Salon İşletme Paneli
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Rota: /salon
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveView('business_auth');
                    window.location.hash = 'salon';
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition-colors"
                >
                  Hesap Değiştir
                </button>
                <button
                  onClick={() => {
                    setActiveView('home');
                    try {
                      window.history.pushState(null, '', '/');
                    } catch (e) {
                      window.location.hash = '';
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold hover:bg-amber-400 transition-colors shadow-sm"
                >
                  ← Oyuncu Arayüzüne Dön
                </button>
              </div>
            </div>
            <BusinessDashboardView onOpenTableQr={handleOpenTableQr} />
          </div>
        )}

        {activeView === 'admin_dashboard' && (
          <div className="space-y-2">
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-red-400 max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="font-extrabold flex items-center gap-1.5">
                  🛡️ Süper Admin Paneli
                </span>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                  Rota: /admin
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveView('admin_auth');
                    try {
                      window.history.pushState(null, '', '/admin');
                    } catch (e) {
                      window.location.hash = 'admin';
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition-colors"
                >
                  Hesap Değiştir
                </button>
                <button
                  onClick={() => {
                    setActiveView('home');
                    try {
                      window.history.pushState(null, '', '/');
                    } catch (e) {
                      window.location.hash = '';
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-red-500 text-white font-bold hover:bg-red-400 transition-colors shadow-sm"
                >
                  ← Oyuncu Arayüzüne Dön
                </button>
              </div>
            </div>
            <AdminDashboardView onOpenDocs={() => setShowDocsModal(true)} />
          </div>
        )}
      </main>

      {/* Mobile Floating Bottom Bar */}
      <BottomNav
        onOpenQrScanner={handleOpenScanner}
        onOpenDocs={() => setShowDocsModal(true)}
      />

      {/* Match Request Modal */}
      {matchModalUser && (
        <MatchRequestModal
          isOpen={!!matchModalUser}
          onClose={() => setMatchModalUser(null)}
          opponent={matchModalUser}
          initialGameType={matchModalGameType}
        />
      )}

      {/* Tech Docs / BilardoGo Nedir? Modal */}
      <TechDocsModal
        isOpen={showDocsModal}
        onClose={() => setShowDocsModal(false)}
      />

      {/* QR Code Scanner / Generator Modal */}
      <QrModal
        isOpen={qrModalConfig.isOpen}
        onClose={() => setQrModalConfig(prev => ({ ...prev, isOpen: false }))}
        mode={qrModalConfig.mode}
        tableData={{
          salonId: qrModalConfig.salonId,
          salonName: salons.find(s => s.id === qrModalConfig.salonId)?.name || 'Bilardo Salonu',
          tableNumber: qrModalConfig.tableNumber,
          allowedGames: qrModalConfig.allowedGames,
        }}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-amber-500 text-neutral-950 font-bold rounded-2xl shadow-xl shadow-amber-500/20 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
