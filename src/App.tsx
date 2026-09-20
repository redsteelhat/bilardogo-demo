import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { UserHomeView } from './components/user/UserHomeView';
import { SalonDetailView } from './components/user/SalonDetailView';
import { ActiveMatchView } from './components/user/ActiveMatchView';
import { UserProfileView } from './components/user/UserProfileView';
import { SocialView } from './components/user/SocialView';
import { OrderFoodView } from './components/user/OrderFoodView';
import { BusinessDashboardView } from './components/business/BusinessDashboardView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { MatchRequestModal } from './components/user/MatchRequestModal';
import { QrModal } from './components/common/QrModal';
import { TechDocsModal } from './components/common/TechDocsModal';
import { User, BilliardGameType } from './types';

const AppContent: React.FC = () => {
  const {
    currentRole,
    activeView,
    setActiveView,
    selectedSalonId,
    setSelectedSalonId,
    salons,
    currentSalonId,
    toastMessage,
  } = useApp();

  // Modal States
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [matchModalUser, setMatchModalUser] = useState<User | null>(null);
  const [matchModalGameType, setMatchModalGameType] = useState<BilliardGameType>('3_BANT');
  
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
      
      {/* Top Universal Navbar */}
      <Navbar
        onOpenQrScanner={handleOpenScanner}
        onOpenDocs={() => setShowDocsModal(true)}
      />

      {/* Main Dynamic View Content */}
      <main className="flex-1 w-full">
        {currentRole === 'admin' || currentRole === 'SUPER_ADMIN' ? (
          <AdminDashboardView onOpenDocs={() => setShowDocsModal(true)} />
        ) : currentRole === 'isletme' || currentRole === 'calisan' || currentRole === 'SALON_SAHIBI' ? (
          <BusinessDashboardView onOpenTableQr={handleOpenTableQr} />
        ) : (
          /* OYUNCU (User) Views */
          <>
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

            {activeView === 'active_match' && (
              <ActiveMatchView
                onOpenQrScanner={handleOpenScanner}
                onOpenOrder={() => setActiveView('order')}
              />
            )}

            {activeView === 'profile' && <UserProfileView />}

            {activeView === 'social' && <SocialView />}

            {activeView === 'order' && <OrderFoodView />}
          </>
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

      {/* QR Code Scanner / Generator Modal */}
      <QrModal
        isOpen={qrModalConfig.isOpen}
        onClose={() => setQrModalConfig(prev => ({ ...prev, isOpen: false }))}
        mode={qrModalConfig.mode}
        tableData={{
          salonId: qrModalConfig.salonId,
          salonName: salons.find(s => s.id === qrModalConfig.salonId)?.name || 'Salon',
          tableNumber: qrModalConfig.tableNumber,
          allowedGames: qrModalConfig.allowedGames,
        }}
      />

      {/* Technical Documentation Modal (All 22 pages specification viewer) */}
      <TechDocsModal
        isOpen={showDocsModal}
        onClose={() => setShowDocsModal(false)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="px-4 py-3 rounded-2xl bg-neutral-900 border border-amber-500/40 text-neutral-100 text-xs font-semibold shadow-2xl flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
