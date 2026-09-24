import React, { useState } from 'react';
import { X, BookOpen, Layers, ShieldCheck, Database, Cpu, QrCode, Award, Utensils, Bell, Terminal, CheckCircle2, Copy } from 'lucide-react';

interface TechDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechDocsModal: React.FC<TechDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'genel' | 'salon_sayfasi' | 'mimari' | 'modeller' | 'qr_mac' | 'istatistik' | 'api'>('salon_sayfasi');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyDocMarkdown = () => {
    const docText = `# BilardoGo - Kapsamlı Sistem Mimarisi ve Teknik Dökümantasyon
Versiyon: 1.0.0 Production Release
Roller: Kullanıcı (Oyuncu) / Salon İşletmesi / Salon Çalışanı / Süper Admin

## 1. Salon Sayfası ve İşletme Sistemi
- Canlı Masa Durumları: Müsait, Dolu, Kullanım Dışı.
- Salondaki Aktif Oyuncular: İsim-soyisim başharf rozetleri ([TÇ], [BK], [...]).
- Birazdan Gelecekler: Tahmini varış süresi (ETA dk).
- Maç Arayanlar: Bu salonda veya civarında rakip bekleyen aktif oyuncular.
- Saatlik Masa Ücretleri: Salon ve masa bazlı saatlik ücret (TL/saat) şeffaf gösterimi.
- Masaya Sipariş Sistemi: Sipariş Edildi -> Hazırlanıyor -> Servis Edildi -> Kasada Ödeme.
- Masa Ekleme & Masa Türü Seçimi: 3 Bant, Karambol, Amerikan, 9 Top, Snooker.
- Salon Profil Bilgileri: VKN, adres, telefon, Simonis çuha ve olanaklar düzenleme.`;

    navigator.clipboard.writeText(docText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                BilardoGo Teknik Dökümantasyonu
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  v1.0 Tam Sürüm
                </span>
              </h2>
              <p className="text-xs text-neutral-400">Mimari, veri şemaları, maç durum akışları ve API kontratları</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyDocMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors border border-neutral-700"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopyalandı' : 'Markdown Kopyala'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-neutral-950/60 border-b border-neutral-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('salon_sayfasi')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'salon_sayfasi' ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            🎱 Salon Sayfası & İşletme Sistemi
          </button>
          <button
            onClick={() => setActiveTab('genel')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'genel' ? 'bg-amber-500 text-neutral-950 shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            1. Genel Mimari
          </button>
          <button
            onClick={() => setActiveTab('modeller')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'modeller' ? 'bg-amber-500 text-neutral-950 shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            2. Veri Modelleri (ER)
          </button>
          <button
            onClick={() => setActiveTab('qr_mac')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'qr_mac' ? 'bg-amber-500 text-neutral-950 shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            3. QR & Maç Akışı
          </button>
          <button
            onClick={() => setActiveTab('istatistik')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'istatistik' ? 'bg-amber-500 text-neutral-950 shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            4. İstatistik & Ortalama
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'api' ? 'bg-amber-500 text-neutral-950 shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            5. API & Güvenlik
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {activeTab === 'salon_sayfasi' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-base">
                  <BookOpen className="w-5 h-5" />
                  <span>BilardoGo Nedir? Salon Sayfası & İşletme Ekosistemi</span>
                </div>
                <p className="text-neutral-200 text-xs leading-relaxed">
                  Salon Sayfası, BilardoGo platformunun hem oyuncular hem de bilardo kulübü işletmeleri için kalbi niteliğindedir. Oyuncular gitmeden önce salonun doluluğunu, masalardaki oyuncuları ve saat ücretini görür; işletme ise masalarını, siparişlerini ve turnuvalarını tek panelden yönetir.
                </p>
              </div>

              {/* 2 Sütun: Oyuncu Arayüzü & İşletme Paneli */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="font-extrabold text-amber-400 flex items-center gap-2 text-sm border-b border-neutral-800 pb-2">
                    <span>1. Oyuncular İçin Salon Sayfası Neleri İçerir?</span>
                  </div>
                  <ul className="text-xs space-y-2.5 text-neutral-300">
                    <li>
                      <strong className="text-white">✓ Canlı Masa Durumları:</strong> Salonun masalarının Müsait, Dolu veya Kullanım Dışı durumları anlık olarak görüntülenir.
                    </li>
                    <li>
                      <strong className="text-white">✓ Salondaki Aktif Oyuncular:</strong> Salondaki oyuncuların isim-soyisim başharfleri yuvarlak rozetler içinde (örn: [TÇ], [BK], [...]) listelenir.
                    </li>
                    <li>
                      <strong className="text-white">✓ Birazdan Gelecekler & ETA:</strong> Salona doğru yola çıkan oyuncuların tahmini varış dakikası görüntülenir.
                    </li>
                    <li>
                      <strong className="text-white">✓ Maç Arayanlar:</strong> Salonda rakip bekleyen bilardo severler listelenir ve tek tıkla handikaplı maç teklif edilir.
                    </li>
                    <li>
                      <strong className="text-white">✓ Masa Başı Saat Ücreti:</strong> Salonun güncel saatlik masa ücreti (örn: 300 ₺ / saat) şeffafça listelenir.
                    </li>
                    <li>
                      <strong className="text-white">✓ Kafeterya Menüsü & Sipariş:</strong> Maçı bölmeden masaya çay, kahve veya tost siparişi verilir (Durum: 'Sipariş Edildi' → 'Hazırlanıyor' → 'Servis Edildi').
                    </li>
                    <li>
                      <strong className="text-white">✓ QR Kod ile Masaya Bağlanma:</strong> Masadaki QR kodu kameraya okutarak anında maça başlanır.
                    </li>
                    <li>
                      <strong className="text-white">✓ Salon Detayları & İletişim:</strong> Simonis 300 çuha, ısıtmalı masa özellikleri, açık adres, Google Maps yol tarifi ve telefon.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="font-extrabold text-emerald-400 flex items-center gap-2 text-sm border-b border-neutral-800 pb-2">
                    <span>2. Salon İşletme Paneli Hangi Özellikleri Sağlar?</span>
                  </div>
                  <ul className="text-xs space-y-2.5 text-neutral-300">
                    <li>
                      <strong className="text-white">✓ 3'lü Masa Durumu Kontrolü:</strong> Masaları tek tıkla <strong>Müsait</strong>, <strong>Dolu</strong> veya <strong>Kullanım Dışı</strong> yapabilme.
                    </li>
                    <li>
                      <strong className="text-white">✓ Masa Ekleme & Masa Türü Seçimi:</strong> 3 Bant, Karambol, Amerikan, 9 Top veya Snooker masa türlerini seçerek yeni masa ekleme/düzenleme/silme.
                    </li>
                    <li>
                      <strong className="text-white">✓ Saatlik Masa Ücreti Değiştirme:</strong> Salonun saatlik ücretini dilediği an güncelleme ve süre bazlı ciro hesaplama.
                    </li>
                    <li>
                      <strong className="text-white">✓ Menü Oluşturma & Fiyat Belirleme:</strong> Sıcak/soğuk içecek, tost ve atıştırmalık ürünleri ekleme, fiyatlarını belirleme ve mevcudiyet güncelleme.
                    </li>
                    <li>
                      <strong className="text-white">✓ Sipariş Durumu Yönetimi:</strong> Gelen siparişleri 'Sipariş Edildi' adımından alıp mutfak/servis sürecine taşıma.
                    </li>
                    <li>
                      <strong className="text-white">✓ Salon Profil Bilgilerini Doldurma:</strong> VKN vergi no, çalışma saatleri, açık adres, olanaklar ve fotoğrafları düzenleme.
                    </li>
                    <li>
                      <strong className="text-white">✓ Turnuva Organizatörü & Duyurular:</strong> Salon kupaları açma, katılımcı toplama, kura çekme ve kampanya duyurusu yayınlama.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'genel' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <h3 className="font-bold text-amber-400 text-base mb-1">Platformun Amacı ve Ekosistem</h3>
                <p className="text-neutral-300">
                  BilardoGo; Türkiye çapında ve şehir bazlı bilardo oyuncularını, salon işletmelerini ve federasyon/özel turnuvaları tek bir çatı altında birleştiren spor-sosyal platformdur.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> 1. Kullanıcı (Oyuncu)
                  </div>
                  <ul className="text-xs space-y-1.5 text-neutral-400">
                    <li>• Şehirdeki açık/kapalı salonları ve anlık oyuncuları görme</li>
                    <li>• Salondayım / Geleceğim (ETA) durum bildirimi</li>
                    <li>• Maç arama ve formatlı maç teklifi (Handikap, İsteka)</li>
                    <li>• QR ile masaya oturup canlı maç başlatma</li>
                    <li>• 3 Bant / Karambol genel ortalama hesaplama</li>
                    <li>• Masa ve grup içi kafe siparişi</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> 2. İşletme & Çalışan
                  </div>
                  <ul className="text-xs space-y-1.5 text-neutral-400">
                    <li>• Salon profili, çalışma saatleri, masa tanımları</li>
                    <li>• Masalara özel Maç QR ve Sipariş QR üretimi</li>
                    <li>• Canlı masa takibi (Hangi masa dolu, kim ne süredir oynuyor)</li>
                    <li>• Kasa & mutfak sipariş takip ekranı (Ödeme kasada)</li>
                    <li>• Çalışan hesabı (Sınırlı yetki: siparişler & duyurular)</li>
                    <li>• Salon içi turnuva ve hafta sonu etkinlik yönetimi</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> 3. Merkezi Admin
                  </div>
                  <ul className="text-xs space-y-1.5 text-neutral-400">
                    <li>• Kullanıcı ve işletme doğrulama (VKN/TCKN inceleme)</li>
                    <li>• Türkiye geneli ve il bazlı reklam/sponsorluk yayını</li>
                    <li>• Haber ve bülten CMS (Canlı yayın linkleri, eğitim videoları)</li>
                    <li>• Şikayet ve moderasyon kuyruğu (Mesaj bağlamı inceleme)</li>
                    <li>• Dinamik bildirim şablon motoru</li>
                    <li>• Sadakat ve masa saati ödül tanımları</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'modeller' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">Veritabanı Varlık Şemaları</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs">
                  <div className="text-amber-400 font-bold mb-2">User (Kullanıcı Varlığı)</div>
                  <pre className="text-neutral-400 overflow-x-auto whitespace-pre">
{`{
  id: string,
  name: string,
  username: string,
  city: string,
  level: "Başlangıç" | "Orta" | "İleri" | "Usta",
  role: "kullanici" | "isletme" | "calisan" | "admin",
  salonStatus: "SALONDA" | "GELECEK" | "CEVRIMDISI",
  matchStatus: "OYNAYACAK" | "ISTEMIYOR" | "MAC_YAPACAK" | "MACTA",
  stats: {
    totalMatches: number,
    wins: number, losses: number,
    threeCushion: { points, innings, generalAverage, highestRun },
    carom: { points, innings, generalAverage, highestRun },
    american: { racksWon, racksLost, matchesWon },
    snooker: { framesWon, framesLost, highestBreak }
  },
  loyaltyHoursPlayed: number,
  subscription: { plan, trialEndDate, isActive }
}`}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs">
                  <div className="text-emerald-400 font-bold mb-2">SalonTable & MatchRequest</div>
                  <pre className="text-neutral-400 overflow-x-auto whitespace-pre">
{`SalonTable:
{
  id: string,
  salonId: string,
  tableNumber: number,
  allowedGames: BilliardGameType[],
  status: "BOS" | "DOLU" | "BAKIMDA",
  currentMatchId?: string,
  activePlayerNames: string[],
  startTime?: string,
  qrCode: "BILARDOGO://SALON/{id}/TABLE/{num}"
}

MatchRequest:
{
  id: string,
  senderId: string,
  receiverId: string,
  gameType: "3_BANT" | "KARAMBOL" | "AMERIKAN" | "DOKUZ_TOP" | "SNOOKER",
  targetScoreOrRacks: number,
  targetInnings?: number,
  hasHandicap: boolean,
  status: "BEKLEMEDE" | "KABUL_EDILDI" | "MAC_BASLADI" | "SONUC_BEKLIYOR" | "TAMAMLANDI"
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qr_mac' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">QR Kod & Canlı Masa Eşleştirme Akışı</h3>
              <p className="text-neutral-400 text-xs">
                QR kodları güvenlik ve sade mimari gereği yalnızca <strong className="text-amber-400">Salon + Masa Numarası</strong> içerir. Oyuncu veya skor verisi QR içine gömülmez.
              </p>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="font-semibold text-amber-400">Önceden Eşleşmiş Oyuncular Akışı:</div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-300">İstek Gönder</span>
                  <span>→</span>
                  <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-300">Kabul Edildi</span>
                  <span>→</span>
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Maç Yapacak</span>
                  <span>→</span>
                  <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400">Masa QR Okut</span>
                  <span>→</span>
                  <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400">Masa Dolu & Maçta</span>
                  <span>→</span>
                  <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-400">Maçı Bitir</span>
                  <span>→</span>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400">Sonuç Onayı & Masa Boş</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="font-semibold text-emerald-400">Doğrudan Masada Karşılaşan Oyuncular:</div>
                <p className="text-xs text-neutral-400">
                  Masadaki QR kodunu okutan oyuncu, masada oynanabilen oyun türlerini görür (Örn: Masa 3 sadece 3 Bant ise Amerikan seçilemez). Rakibi seçer, sistem iki oyuncuyu bağlar ve masa canlı olarak dolu duruma geçer.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'istatistik' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">İstatistik ve 3 Bant Ortalama Kuralları</h3>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="font-semibold text-amber-400">3 Bant ve Karambol Ortalama Formülü:</div>
                <div className="p-3 bg-neutral-900 rounded-lg font-mono text-xs text-neutral-300">
                  Ortalama = Toplam Sayı / Toplam İsteka<br/>
                  Sonuç virgülden sonra 3 basamakla saklanır (Örn: 0.852). Dördüncü basamağa göre matematiksel yuvarlama uygulanır.
                </div>
                <ul className="text-xs space-y-2 text-neutral-400">
                  <li>• <strong>Hatırlamıyorum Kuralı:</strong> Seri veya break hatırlanmıyorsa 0 olarak işlenmez; sistemde 'unremembered' olarak işaretlenir, sporcunun genel istatistikleri kirletilmez.</li>
                  <li>• <strong>Karşılıklı Maç Geçmişi (Head-to-Head):</strong> Oyuncu profilinde diğer oyuncularla geçmiş maçlar (Galibiyet/Mağlubiyet/Ortalama) oyun türüne göre filtrelenebilir.</li>
                  <li>• <strong>Bireysel Antrenman Kaydı:</strong> Sporcu salonda tek başına antrenman yaparken de sayı/isteka değerini girip genel ortalamasına resmi olarak yansıtabilir.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">REST API Kontratları ve Güvenlik</h3>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs space-y-2">
                <div className="text-emerald-400 font-bold">API Endpointleri:</div>
                <div className="text-neutral-300">POST /api/matches/request - Maç teklifi oluştur</div>
                <div className="text-neutral-300">POST /api/matches/:id/accept - Maç kabul et</div>
                <div className="text-neutral-300">POST /api/tables/:id/bind-qr - Masaya maç bağla (Dolu yap)</div>
                <div className="text-neutral-300">POST /api/matches/:id/result - Sonuç gönder (Rakip onayı bekler)</div>
                <div className="text-neutral-300">POST /api/matches/:id/confirm - Sonucu onayla, masayı boşalt</div>
                <div className="text-neutral-300">POST /api/orders/place - Salon içi kafe siparişi ver (Kasada ödemeli)</div>
                <div className="text-neutral-300">GET  /api/admin/moderation - Şikayet kuyruğunu getir</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400">
          <div>BilardoGo Platform Spesifikasyonu • Tam Uyumlu Uygulama</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
