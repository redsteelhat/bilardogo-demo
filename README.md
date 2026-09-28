# BilardoGo

Bilardo oyuncularını, salonlarını ve bilardo ekosistemini tek platformda buluşturan PWA.
Kullanıcı şehrindeki salonları ve salondakileri görür, durumunu paylaşır (Salondayım / Geleceğim), rakip bulup maç ayarlar,
masadaki QR ile gerçek masaya bağlanır, sonucu girer, rakibi onaylar ve istatistikleri profiline işlenir. İşletmeler salon,
masa, sipariş, duyuru ve çalışanlarını yönetir; tüm sistem ayrı bir admin sitesinden kontrol edilir.

## Yapı

```
apps/
  web/     Next.js 15 — kullanıcı PWA + işletme paneli (/isletme)        → Vercel projesi 1
  admin/   Next.js 15 — BilardoGo admin sitesi                          → Vercel projesi 2
packages/
  domain/  Saf iş kuralları: oyun türleri, format, sonuç doğrulama, ortalama (4. haneye göre yuvarlama),
           maç durum makinesi, durum süreleri, çalışma saatleri, Türkçe ekler, VKN/TCKN, zod şemaları
  db/      Drizzle şeması, migration'lar (RLS, trigger, realtime, pg_cron, storage), temel seed
  api/     tRPC router'ları (meta, me, venues, presence, matches, players, social, notifications,
           orders, feed, business, admin), bildirim servisi, entegrasyon testleri, demo seed
  ui/      Tema (siyah-turuncu, Fraunces + Plus Jakarta Sans) ve bileşenler
  config/  Ortak tsconfig
```

Veri, kimlik, dosya ve canlı yayın **Supabase**'de; iş kuralları sunucuda tRPC ile uygulanır. Tarayıcı Supabase'e yalnız
Auth, Realtime (yalnız "değişti" sinyali) ve imzalı dosya yükleme için bağlanır. Tüm tablolarda RLS açıktır ve anon/authenticated
rollerine tablo erişimi verilmez.

Veritabanı düzeyinde garanti edilen kurallar:
- Bir kullanıcı aynı anda yalnız 1 aktif maçta olabilir (`match_players_user_active_key`).
- Bir masada aynı anda yalnız 1 aktif maç olabilir (`matches_table_active_key`).
- Masa yalnız izin verdiği oyun türleriyle kullanılabilir (trigger).
- Süresi dolan durumlar, yanıtsız istekler, 5 dk'da katılınmayan masa oturumları ve 24 saatte onaylanmayan sonuçlar
  `bg_run_maintenance()` ile kapanır (pg_cron dakikada bir + Vercel Cron yedeği).

## Yerel geliştirme

Gereksinimler: Node 22, pnpm 10, bir Postgres 15+ (Supabase projesi veya yerel).

```bash
pnpm install
cp .env.example .env                       # DIRECT_URL
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
pnpm db:migrate && pnpm db:seed            # şema + iller, şablonlar, sözleşmeler, katalog, planlar
pnpm db:seed:demo                          # (opsiyonel) demo salonlar, oyuncular, maçlar
pnpm dev                                   # web :3000, admin :3001
```

Supabase olmadan yerel test: Supabase şemalarının taklidini `packages/db/test-support/supabase-stub.sql` ile kurup
`.env.local` dosyasına `BG_DEV_LOGIN=1` ekleyin; `next dev` altında `http://localhost:3000/dev/giris` demo kullanıcılarla
giriş sağlar (üretimde devre dışıdır). Bu modda Realtime ve dosya yükleme çalışmaz, sayfalar periyodik yenilemeyle çalışır.

## Test

```bash
pnpm typecheck
pnpm lint
pnpm test          # domain birim testleri + gerçek Postgres üzerinde API akış testleri
```

API testleri `TEST_DATABASE_URL` (varsayılan `postgres://postgres@localhost:54322/postgres`) üzerinde her test dosyası için
şablondan yeni bir veritabanı kopyalar: maç akışı, tek aktif maç, masa kilidi, masa oturumu, sipariş + izleyici, çalışan
yetkileri, moderasyon bağlamı, abonelik zorunluluğu, bülten hedefleme, şablon düzenleme, hesap silme.

## Canlıya çıkış

Adım adım rehber: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Kapsam dışı (sonraki sürümler)

- Turnuva sistemi ve hafta sonu etkinlikleri (ayrı belgeler bekleniyor — V1.1)
- Sadakat / ödül sistemi (V2)
- Kartla otomatik abonelik tahsilatı: bu sürümde ödemeler admin panelinden manuel kaydedilir; abonelik hakkı backend'de
  doğrulanır ve Admin → Ayarlar → "Abonelik zorunlu" ile devreye alınır.
- Native mobil uygulama
