import React, { useState } from 'react';
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
import { MatchRequestModal } from './components/user/MatchRequestModal';
import { QrModal } from './components/common/QrModal';
import { User, BilliardGameType } from './types';

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    selectedSalonId,
    setSelectedSalonId,
    salons,
    currentSalonId,
    toastMessage,
  } = useApp();

  // Modal States
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
      
      {/* Top Navbar */}
      <Navbar
        onOpenQrScanner={handleOpenScanner}
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
      </main>

      {/* Mobile Floating Bottom Bar */}
      <BottomNav
        onOpenQrScanner={handleOpenScanner}
        onOpenDocs={() => {}}
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
