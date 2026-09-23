# BilardoGo - Kapsamlı Teknik ve Mimari Dokümantasyon

## 1. Genel Mimari ve Sistem Tasarımı

**BilardoGo**, Türkiye ve dünya genelindeki bilardo sporcularını, kulüp ve salon işletmelerini tek bir dijital platformda buluşturan modern, gerçek zamanlı bir spor ve sosyal topluluk platformudur.

### Teknoloji Yığını (Tech Stack)
- **Frontend Framework:** React 19 (TypeScript)
- **Yapılandırma & Dev Server:** Vite 8, ESBuild
- **Stil & Tasarım Sistemi:** Tailwind CSS v4, Lucide React ikon seti, Google Fonts (Plus Jakarta Sans, Outfit, JetBrains Mono)
- **Durum Yönetimi (State Management):** React Context API (`AppContext`), Hook tabanlı mimari
- **Kalıcılık (Persistence):** Tarayıcı tabanlı `localStorage` ve reaktif senkronizasyon
- **Kamera & QR Motoru:** `qrcode` kütüphanesi & HTML5 Canvas / Video akış entegrasyonu
- **Animasyon & Efektler:** `motion/react`, `canvas-confetti`

---

## 2. Kullanıcı Deneyimi & Modül Mimarisi

Sistem, kullanıcının rol kargaşasına girmeden doğrudan sporcu deneyimine odaklanmasını sağlayan modern bir düzene sahiptir:

```
[ Navbar: Logo + Şehir Seçici + Bildirimler + Canlı QR Tarayıcı ]
   ├── [1. Kullanıcı Ana Sayfası (UserHomeView)]
   ├── [2. Salon Detay Sayfası (SalonDetailView)]
   ├── [3. Etkinlik Alanı & Bülten (EventsBulletinView)]
   ├── [4. Aktif Maç / Canlı Masa Skorbordu (ActiveMatchView)]
   ├── [5. Kullanıcı Profili & İstatistikler (UserProfileView)]
   ├── [6. Sosyal Topluluk & Sohbet (SocialView)]
   └── [7. Kafeterya & Masa Siparişi (OrderFoodView)]
[ BottomNav: 5 Temel Kullanıcı Rotası (Ana Sayfa, Salonlar, Etkinlik, Sosyal, Profil) ]
```

---

## 3. Modül Detayları ve Fonksiyonel Özellikler

### 3.1. Kullanıcı Ana Sayfası (`UserHomeView.tsx`)
- **Şehir Filtreleme:** Kullanıcı istediği şehri (İstanbul, Ankara, İzmir, Bursa, Antalya veya Tüm Türkiye) seçer.
- **Hızlı Durum ve Maç Arama:** "Oyuna Hazırım / Maç Arıyorum", "Salondayım" veya "Geliyorum" durumunu tek tıkla güncelleme.
- **Şehirdeki Salon Kartları:**
  - Salon adı, yüksek çözünürlüklü kapak görseli ve yıldız puanı.
  - Açık/kapalı anlık durum göstergesi ve çalışma saatleri.
  - Tam adres ve harita konumu.
  - Canlı masadaki ve salondaki aktif oyuncu sayısı.
  - "Yol Tarifi Al" (Google Maps) ve "Salona Gir" aksiyonları.
- **Hızlı Masa QR Okutma:** Kamerayla masadaki QR kodu taratarak doğrudan masaya oturma veya maçı başlatma.

### 3.2. Salon Sayfası (`SalonDetailView.tsx`)
Salonun tüm operasyonel ve sosyal detaylarını tek ekranda sunar:
- **Salon Bilgileri & Fotoğraf Galerisi:** Salon iç mekanı, turnuva alanı ve masaları gösteren lightbox destekli fotoğraf galerisi.
- **Harita & Konum:** Enlem/boylam koordinatları, açık adres ve doğrudan Google Maps üzerinden navigasyon başlatma bağlantısı.
- **İletişim & Çalışma Saatleri:** Doğrudan `tel:` araması yapılabilen telefon hattı ve haftalık çalışma saatleri.
- **Masa Türleri ve Sayıları:** 3 Bant maç masaları, Karambol, Amerikan (Pool/9-Top) ve Snooker masalarının adet ve durum dökümü.
- **Canlı Masa Takibi (Boş/Dolu):**
  - Boş masalar için oyun türleri ve masa QR kodu.
  - Dolu masalar için aktif oynayan oyuncuların isimleri ve geçen süre (dakika).
- **Salondaki Oyuncular & Birazdan Gelecekler:**
  - Salonda hazır bulunan oyuncuların seviyeleri, 3 Bant genel ortalamaları ve "Maç Teklifi" butonu.
  - Geleceğini bildiren oyuncuların tahmini varış süreleri (ETA).
- **Maç Arayanlar Listesi:** Bu salonda veya aynı şehirde rakip bekleyen sporcular.
- **Duyurular & Kampanyalar:** Mutlu saatler, çuha yenileme duyuruları ve ekipman indirimleri.
- **Turnuva ve Etkinlikler:** Salona özel organize edilen müsabakalar ve anlık başvuru.

### 3.3. Kullanıcı Profili & İstatistik Motoru (`UserProfileView.tsx`)
- **Kimlik & Statü:** Profil fotoğrafı, ad/soyad, `@kullanıcı_adı`, şehir, seviye rozeti.
- **Bilardo Devamlılığı (Streak):** Düzenli antrenman ve oyun alışkanlığını gösteren gün serisi sayacı ve toplam masa süresi.
- **3 Bant ve Karambol Resmi Ortalamaları:**
  $$\text{Genel Ortalama} = \frac{\sum \text{Toplam Sayı}}{\sum \text{Toplam İsteka}}$$
  *Uluslararası standartlara uygun olarak 3 ondalık basamak hassasiyetle (`0.000`) hesaplanır.*
- **Oyun Türüne Göre İstatistikler:** 3 Bant, Karambol, Amerikan ve Snooker branşları için ayrı ayrı maç sayısı, galibiyet/mağlubiyet oranları ve en yüksek seri (`highestRun`).
- **Kariyer Maç Bilgileri:** Toplam maç, kazanılan maçlar, kaybedilen maçlar ve galibiyet yüzdesi (`winRate`).
- **Oyuncu-Oyuncu Karşılıklı Maç Geçmişi (Head-to-Head):**
  - İki sporcu arasında bugüne kadar oynanan tüm onaylı maçların galibiyet/mağlubiyet kaydı.
  - Branş bazında filtrelenebilir (Örn: Berkay vs Tarık: 4 Galibiyet - 2 Mağlubiyet).
- **Son Oynanan Maçlar Listesi:** Rakip adı, maç tarihi, sayı/isteka tutanağı, oynanan salon ve skor tablosu.
- **Manuel Ortalama & Bireysel Antrenman Günlüğü:**
  - Sporcuların kendi antrenmanlarında yaptığı sayı ve istekaları girebildiği özel form.
  - Hesaplanan ortalama, en yüksek seri ve antrenman notları ile genel ortalamaya otomatik yansıma.
- **Tercih Edilen / Favori Salonlar:** En sık ziyaret edilen kulüpler ve sadakat saatleri.

### 3.4. Sosyal Topluluk & Çok Kanallı Sohbet (`SocialView.tsx`)
- **Kanal Segmentasyonu:**
  1. *Türkiye Sohbeti:* Tüm sporcuların katıldığı genel ulusal oda.
  2. *Şehir Sohbeti:* Seçili şehre özel yerel oyuncu ağı.
  3. *Salon Sohbeti:* Belirli bir salona özel anlık sohbet.
  4. *Özel Mesajlaşma (DM):* Oyuncular arası birebir gizli mesajlaşma odaları.
- **Medya Desteği:**
  - Yüksek çözünürlüklü bilardo fotoğrafı paylaşımı.
  - Video paylaşımı ve entegre HTML5 video oynatıcı.
- **Mesaj Yanıtlama (Thread / Reply):** Yanıtlanan mesajın yazarını ve metnini referans gösteren alıntılı cevap sistemi.
- **Arkadaş Yönetimi:** Oyuncuları arkadaş olarak ekleme (`UserPlus`) ve listeden çıkarma.
- **Kullanıcı Engelleme:** İstenmeyen kullanıcıları engelleme; engellenen kullanıcıların mesajları sohbette filtrelenir.
- **Moderasyona Şikayet Sistemi:**
  - Hakaret, yanıltıcı skor veya kural ihlali durumunda doğrudan moderasyon masasına şikayet kaydı oluşturma.
  - Şikayet gerekçesi ve mesaj bağlamı güvenlik loglarına işlenir.

### 3.5. Etkinlik Alanı & Bülten (`EventsBulletinView.tsx`)
- **Aktif Turnuvalar:** Turnuva tarihi, oyun türü, katılım kontenjanı, ödül havuzu, kurallar ve "Turnuvaya Başvur" butonu. Katılım ücreti salonda kasada ödenir.
- **Hafta Sonu Mini Şampiyonaları:** Cumartesi ve Pazar günlerine özel handikaplı hızlı turnuvalar ve başvuru takibi.
- **Salon Duyuru & Kampanyaları:** Şehirdeki salonların aktif indirimleri ve duyuruları.
- **Bilardo Dünyası Bülteni:** Türkiye ve dünya şampiyonalarından haberler, röportajlar ve eğitim videoları.

### 3.6. Kafeterya & Masa Sipariş Oturumu (`OrderFoodView.tsx`)
- **Oturum Türleri:** Masada maç yapan oyuncular doğrudan masa numarasına; maçı izleyenler ise benzersiz `BGO-XXXX` sipariş koduyla ortak oturuma dahil olabilir.
- **Sipariş Listesi & İkramlar:** Çay, kahve, tost, soğuk içecekler ve atıştırmalıklar.
- **Kasada Ödeme Entegrasyonu:** Siparişler hazırlandığında salona anlık mutfak fişi düşer, ücret oyundan sonra kasada ödenir.

---

## 4. Veri Modeli Özeti (`src/types.ts`)

- `User`: Sporcu kimliği, seviyesi, tercih ettiği oyunlar, istatistikleri ve devamlılık günleri.
- `Salon`: Kulüp bilgileri, çalışma saatleri, masaları, menüsü, duyuruları ve koordinatları.
- `SalonTable`: Masa numarası, desteklenen oyun türleri, canlı durum (`BOS`/`DOLU`/`BAKIMDA`), aktif oyuncular ve QR kimliği.
- `MatchRequest` & `MatchResult`: Maç eşleşmesi, handikap ayarları, süre/isteka sınırlaması, onaylanan skor ve ortalama verileri.
- `HeadToHeadRecord`: Oyuncu-oyuncu bazında tutulan net karşılaşma karnesi.
- `SoloPracticeRecord`: Bireysel antrenman sayı, isteka ve seri günlüğü.
- `ChatMessage`: Çok kanallı sohbet, medya URL'leri, yanıt referansları ve moderasyon bayrakları.
- `Tournament` & `WeekendEvent`: Etkinlik detayları, kayıtlı oyuncu kimlikleri ve ödül tanımları.

---

## 5. Doğrulama ve Çalıştırma

Uygulama üretim standartlarında derlenmiş, TypeScript tür denetimlerinden başarıyla geçmiş ve Vite geliştirme sunucusu üzerinde port 3000 üzerinden aktif olarak hizmet vermektedir.
