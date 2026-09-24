import React, { useState } from 'react';
import {
  CircleDot,
  Users,
  Utensils,
  Megaphone,
  Trophy,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  QrCode,
  DollarSign,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Settings,
  Edit2,
  Trash2,
  Coffee,
  Check,
  X,
  MapPin,
  Phone,
  Building2,
  FileText,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TableStatus, CafeMenuItem, BilliardGameType, SalonMenuItem, SalonTable } from '../../types';
import { CITIES } from '../../data/mockData';

interface BusinessDashboardViewProps {
  onOpenTableQr: (tableNumber: number, allowedGames: BilliardGameType[]) => void;
}

export const BusinessDashboardView: React.FC<BusinessDashboardViewProps> = ({ onOpenTableQr }) => {
  const {
    salons,
    currentSalonId,
    users,
    cafeOrders,
    updateTableStatus,
    updateCafeOrderStatus,
    addAnnouncement,
    createTournament,
    tournaments,
    showToast,
    // Business actions from context
    updateSalonProfile,
    updateSalonHourlyRate,
    addSalonTableFull,
    updateSalonTable,
    deleteSalonTable,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
  } = useApp();

  const currentSalon = salons.find(s => s.id === currentSalonId) || salons[0];
  const [activeTab, setActiveTab] = useState<'masalar' | 'siparisler' | 'menu' | 'profil' | 'duyurular' | 'turnuvalar'>('masalar');

  // --- 1. HOURLY RATE QUICK EDIT STATE ---
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempHourlyRate, setTempHourlyRate] = useState<number>(currentSalon.hourlyRate || 300);

  const handleSaveHourlyRate = () => {
    if (tempHourlyRate <= 0) {
      showToast('Geçerli bir saatlik ücret giriniz.');
      return;
    }
    updateSalonHourlyRate(currentSalon.id, Number(tempHourlyRate));
    setIsEditingRate(false);
  };

  // --- 2. TABLE MANAGEMENT STATE ---
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState<number>(currentSalon.tables.length + 1);
  const [newTableName, setNewTableName] = useState('');
  const [newTableGames, setNewTableGames] = useState<BilliardGameType[]>(['3_BANT', 'KARAMBOL']);
  const [newTableStatus, setNewTableStatus] = useState<TableStatus>('BOS');
  const [newTableHourlyRate, setNewTableHourlyRate] = useState<number | undefined>(undefined);

  // Edit Table Modal State
  const [editingTable, setEditingTable] = useState<SalonTable | null>(null);

  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTableGames.length === 0) {
      showToast('Lütfen en az bir bilardo oyun türü seçiniz.');
      return;
    }
    addSalonTableFull(currentSalon.id, {
      tableNumber: Number(newTableNumber),
      name: newTableName.trim() || `Masa ${newTableNumber}`,
      allowedGames: newTableGames,
      status: newTableStatus,
      hourlyRate: newTableHourlyRate ? Number(newTableHourlyRate) : undefined,
    });
    setShowAddTableModal(false);
    setNewTableName('');
    setNewTableGames(['3_BANT', 'KARAMBOL']);
    setNewTableNumber(currentSalon.tables.length + 2);
  };

  const handleUpdateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    updateSalonTable(currentSalon.id, editingTable.id, {
      name: editingTable.name,
      allowedGames: editingTable.allowedGames,
      status: editingTable.status,
      hourlyRate: editingTable.hourlyRate,
    });
    setEditingTable(null);
  };

  // --- 3. MENU MANAGEMENT STATE ---
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [menuItemName, setMenuItemName] = useState('');
  const [menuItemCategory, setMenuItemCategory] = useState<'Sicak Icecek' | 'Soguk Icecek' | 'Atistirmalik' | 'Yiyecek'>('Sicak Icecek');
  const [menuItemPrice, setMenuItemPrice] = useState<number>(35);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<number>(0);

  const handleAddMenuItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuItemName.trim()) {
      showToast('Lütfen ürün adını giriniz.');
      return;
    }
    if (menuItemPrice <= 0) {
      showToast('Geçerli bir fiyat belirleyiniz.');
      return;
    }
    addMenuItem(currentSalon.id, {
      name: menuItemName.trim(),
      category: menuItemCategory,
      price: Number(menuItemPrice),
      isAvailable: true,
    });
    setMenuItemName('');
    setMenuItemPrice(35);
    setShowAddMenuModal(false);
  };

  // --- 4. SALON PROFILE FORM STATE ---
  const [profileName, setProfileName] = useState(currentSalon.name);
  const [profileCity, setProfileCity] = useState(currentSalon.city);
  const [profileDistrict, setProfileDistrict] = useState(currentSalon.district);
  const [profileAddress, setProfileAddress] = useState(currentSalon.address);
  const [profilePhone, setProfilePhone] = useState(currentSalon.phone);
  const [profileOpenHours, setProfileOpenHours] = useState(currentSalon.openHours || '11:00 - 02:00');
  const [profileIsOpen, setProfileIsOpen] = useState(currentSalon.isOpen);
  const [profileHourlyRate, setProfileHourlyRate] = useState(currentSalon.hourlyRate || 300);
  const [profileTaxNumber, setProfileTaxNumber] = useState(currentSalon.taxNumber || '');
  const [profileDescription, setProfileDescription] = useState(currentSalon.description || '');
  const [profileAmenities, setProfileAmenities] = useState<string[]>(currentSalon.amenities || []);
  const [newAmenityInput, setNewAmenityInput] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalonProfile(currentSalon.id, {
      name: profileName,
      city: profileCity,
      district: profileDistrict,
      address: profileAddress,
      phone: profilePhone,
      openHours: profileOpenHours,
      isOpen: profileIsOpen,
      hourlyRate: Number(profileHourlyRate),
      taxNumber: profileTaxNumber,
      description: profileDescription,
      amenities: profileAmenities,
    });
    showToast('Salon profili ve ayarları başarıyla kaydedildi!');
  };

  // --- 5. ANNOUNCEMENT & TOURNAMENT FORM STATES ---
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState<'DUYURU' | 'KAMPANYA'>('KAMPANYA');
  const [annValidUntil, setAnnValidUntil] = useState('2026-10-30');

  const [showTournModal, setShowTournModal] = useState(false);
  const [tTitle, setTTitle] = useState('');
  const [tGameType, setTGameType] = useState<BilliardGameType>('3_BANT');
  const [tStartDate, setTStartDate] = useState('2026-10-05 19:00');
  const [tEntryFee, setTEntryFee] = useState(250);
  const [tCapacity, setTCapacity] = useState(32);
  const [tPrize, setTPrize] = useState('1. 10.000 TL + Kupa, 2. 5.000 TL');

  // Metrics calculation
  const occupiedTables = currentSalon.tables.filter(t => t.status === 'DOLU').length;
  const maintenanceTables = currentSalon.tables.filter(t => t.status === 'BAKIMDA' || t.status === 'KULLANIM_DISI').length;
  const availableTables = currentSalon.tables.filter(t => t.status === 'BOS' || t.status === 'MUSAIT').length;
  const occupancyRate = currentSalon.tables.length > 0 ? Math.round((occupiedTables / currentSalon.tables.length) * 100) : 0;
  
  const activePlayersInSalon = users.filter(
    u => u.salonStatus === 'SALONDA' && u.currentSalonId === currentSalon.id
  ).length;

  const salonOrders = cafeOrders.filter(o => o.salonId === currentSalon.id);
  const pendingOrders = salonOrders.filter(
    o => o.status === 'SIPARIS_EDILDI' || o.status === 'HAZIRLANIYOR' || o.status === 'ALINDI'
  );
  const todayRevenue = salonOrders.reduce((sum, o) => sum + (o.totalAmount || o.totalPrice || 0), 0);

  const activeHourlyRate = currentSalon.hourlyRate || 300;

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      showToast('Lütfen tüm alanları doldurunuz.');
      return;
    }
    addAnnouncement(currentSalon.id, {
      title: annTitle,
      content: annContent,
      type: annType,
      validUntil: annValidUntil,
    });
    setAnnTitle('');
    setAnnContent('');
    setShowAnnModal(false);
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle.trim()) {
      showToast('Turnuva başlığı giriniz.');
      return;
    }
    createTournament({
      salonId: currentSalon.id,
      salonName: currentSalon.name,
      organizerRole: 'isletme',
      title: tTitle,
      gameType: tGameType,
      startDate: tStartDate,
      entryFee: tEntryFee,
      capacity: tCapacity,
      designatedTables: [1, 2],
      prizeDescription: tPrize,
      status: 'KAYIT_ACIK',
      rules: 'UMB / WPA resmi bilardo kuralları geçerlidir.',
    });
    setTTitle('');
    setShowTournModal(false);
  };

  // Helper for table status badge
  const renderStatusBadge = (status: TableStatus) => {
    if (status === 'DOLU') {
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Dolu
        </span>
      );
    }
    if (status === 'BAKIMDA' || status === 'KULLANIM_DISI') {
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Ban className="w-3 h-3" />
          Kullanım Dışı
        </span>
      );
    }
    return (
      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Müsait
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Salon Business Header & Subscription Banner */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500 text-neutral-950">
                Salon İşletme Paneli
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                {currentSalon.city} / {currentSalon.district}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${currentSalon.isOpen ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400'}`}>
                {currentSalon.isOpen ? 'Açık' : 'Kapalı'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {currentSalon.name}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Masa durumları (Müsait/Dolu/Kullanım Dışı), saat ücreti, mutfak menüsü ve siparişleri canlı yönetin.
            </p>
          </div>

          {/* Hourly Rate & Subscription Status */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Saatlik Ücret Değiştirme Rozeti */}
            <div className="p-3 bg-neutral-950 rounded-2xl border border-amber-500/30 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="text-neutral-400 text-[10px]">Masa Saat Ücreti</div>
                {isEditingRate ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      value={tempHourlyRate}
                      onChange={e => setTempHourlyRate(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 bg-neutral-900 border border-amber-500 rounded text-xs text-white font-bold"
                    />
                    <button
                      onClick={handleSaveHourlyRate}
                      className="p-1 rounded bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      title="Kaydet"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <button
                      onClick={() => setIsEditingRate(false)}
                      className="p-1 rounded bg-neutral-800 text-neutral-400 hover:text-white"
                      title="İptal"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-extrabold text-sm">{activeHourlyRate} ₺ / sa</span>
                    <button
                      onClick={() => {
                        setTempHourlyRate(activeHourlyRate);
                        setIsEditingRate(true);
                      }}
                      className="text-amber-400 hover:text-amber-300 p-0.5 rounded hover:bg-amber-500/10"
                      title="Saat Ücretini Değiştir"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Trial Badge */}
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                30G
              </div>
              <div className="text-xs">
                <div className="text-white font-bold">Ücretsiz Deneme</div>
                <div className="text-emerald-400 text-[11px] font-medium">Aktif Lisans</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Masa Durumları</span>
              <CircleDot className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-white mt-1 font-mono">
              <span className="text-emerald-400">{availableTables} Boş</span> • <span className="text-red-400">{occupiedTables} Dolu</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Salonda Aktif</span>
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1 font-mono">
              {activePlayersInSalon} <span className="text-xs text-neutral-400 font-normal">Oyuncu</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Bekleyen Sipariş</span>
              <Utensils className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1 font-mono">
              {pendingOrders.length} <span className="text-xs text-orange-400 font-normal">Sipariş</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Kafeterya Cirosu</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
              {todayRevenue} ₺
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('masalar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shrink-0 ${
            activeTab === 'masalar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Masa Yönetimi ({currentSalon.tables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('siparisler')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shrink-0 ${
            activeTab === 'siparisler'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Siparişler ({pendingOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shrink-0 ${
            activeTab === 'menu'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>Menü & Fiyat Belirleme ({(currentSalon.menuItems || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profil')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shrink-0 ${
            activeTab === 'profil'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Salon Profil & Bilgi Düzenle</span>
        </button>

        <button
          onClick={() => setActiveTab('duyurular')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shrink-0 ${
            activeTab === 'duyurular'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Duyurular & Kampanyalar</span>
        </button>

        <button
          onClick={() => setActiveTab('turnuvalar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shrink-0 ${
            activeTab === 'turnuvalar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Turnuva Yönetimi</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MASALAR CANLI YÖNETİM & DURUMLAR                  */}
      {/* ======================================================== */}
      {activeTab === 'masalar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Canlı Masa Kontrolü & Masa Ekleme</span>
                <span className="text-xs text-neutral-400 font-normal">
                  (Müsait, Dolu, Kullanım Dışı durumları)
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Masa başı saatlik ücret: <strong className="text-amber-400">{activeHourlyRate} ₺</strong>. Masayı açıp kapatabilir, bakım durumuna alabilirsiniz.
              </p>
            </div>

            <button
              onClick={() => setShowAddTableModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Masa Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentSalon.tables.map(t => {
              const isOccupied = t.status === 'DOLU';
              const isMaintenance = t.status === 'BAKIMDA' || t.status === 'KULLANIM_DISI';
              const tableRate = t.hourlyRate || activeHourlyRate;
              const approxCost = isOccupied ? Math.round(((t.elapsedMinutes || 30) / 60) * tableRate) : 0;

              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                    isOccupied
                      ? 'bg-neutral-900 border-red-500/40'
                      : isMaintenance
                      ? 'bg-neutral-900 border-amber-500/30'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-white">Masa {t.tableNumber}</span>
                        {renderStatusBadge(t.status)}
                      </div>
                      <span className="text-xs text-neutral-400 mt-0.5 block">{t.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingTable(t)}
                        className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
                        title="Masayı Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenTableQr(t.tableNumber, t.allowedGames)}
                        className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-amber-400 border border-neutral-800 transition-colors"
                        title="Masa QR Kodunu Göster / Yazdır"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Masa ${t.tableNumber} silinsin mi?`)) {
                            deleteSalonTable(currentSalon.id, t.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 border border-neutral-800 transition-colors"
                        title="Masayı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Table details */}
                  <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-xs space-y-2">
                    <div className="flex justify-between text-neutral-400">
                      <span>Desteklenen Türler:</span>
                      <span className="text-neutral-200 font-medium">
                        {t.allowedGames.map(g => g.replace('_', ' ')).join(', ')}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-400">
                      <span>Saat Ücreti:</span>
                      <span className="text-amber-400 font-bold">{tableRate} ₺ / sa</span>
                    </div>

                    {isOccupied && (
                      <>
                        <div className="flex justify-between text-neutral-400 pt-1 border-t border-neutral-800">
                          <span>Oyuncular:</span>
                          <span className="font-bold text-white">
                            {t.activePlayerNames?.join(' vs ') || 'Kayıtsız Maç'}
                          </span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Oynanan Süre:</span>
                          <span className="font-bold text-amber-400">{t.elapsedMinutes || 30} dakika</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Tahmini Masa Tutarı:</span>
                          <span className="font-bold text-emerald-400">{approxCost} ₺</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 3-WAY STATUS BUTTONS: Müsait / Dolu / Kullanım Dışı */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-neutral-400 font-semibold block">
                      Masa Durumunu Değiştir:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => updateTableStatus(currentSalon.id, t.id, 'BOS')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          !isOccupied && !isMaintenance
                            ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                            : 'bg-neutral-950 text-neutral-300 hover:text-emerald-400 border border-neutral-800'
                        }`}
                      >
                        ✓ Müsait
                      </button>

                      <button
                        onClick={() => updateTableStatus(currentSalon.id, t.id, 'DOLU', ['Manuel Müşteri', 'Misafir'])}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          isOccupied
                            ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                            : 'bg-neutral-950 text-neutral-300 hover:text-red-400 border border-neutral-800'
                        }`}
                      >
                        ● Dolu
                      </button>

                      <button
                        onClick={() => updateTableStatus(currentSalon.id, t.id, 'KULLANIM_DISI')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          isMaintenance
                            ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                            : 'bg-neutral-950 text-neutral-300 hover:text-amber-400 border border-neutral-800'
                        }`}
                      >
                        ⊘ Kullanım Dışı
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GELEN SİPARİŞLER (sipariş_edildi durumu dahil)    */}
      {/* ======================================================== */}
      {activeTab === 'siparisler' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Canlı Mutfak & Kafeterya Sipariş Takibi</h3>
              <p className="text-xs text-neutral-400">
                Oyuncuların masalarından verdikleri siparişler anında bu ekrana düşer.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30">
              {pendingOrders.length} Bekleyen
            </span>
          </div>

          <div className="space-y-3">
            {salonOrders.map(order => {
              const isSiparisEdildi = order.status === 'SIPARIS_EDILDI';
              const isHazirlaniyor = order.status === 'HAZIRLANIYOR' || order.status === 'ALINDI';
              const isServisEdildi = order.status === 'SERVIS_EDILDI' || order.status === 'TESLIM_EDILDI';
              const isKapandi = order.status === 'KASADA_ODENDI_KAPATILDI';

              return (
                <div
                  key={order.id}
                  className={`p-5 rounded-3xl bg-neutral-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
                    isSiparisEdildi
                      ? 'border-amber-500/50 shadow-amber-500/10'
                      : isHazirlaniyor
                      ? 'border-orange-500/40'
                      : 'border-neutral-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold px-3 py-1 rounded-xl bg-amber-500 text-neutral-950 shadow-sm">
                        Masa {order.tableNumber || 1}
                      </span>
                      <span className="text-xs font-bold text-white">{order.userName || order.customerName}</span>
                      <span className="text-neutral-500 text-xs">• {order.createdAt}</span>

                      {/* Status Badge */}
                      {isSiparisEdildi && (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                          Sipariş Edildi
                        </span>
                      )}
                      {isHazirlaniyor && (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          Hazırlanıyor
                        </span>
                      )}
                      {isServisEdildi && (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Servis Edildi
                        </span>
                      )}
                      {isKapandi && (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                          Kasada Ödendi
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-neutral-200 font-medium">
                      {order.items.map(i => `${i.quantity}x ${i.name} (${i.price * i.quantity} ₺)`).join(' + ')}
                    </div>

                    {(order.note || order.orderNote) && (
                      <div className="text-xs text-amber-400 italic">
                        Not: "{order.note || order.orderNote}"
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-base font-extrabold text-emerald-400">
                        {order.totalAmount || order.totalPrice} ₺
                      </div>
                      <div className="text-[10px] text-neutral-500">Masa Tahsilatı</div>
                    </div>

                    {/* Status Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {isSiparisEdildi && (
                        <button
                          onClick={() => updateCafeOrderStatus(order.id, 'HAZIRLANIYOR')}
                          className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-neutral-950 font-bold text-xs transition-colors"
                        >
                          Hazırlanıyor Yap
                        </button>
                      )}

                      {(isSiparisEdildi || isHazirlaniyor) && (
                        <button
                          onClick={() => updateCafeOrderStatus(order.id, 'SERVIS_EDILDI')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Servis Edildi</span>
                        </button>
                      )}

                      {isServisEdildi && (
                        <button
                          onClick={() => updateCafeOrderStatus(order.id, 'KASADA_ODENDI_KAPATILDI')}
                          className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-colors"
                        >
                          Kasada Ödendi (Kapat)
                        </button>
                      )}

                      {order.status !== 'KASADA_ODENDI_KAPATILDI' && order.status !== 'IPTAL' && (
                        <button
                          onClick={() => updateCafeOrderStatus(order.id, 'IPTAL')}
                          className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 border border-neutral-800"
                          title="Siparişi İptal Et"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {salonOrders.length === 0 && (
              <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-3xl text-xs text-neutral-500 space-y-1">
                <Utensils className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                <p>Şu an herhangi bir kafeterya siparişi bulunmuyor.</p>
                <p className="text-neutral-600">Oyuncular masalarından sipariş verdiğinde anında burada listelenir.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: KAFETERYA MENÜ & FİYAT BELİRLEME                  */}
      {/* ======================================================== */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-500" />
                <span>Kafeterya Menü ve Fiyat Yönetimi</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Salon menünüzdeki ürünleri ekleyin, fiyatlarını belirleyin ve mevcudiyet durumunu güncelleyin.
              </p>
            </div>

            <button
              onClick={() => setShowAddMenuModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Ürün Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {(currentSalon.menuItems || []).map(item => {
              const isEditingThisPrice = editingMenuItemId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl bg-neutral-900 border transition-all flex flex-col justify-between space-y-3 ${
                    item.isAvailable ? 'border-neutral-800' : 'border-neutral-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 block w-fit mb-1">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-white leading-snug">{item.name}</h4>
                    </div>

                    <button
                      onClick={() => deleteMenuItem(currentSalon.id, item.id)}
                      className="text-neutral-500 hover:text-red-400 p-1"
                      title="Ürünü Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Price and Availability row */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                    <div>
                      <div className="text-[10px] text-neutral-500">Birim Fiyat</div>
                      {isEditingThisPrice ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={e => setEditPriceValue(Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 bg-neutral-950 border border-amber-500 rounded text-xs text-white font-bold"
                          />
                          <button
                            onClick={() => {
                              updateMenuItem(currentSalon.id, item.id, { price: Number(editPriceValue) });
                              setEditingMenuItemId(null);
                            }}
                            className="p-1 rounded bg-amber-500 text-neutral-950 hover:bg-amber-400"
                            title="Kaydet"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingMenuItemId(null)}
                            className="p-1 rounded bg-neutral-800 text-neutral-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-extrabold text-amber-400">{item.price} ₺</span>
                          <button
                            onClick={() => {
                              setEditingMenuItemId(item.id);
                              setEditPriceValue(item.price);
                            }}
                            className="text-neutral-400 hover:text-white p-0.5 rounded hover:bg-neutral-800"
                            title="Fiyatı Değiştir"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleMenuItemAvailability(item.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        item.isAvailable
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {item.isAvailable ? 'Satışta' : 'Tükendi'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SALON PROFİL & BİLGİ DOLDURMA / DÜZENLEME          */}
      {/* ======================================================== */}
      {activeTab === 'profil' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                Salon Profil Bilgileri & Düzenleme
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Oyuncuların salon detay sayfasında göreceği tüm iletişim, adres, saatlik ücret ve olanak bilgilerini buradan doldurabilirsiniz.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium block">Salon Resmi Adı *</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Örn: FBN Bilardo Salonu"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium block">Telefon Numarası *</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    placeholder="0216 555 44 33"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium block">Şehir</label>
                  <select
                    value={profileCity}
                    onChange={e => setProfileCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    {CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium block">İlçe</label>
                  <input
                    type="text"
                    value={profileDistrict}
                    onChange={e => setProfileDistrict(e.target.value)}
                    placeholder="Örn: Kadıköy"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Açık Adres (Yol tarifi için)</label>
                <input
                  type="text"
                  value={profileAddress}
                  onChange={e => setProfileAddress(e.target.value)}
                  placeholder="Caferağa Mah. Moda Cad. No: 42/A Kadıköy, İstanbul"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium block">Masa Başı Saatlik Ücret (TL) *</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={profileHourlyRate}
                      onChange={e => setProfileHourlyRate(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium block">Çalışma Saatleri</label>
                  <input
                    type="text"
                    value={profileOpenHours}
                    onChange={e => setProfileOpenHours(e.target.value)}
                    placeholder="11:00 - 02:00"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium block">Vergi No (VKN / TCKN)</label>
                  <input
                    type="text"
                    value={profileTaxNumber}
                    onChange={e => setProfileTaxNumber(e.target.value)}
                    placeholder="10 Haneli VKN"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium block">Salon Açıklaması & Hakkımızda</label>
                <textarea
                  rows={3}
                  value={profileDescription}
                  onChange={e => setProfileDescription(e.target.value)}
                  placeholder="Salonunuzdaki masalar, çuha özellikleri, turnuvalar ve sporcular için sunduğunuz imkanları açıklayın..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Amenities list & tag input */}
              <div className="space-y-2">
                <label className="text-neutral-300 font-medium block">Salon Olanakları & Özellikleri</label>
                <div className="flex flex-wrap gap-2">
                  {profileAmenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 flex items-center gap-1.5"
                    >
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => setProfileAmenities(prev => prev.filter((_, i) => i !== index))}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newAmenityInput}
                    onChange={e => setNewAmenityInput(e.target.value)}
                    placeholder="Yeni özellik ekle (Örn: Simonis 300 Çuha, Isıtmalı Masalar, Canlı Yayın, Klima, Wi-Fi)"
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAmenityInput.trim() && !profileAmenities.includes(newAmenityInput.trim())) {
                        setProfileAmenities(prev => [...prev, newAmenityInput.trim()]);
                        setNewAmenityInput('');
                      }
                    }}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileIsOpen}
                    onChange={e => setProfileIsOpen(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-neutral-950 border-neutral-800"
                  />
                  <span className="text-white font-bold">Salon Şu Anda Açık Olarak Gözüksün</span>
                </label>

                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 text-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Salon Bilgilerini Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: DUYURULAR & KAMPANYALAR                           */}
      {/* ======================================================== */}
      {activeTab === 'duyurular' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Yayınlanan Salon Duyuruları</h3>
            <button
              onClick={() => setShowAnnModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Duyuru Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentSalon.announcements.map(ann => (
              <div
                key={ann.id}
                className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
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
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: TURNUVA YÖNETİMİ                                 */}
      {/* ======================================================== */}
      {activeTab === 'turnuvalar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Salon Turnuva Organizatörü</h3>
              <p className="text-xs text-neutral-400">Özel salon kupaları düzenleyin, oyuncuları toplayın.</p>
            </div>
            <button
              onClick={() => setShowTournModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Turnuva Oluştur</span>
            </button>
          </div>

          <div className="space-y-3">
            {tournaments
              .filter(t => t.salonId === currentSalon.id)
              .map(t => (
                <div
                  key={t.id}
                  className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold">
                          {t.gameType.replace('_', ' ')}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                          {t.registeredUserIds.length}/{t.capacity} Kayıt
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white font-display">{t.title}</h4>
                    </div>

                    <button
                      onClick={() => showToast('Turnuva eşleşme kuraları çekildi!')}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 self-start sm:self-auto"
                    >
                      Kura Çek & Başlat
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-neutral-400">
                    <div>Tarih: <strong className="text-white">{t.startDate}</strong></div>
                    <div>Katılım: <strong className="text-emerald-400">{t.entryFee} ₺</strong></div>
                    <div>Ödül: <strong className="text-amber-400">{t.prizeDescription}</strong></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: YENİ MASA EKLE VE MASA TÜRÜ SEÇME              */}
      {/* ======================================================== */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Yeni Masa Ekle & Masa Türü Seçimi</span>
              </h4>
              <button onClick={() => setShowAddTableModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Masa Numarası *</label>
                  <input
                    type="number"
                    value={newTableNumber}
                    onChange={e => setNewTableNumber(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Özel Saat Ücreti (TL)</label>
                  <input
                    type="number"
                    value={newTableHourlyRate || ''}
                    onChange={e => setNewTableHourlyRate(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={`Varsayılan: ${activeHourlyRate} ₺`}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Masa Adı / Modeli *</label>
                <input
                  type="text"
                  placeholder="Örn: Masa 7 (Platin 3-Bant Isıtmalı)"
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              {/* Table Types Selection */}
              <div>
                <label className="text-neutral-400 block mb-1 font-semibold">
                  Masa Türü Seçimi (Çoklu seçilebilir):
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { key: '3_BANT', label: '3 Bant (Isıtmalı)' },
                    { key: 'KARAMBOL', label: 'Karambol' },
                    { key: 'AMERIKAN', label: 'Amerikan (Pool)' },
                    { key: 'DOKUZ_TOP', label: '9 Top (Nine-Ball)' },
                    { key: 'SNOOKER', label: 'Snooker' },
                  ].map(game => {
                    const isSelected = newTableGames.includes(game.key as BilliardGameType);
                    return (
                      <button
                        key={game.key}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewTableGames(prev => prev.filter(g => g !== game.key));
                          } else {
                            setNewTableGames(prev => [...prev, game.key as BilliardGameType]);
                          }
                        }}
                        className={`p-2 rounded-xl text-left font-semibold border transition-all text-xs flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <span>{game.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label className="text-neutral-400 block mb-1 font-semibold">Başlangıç Durumu:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTableStatus('BOS')}
                    className={`py-2 rounded-xl font-bold border text-xs ${
                      newTableStatus === 'BOS' ? 'bg-emerald-500 text-neutral-950 border-emerald-500' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Müsait
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTableStatus('DOLU')}
                    className={`py-2 rounded-xl font-bold border text-xs ${
                      newTableStatus === 'DOLU' ? 'bg-red-500 text-white border-red-500' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Dolu
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTableStatus('KULLANIM_DISI')}
                    className={`py-2 rounded-xl font-bold border text-xs ${
                      newTableStatus === 'KULLANIM_DISI' ? 'bg-amber-500 text-neutral-950 border-amber-500' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Kullanım Dışı
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-md"
                >
                  Masayı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: MASAYI DÜZENLE                                  */}
      {/* ======================================================== */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-base text-white">
                Masa {editingTable.tableNumber} Düzenle
              </h4>
              <button onClick={() => setEditingTable(null)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTableSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Masa Adı</label>
                <input
                  type="text"
                  value={editingTable.name}
                  onChange={e => setEditingTable({ ...editingTable, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Saatlik Ücret (TL)</label>
                <input
                  type="number"
                  value={editingTable.hourlyRate || activeHourlyRate}
                  onChange={e => setEditingTable({ ...editingTable, hourlyRate: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Masa Durumu</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTable({ ...editingTable, status: 'BOS' })}
                    className={`py-2 rounded-xl font-bold border text-xs ${
                      editingTable.status === 'BOS' || editingTable.status === 'MUSAIT'
                        ? 'bg-emerald-500 text-neutral-950 border-emerald-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Müsait
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTable({ ...editingTable, status: 'DOLU' })}
                    className={`py-2 rounded-xl font-bold border text-xs ${
                      editingTable.status === 'DOLU'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Dolu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTable({ ...editingTable, status: 'KULLANIM_DISI' })}
                    className={`py-2 rounded-xl font-bold border text-xs ${
                      editingTable.status === 'KULLANIM_DISI' || editingTable.status === 'BAKIMDA'
                        ? 'bg-amber-500 text-neutral-950 border-amber-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Kullanım Dışı
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-md"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: YENİ MENÜ ÜRÜNÜ EKLE & FİYAT BELİRLE            */}
      {/* ======================================================== */}
      {showAddMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-500" />
                <span>Yeni Kafeterya Ürünü Ekle</span>
              </h4>
              <button onClick={() => setShowAddMenuModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMenuItemSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Ürün Adı *</label>
                <input
                  type="text"
                  placeholder="Örn: Double Espresso, Kaşarlı Tost, Portakal Suyu"
                  value={menuItemName}
                  onChange={e => setMenuItemName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Kategori *</label>
                  <select
                    value={menuItemCategory}
                    onChange={e => setMenuItemCategory(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Sicak Icecek">Sıcak İçecek</option>
                    <option value="Soguk Icecek">Soğuk İçecek</option>
                    <option value="Yiyecek">Yiyecek (Tost / Sandviç)</option>
                    <option value="Atistirmalik">Atıştırmalık</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Fiyat (TL) *</label>
                  <input
                    type="number"
                    value={menuItemPrice}
                    onChange={e => setMenuItemPrice(Number(e.target.value))}
                    placeholder="35"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-md"
                >
                  Ürünü Menüye Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: YENİ DUYURU                                     */}
      {/* ======================================================== */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-base text-white">Yeni Duyuru / Kampanya Ekle</h4>
              <button onClick={() => setShowAnnModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Tür</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnType('KAMPANYA')}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      annType === 'KAMPANYA' ? 'bg-amber-500 text-neutral-950 border-amber-500' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Kampanya
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnType('DUYURU')}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      annType === 'DUYURU' ? 'bg-amber-500 text-neutral-950 border-amber-500' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    Duyuru
                  </button>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Başlık</label>
                <input
                  type="text"
                  placeholder="Örn: 17:00-19:00 Arası Çaylar İkram!"
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">İçerik Açıklaması</label>
                <textarea
                  rows={3}
                  placeholder="Kampanya detaylarını açıklayınız..."
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Son Geçerlilik Tarihi</label>
                <input
                  type="date"
                  value={annValidUntil}
                  onChange={e => setAnnValidUntil(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-md"
                >
                  Yayınla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: YENİ TURNUVA                                    */}
      {/* ======================================================== */}
      {showTournModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-base text-white">Yeni Turnuva Oluştur</h4>
              <button onClick={() => setShowTournModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTournament} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Turnuva Adı</label>
                <input
                  type="text"
                  placeholder="Örn: Kadıköy 3 Bant Sonbahar Kupası"
                  value={tTitle}
                  onChange={e => setTTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Oyun Türü</label>
                  <select
                    value={tGameType}
                    onChange={e => setTGameType(e.target.value as BilliardGameType)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="3_BANT">3 Bant</option>
                    <option value="KARAMBOL">Karambol</option>
                    <option value="AMERIKAN">Amerikan</option>
                    <option value="SNOOKER">Snooker</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Katılım Ücreti (TL)</label>
                  <input
                    type="number"
                    value={tEntryFee}
                    onChange={e => setTEntryFee(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Kontenjan (Kişi)</label>
                  <input
                    type="number"
                    value={tCapacity}
                    onChange={e => setTCapacity(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Başlangıç Tarihi & Saati</label>
                  <input
                    type="text"
                    value={tStartDate}
                    onChange={e => setTStartDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Ödül Açıklaması</label>
                <input
                  type="text"
                  value={tPrize}
                  onChange={e => setTPrize(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTournModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-md"
                >
                  Turnuvayı Yayınla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
