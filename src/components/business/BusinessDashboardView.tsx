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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TableStatus, CafeMenuItem, BilliardGameType } from '../../types';

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
  } = useApp();

  const currentSalon = salons.find(s => s.id === currentSalonId) || salons[0];
  const [activeTab, setActiveTab] = useState<'masalar' | 'siparisler' | 'duyurular' | 'turnuvalar'>('masalar');

  // Announcement Form State
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState<'DUYURU' | 'KAMPANYA'>('KAMPANYA');
  const [annValidUntil, setAnnValidUntil] = useState('2026-10-30');

  // Tournament Form State
  const [showTournModal, setShowTournModal] = useState(false);
  const [tTitle, setTTitle] = useState('');
  const [tGameType, setTGameType] = useState<BilliardGameType>('3_BANT');
  const [tStartDate, setTStartDate] = useState('2026-10-05 19:00');
  const [tEntryFee, setTEntryFee] = useState(250);
  const [tCapacity, setTCapacity] = useState(32);
  const [tPrize, setTPrize] = useState('1. 10.000 TL + Kupa, 2. 5.000 TL');

  // Calculate metrics
  const occupiedTables = currentSalon.tables.filter(t => t.status === 'DOLU').length;
  const occupancyRate = Math.round((occupiedTables / currentSalon.tables.length) * 100);
  const activePlayersInSalon = users.filter(
    u => u.salonStatus === 'SALONDA' && u.currentSalonId === currentSalon.id
  ).length;

  const salonOrders = cafeOrders.filter(o => o.salonId === currentSalon.id);
  const pendingOrders = salonOrders.filter(o => o.status === 'HAZIRLANIYOR' || o.status === 'ALINDI');
  const todayRevenue = salonOrders.reduce((sum, o) => sum + (o.totalAmount || o.totalPrice || 0), 0);

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
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {currentSalon.name}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Masa dolulukları, QR sistemleri, siparişler ve turnuva yönetimini bu panelden canlı yönetin.
            </p>
          </div>

          {/* Trial / Subscription Badge (PDF page 21: "30 Gün Ücretsiz Deneme") */}
          <div className="p-3.5 bg-neutral-950 rounded-2xl border border-amber-500/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              30G
            </div>
            <div className="text-xs">
              <div className="text-white font-bold">Ücretsiz Deneme Sürümü</div>
              <div className="text-amber-400 font-medium">Kalan: 26 Gün (Sonra 2.000 TL/Ay)</div>
            </div>
          </div>
        </div>

        {/* 2. Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Masa Doluluğu</span>
              <CircleDot className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-white mt-1 font-mono">
              {occupiedTables}/{currentSalon.tables.length} <span className="text-xs text-amber-400 font-normal">%{occupancyRate}</span>
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
              {pendingOrders.length} <span className="text-xs text-orange-400 font-normal">Masa</span>
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'masalar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Canlı Masa Kontrolü ({currentSalon.tables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('siparisler')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'siparisler'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Gelen Siparişler ({pendingOrders.length})</span>
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
          <span>Duyurular & Kampanyalar ({currentSalon.announcements.length})</span>
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
          <span>Turnuva Yönetimi</span>
        </button>
      </div>

      {/* Tab 1: Masalar Canlı Yönetim */}
      {activeTab === 'masalar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Masaları doğrudan buradan DOLU/BOŞ yapabilir veya QR kodlarını yazdırabilirsiniz.
            </span>
            <div className="text-xs text-neutral-400 font-semibold">
              Masa Saat Ücreti: <strong className="text-amber-400">300 ₺ / saat</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentSalon.tables.map(t => {
              const isOccupied = t.status === 'DOLU';
              const approxCost = isOccupied ? Math.round(((t.elapsedMinutes || 30) / 60) * 300) : 0;

              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                    isOccupied
                      ? 'bg-neutral-900 border-red-500/40 shadow-lg'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-white">Masa {t.tableNumber}</span>
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
                      <span className="text-xs text-neutral-400 mt-0.5 block">{t.name}</span>
                    </div>

                    <button
                      onClick={() => onOpenTableQr(t.tableNumber, t.allowedGames)}
                      className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-amber-400 border border-neutral-800 transition-colors"
                      title="Masa QR Kodunu Göster / Yazdır"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Table details */}
                  <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-xs space-y-2">
                    {isOccupied ? (
                      <>
                        <div className="flex justify-between text-neutral-400">
                          <span>Oyuncular:</span>
                          <span className="font-bold text-white">
                            {t.activePlayerNames?.join(' vs ') || 'Kayıtsız Maç'}
                          </span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Süre:</span>
                          <span className="font-bold text-amber-400">{t.elapsedMinutes || 35} dakika</span>
                        </div>
                        <div className="flex justify-between text-neutral-400 pt-1 border-t border-neutral-800">
                          <span>Tahmini Masa Tutarı:</span>
                          <span className="font-bold text-emerald-400">{approxCost} ₺</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-neutral-400">
                        Desteklenen Türler: <span className="text-neutral-200">{t.allowedGames.map(g => g.replace('_', ' ')).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Table Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {isOccupied ? (
                      <button
                        onClick={() => updateTableStatus(currentSalon.id, t.id, 'BOS')}
                        className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-red-400 hover:text-red-300 font-bold text-xs border border-neutral-700 transition-colors"
                      >
                        Masayı Kapat (Boşalt)
                      </button>
                    ) : (
                      <button
                        onClick={() => updateTableStatus(currentSalon.id, t.id, 'DOLU', ['Manuel Müşteri', 'Misafir'])}
                        className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-all"
                      >
                        Masayı Manuel Aç (Dolu Yap)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Gelen Siparişler */}
      {activeTab === 'siparisler' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Canlı Mutfak & Kafeterya Sipariş Sırası</h3>
            <span className="text-xs text-neutral-400">{pendingOrders.length} Bekleyen Sipariş</span>
          </div>

          <div className="space-y-3">
            {salonOrders.map(order => (
              <div
                key={order.id}
                className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white px-2.5 py-0.5 rounded-lg bg-amber-500 text-neutral-950">
                      Masa {order.tableNumber}
                    </span>
                    <span className="text-xs font-semibold text-neutral-300">{order.userName || order.customerName}</span>
                    <span className="text-neutral-500 text-xs">• {order.createdAt}</span>
                  </div>

                  <div className="text-xs text-neutral-200 font-medium">
                    {order.items.map(i => `${i.quantity}x ${i.name} (${i.price * i.quantity} ₺)`).join(' + ')}
                  </div>

                  {(order.note || order.orderNote) && (
                    <div className="text-xs text-amber-400 italic">
                      Müşteri Notu: "{order.note || order.orderNote}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-base font-extrabold text-emerald-400">{order.totalAmount || order.totalPrice} ₺</div>
                    <div className="text-[10px] text-neutral-500">Masa Tahsilatı</div>
                  </div>

                  {order.status === 'HAZIRLANIYOR' || order.status === 'ALINDI' ? (
                    <button
                      onClick={() => updateCafeOrderStatus(order.id, 'TESLIM_EDILDI')}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Teslim Edildi</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-400 font-bold text-xs">
                      Tamamlandı
                    </span>
                  )}
                </div>
              </div>
            ))}

            {salonOrders.length === 0 && (
              <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-3xl text-xs text-neutral-500">
                Şu an bekleyen sipariş bulunmuyor.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Duyurular & Kampanyalar */}
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

      {/* Tab 4: Turnuva Yönetimi */}
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

      {/* New Announcement Modal */}
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

      {/* New Tournament Modal */}
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
