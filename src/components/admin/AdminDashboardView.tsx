import React, { useState } from 'react';
import {
  ShieldAlert,
  Sliders,
  Image as ImageIcon,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Activity,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Advertisement, SalonStatus } from '../../types';

interface AdminDashboardViewProps {
  onOpenDocs: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onOpenDocs }) => {
  const {
    users,
    salons,
    ads,
    reports,
    createAd,
    toggleAdStatus,
    resolveReport,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'genel' | 'reklamlar' | 'salonlar' | 'moderasyon'>('genel');

  // Ad Form State
  const [showAdModal, setShowAdModal] = useState(false);
  const [adBrand, setAdBrand] = useState('');
  const [adTitle, setAdTitle] = useState('');
  const [adImage, setAdImage] = useState('https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&w=1200&q=80');
  const [adLink, setAdLink] = useState('https://bilardogo.com/sponsor');
  const [adScope, setAdScope] = useState<'TURKIYE_GENELI' | 'SEHIR_BAZLI'>('TURKIYE_GENELI');
  const [adCity, setAdCity] = useState('İstanbul');

  // Platform Metrics
  const totalUsersCount = users.length;
  const approvedSalonsCount = salons.filter(s => s.status === 'AKTIF').length;
  const pendingReportsCount = reports.filter(r => r.status === 'BEKLEMEDE').length;
  const estimatedMrr = approvedSalonsCount * 2000; // 2.000 TL / salon

  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adBrand.trim() || !adTitle.trim() || !adImage.trim()) {
      showToast('Lütfen gerekli alanları doldurunuz.');
      return;
    }

    createAd({
      brand: adBrand,
      logo: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?auto=format&fit=crop&w=120&q=80',
      description: adTitle,
      link: adLink,
      title: adTitle,
      bannerImage: adImage,
      targetLink: adLink,
      targetScope: adScope,
      targetCity: adScope === 'SEHIR_BAZLI' ? adCity : undefined,
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
    });

    setAdBrand('');
    setAdTitle('');
    setShowAdModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* Admin Header */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              Süper Yönetici (Admin)
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              Merkezi Sistem Yönetimi & Moderasyon
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            BilardoGo Yönetim Konsolu
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Şehir reklamları, salon kayıtları, salon abonelikleri ve şikayet moderasyon merkezi.
          </p>
        </div>

        <button
          onClick={onOpenDocs}
          className="px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-2 border border-neutral-700 transition-colors self-start sm:self-auto"
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span>Teknik Şartname & Döküman</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Kayıtlı Oyuncu</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">
            {totalUsersCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Onaylı Salon</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">
            {approvedSalonsCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Tahmini MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {estimatedMrr.toLocaleString('tr-TR')} ₺
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Bekleyen Şikayet</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1 font-mono">
            {pendingReportsCount}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('genel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'genel'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Genel Bakış & Abonelikler</span>
        </button>

        <button
          onClick={() => setActiveTab('reklamlar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'reklamlar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Şehir / Türkiye Reklamları ({ads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('salonlar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'salonlar'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Salonlar & Lisanslar ({salons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('moderasyon')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'moderasyon'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white bg-neutral-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Şikayetler & Moderasyon ({pendingReportsCount})</span>
        </button>
      </div>

      {/* Tab 1: Genel Bakış & Abonelik Modeli */}
      {activeTab === 'genel' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              SaaS Gelir Modeli & Abonelik Durumu (Şartname Sayfa 21)
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Bilardo salonlarına ilk ay <strong>30 gün ücretsiz deneme sürümü</strong> tanımlanır.
              Ardından her salon için aylık <strong>2.000 TL</strong> sabit platform lisans bedeli fatura edilir.
              Platform bünyesinde salonlar arası maç organizasyonu ve masaya sipariş modülleri aktif olarak çalışır.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                <div className="text-neutral-500">Aylık Salon Abonelik Ücreti</div>
                <div className="text-lg font-bold text-white mt-1">2.000 ₺ / Ay</div>
              </div>
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                <div className="text-neutral-500">Aktif Deneme Sürümündeki Salonlar</div>
                <div className="text-lg font-bold text-amber-400 mt-1">2 Salon (26 gün kaldı)</div>
              </div>
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                <div className="text-neutral-500">Yıllık Potansiyel Gelir (ARR)</div>
                <div className="text-lg font-bold text-emerald-400 mt-1">{(estimatedMrr * 12).toLocaleString('tr-TR')} ₺</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Reklam Yönetimi (Ads Management) */}
      {activeTab === 'reklamlar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Sponsor & Banner Reklamları</h3>
              <p className="text-xs text-neutral-400">Türkiye geneli veya şehir hedefli sponsor afişleri yönetin.</p>
            </div>
            <button
              onClick={() => setShowAdModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Reklam Tanımla</span>
            </button>
          </div>

          <div className="space-y-3">
            {ads.map(ad => (
              <div
                key={ad.id}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={ad.bannerImage}
                    alt={ad.brand}
                    className="w-24 h-16 rounded-xl object-cover border border-neutral-800 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{ad.brand}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-neutral-800 text-neutral-300">
                        {ad.targetScope === 'TURKIYE_GENELI' ? '🇹🇷 Türkiye Geneli' : `📍 ${ad.targetCity}`}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-0.5">{ad.title}</p>
                    <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-3">
                      <span>Tarih: {ad.startDate} - {ad.endDate}</span>
                      <span>•</span>
                      <a href={ad.targetLink} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                        Bağlantı <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    onClick={() => toggleAdStatus(ad.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      ad.isActive
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                    }`}
                  >
                    {ad.isActive ? 'Yayında (Aktif)' : 'Pasif'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Salonlar ve Lisanslar */}
      {activeTab === 'salonlar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Sisteme Kayıtlı Salonlar</h3>
            <span className="text-xs text-neutral-400">{salons.length} Toplam Salon</span>
          </div>

          <div className="space-y-3">
            {salons.map(s => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={s.coverImage}
                    alt={s.name}
                    className="w-14 h-14 rounded-xl object-cover border border-neutral-800 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{s.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {s.city} / {s.district} • {s.tables.length} Masa ({s.openHours})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400">Üyelik:</span>
                  <span className="font-bold text-amber-400">30 Gün Deneme</span>
                  <button
                    onClick={() => showToast(`${s.name} detayları güncellendi.`)}
                    className="ml-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors"
                  >
                    Yönet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Moderasyon & Şikayetler */}
      {activeTab === 'moderasyon' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Şikayet ve İhlal Bildirimleri</h3>
              <p className="text-xs text-neutral-400">Kullanıcılar veya mesajlar hakkında iletilen moderasyon kayıtları.</p>
            </div>
            <span className="text-xs text-red-400 font-bold">{pendingReportsCount} Bekleyen</span>
          </div>

          <div className="space-y-3">
            {reports.map(rep => {
              const reportedUser = users.find(u => u.id === rep.reportedUserId);
              const reporterUser = users.find(u => u.id === (rep.reporterId || rep.reporterUserId));
              const isResolved = rep.status === 'ISLEM_YAPILDI' || rep.status === 'REDDEDILDI';

              return (
                <div
                  key={rep.id}
                  className={`p-5 rounded-3xl border transition-all space-y-3 shadow-lg ${
                    isResolved
                      ? 'bg-neutral-900/60 border-neutral-800 opacity-60'
                      : 'bg-neutral-900 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                        {rep.targetType} ŞİKAYETİ
                      </span>
                      <span className="text-xs text-neutral-500">{rep.createdAt}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isResolved
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <div>
                      <span className="text-neutral-400">Şikayet Edilen: </span>
                      <strong className="text-white">{reportedUser?.name || rep.reportedUserId}</strong>
                      <span className="text-neutral-500 mx-2">•</span>
                      <span className="text-neutral-400">Bildiren: </span>
                      <strong className="text-neutral-300">{reporterUser?.name || rep.reporterId}</strong>
                    </div>

                    <div>
                      <span className="text-neutral-400">Gerekçe: </span>
                      <span className="text-red-400 font-semibold">{rep.reason}</span>
                    </div>

                    {rep.messageSnippet && (
                      <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 text-neutral-300 italic">
                        "{rep.messageSnippet}"
                      </div>
                    )}
                  </div>

                  {!isResolved && (
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800/80">
                      <button
                        onClick={() => resolveReport(rep.id, 'UYARI')}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
                      >
                        Kullanıcıyı Uyar
                      </button>
                      <button
                        onClick={() => resolveReport(rep.id, 'MESAJ_SILINDI')}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-semibold transition-colors"
                      >
                        Mesajı Kaldır
                      </button>
                      <button
                        onClick={() => resolveReport(rep.id, 'ENGELLEME')}
                        className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-colors shadow-md"
                      >
                        Kullanıcıyı Yasakla
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {reports.length === 0 && (
              <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-xs text-neutral-500">
                Şu an aktif şikayet kaydı bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="font-bold text-base text-white">Yeni Reklam / Sponsor Tanımla</h4>
              <button onClick={() => setShowAdModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAd} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Marka Adı</label>
                <input
                  type="text"
                  placeholder="Örn: Aramith Pro Balls"
                  value={adBrand}
                  onChange={e => setAdBrand(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Reklam Başlığı / Sloganı</label>
                <input
                  type="text"
                  placeholder="Örn: Türkiye Şampiyonlarının Tercihi!"
                  value={adTitle}
                  onChange={e => setAdTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Görsel URL</label>
                <input
                  type="text"
                  value={adImage}
                  onChange={e => setAdImage(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Yönlendirme Linki</label>
                <input
                  type="text"
                  value={adLink}
                  onChange={e => setAdLink(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Hedef Kapsam</label>
                  <select
                    value={adScope}
                    onChange={e => setAdScope(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="TURKIYE_GENELI">Türkiye Geneli</option>
                    <option value="SEHIR_BAZLI">Şehir Bazlı</option>
                  </select>
                </div>
                {adScope === 'SEHIR_BAZLI' && (
                  <div>
                    <label className="text-neutral-400 block mb-1">Hedef Şehir</label>
                    <select
                      value={adCity}
                      onChange={e => setAdCity(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                    >
                      <option value="İstanbul">İstanbul</option>
                      <option value="Ankara">Ankara</option>
                      <option value="İzmir">İzmir</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-md"
                >
                  Reklamı Yayınla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
