# Canlıya çıkış: Supabase + Vercel

Sıra: Supabase (staging → prod) → migration + temel veri → Vercel iki proje → alan adları → ilk admin → kontrol listesi.
Önce her şeyi **staging**'de kurup denedikten sonra aynı adımları **prod** için tekrarlayın.

## 1. Supabase projesi

1. **Yeni proje**: bölge `Central EU (Frankfurt)`. Staging için `bilardogo-staging`, üretim için `bilardogo-prod`.
   Prod için **Pro plan** + **Point-in-Time Recovery** eklentisini açın (ücretsiz projeler duraklatılır ve günlük yedek yoktur).
2. **Bağlantı bilgileri** (Connect):
   - `DIRECT_URL` → *Direct connection* (port 5432) — yalnız migration/seed için.
   - `DATABASE_URL` → *Transaction pooler* (port 6543) — uygulamalar bunu kullanır (`prepare: false` ayarlı).
   - Project Settings → API: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (veya publishable key),
     `SUPABASE_SERVICE_ROLE_KEY` (veya secret key — **yalnız sunucu**).
3. **Migration ve temel veri** (kendi bilgisayarınızdan):
   ```bash
   DIRECT_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres" pnpm db:migrate
   DIRECT_URL="..." pnpm db:seed
   ```
   Migration şunları kurar: tablolar, kısıtlar, trigger'lar, RLS (tüm tablolar; anon/authenticated'a erişim yok),
   Realtime yayın trigger'ları ve özel kanal politikası, `bg_run_maintenance()` + pg_cron işi, storage bucket'ları
   (`public-media`, `chat-media`, `business-docs`) ve `auth.users` → profil / 30 gün deneme trigger'ı.
   - Çıktıda "pg_cron kurulamadı" uyarısı görürseniz: Database → Extensions → **pg_cron**'u açın ve SQL Editor'da çalıştırın:
     `select cron.schedule('bilardogo-maintenance', '* * * * *', 'select public.bg_run_maintenance()');`
   - Staging'de demo veri isterseniz: `DATABASE_URL=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm db:seed:demo`
     (demo kullanıcı şifresi `Bilardo123!`). **Prod'da çalıştırmayın.**
4. **Authentication**
   - URL Configuration: *Site URL* `https://<alan-adı>`; *Redirect URLs*: `https://<alan-adı>/auth/callback`,
     `https://admin.<alan-adı>/auth/callback`, staging ve `http://localhost:3000/auth/callback`, `http://localhost:3001/auth/callback`.
   - Providers → **Google**: Google Cloud Console'da OAuth istemcisi (Web) oluşturun, yetkili yönlendirme URI'si
     `https://<ref>.supabase.co/auth/v1/callback`; Client ID/Secret'ı Supabase'e girin. OAuth onay ekranını doğrulatın.
   - Email: "Confirm email" açık. **Özel SMTP** (Resend/SES) girin; varsayılan SMTP üretim için yetersizdir.
     Alan adınızda SPF/DKIM kayıtlarını ekleyin. E-posta şablonlarını Türkçeleştirin.
   - JWT: *JWT Signing Keys* ile asimetrik anahtara geçmeniz önerilir (sunucu `getClaims` ile yerel doğrular).
5. **Realtime**: Settings → Realtime → *"Allow public access"* **kapalı** (özel kanallar RLS politikasıyla yetkilendirilir;
   `venue:*` ve `city:*` kanalları yalnız "değişti" sinyali taşır).
6. **Advisors**: Security Advisor ve Performance Advisor uyarısız olmalı ("RLS enabled, no policy" bilgi notu beklenen durumdur:
   tablolara tarayıcıdan erişim yoktur).

## 2. Web Push anahtarları

```bash
npx web-push generate-vapid-keys
```
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:destek@<alan-adı>`.
iOS'ta web push yalnız ana ekrana eklenmiş PWA'da çalışır; uygulama kullanıcıyı buna yönlendirir.

## 3. Vercel

Aynı GitHub reposundan **iki proje** oluşturun (Vercel Pro önerilir; Hobby ticari kullanıma izin vermez ve Cron günde bir kez çalışır).

| Proje | Root Directory | Alan adı |
| --- | --- | --- |
| `bilardogo-web` | `apps/web` | `<alan-adı>` (ve `www`) |
| `bilardogo-admin` | `apps/admin` | `admin.<alan-adı>` |

- Framework: Next.js (otomatik). Install/Build komutları varsayılan kalabilir (pnpm workspace algılanır).
- Git: Production branch `main`; Preview dağıtımları staging Supabase'e bağlansın (Preview ortam değişkenleri).
- *Ignored Build Step* için isterseniz `npx turbo-ignore` kullanın.

### Ortam değişkenleri

| Değişken | web | admin | Not |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | yalnız sunucu |
| `DATABASE_URL` | ✓ | ✓ | transaction pooler, 6543 |
| `NEXT_PUBLIC_APP_URL` | ✓ | ✓ | kullanıcı uygulamasının adresi (QR ve bildirim bağlantıları) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | ✓ | ✓ | admin bülten bildirimleri de push gönderir |
| `RESEND_API_KEY`, `EMAIL_FROM` | ✓ | ✓ | opsiyonel; işletme onay e-postaları |
| `CRON_SECRET` | ✓ | | Vercel Cron bu değeri `Authorization: Bearer` ile gönderir |

`BG_DEV_LOGIN` değişkenini **hiçbir Vercel ortamına eklemeyin** (yalnız `next dev` içindir, üretimde zaten devre dışıdır).

### Cron
`apps/web/vercel.json` → `/api/cron` her 5 dakikada: `bg_run_maintenance()` (pg_cron'un yedeği) ve planlanan bültenlerin
bildirimleri. Hobby planda Vercel Cron günde bir kez çalışır; bu durumda pg_cron'un açık olduğundan emin olun.

## 4. Dağıtım akışı

1. PR → GitHub Actions (`.github/workflows/ci.yml`): typecheck, lint, test (Postgres servisiyle), build. Vercel preview kurulur.
2. `main`'e birleşme → CI `migrate` işi production veritabanına migration + temel veriyi uygular
   (GitHub → Settings → Environments → `production` → secret `PROD_DIRECT_URL`). Ardından Vercel production dağıtımı.
3. Migration'lar yalnız ileri yönlüdür ve geriye uyumlu yazılır (önce kolon ekle → kodu değiştir → eskisini sonra sil).
   Geri alma: Vercel'de önceki dağıtıma "Promote".
4. Yeni migration: `packages/db/src/schema` değiştir → `pnpm db:generate`; SQL fonksiyon/politika için
   `pnpm --filter @bilardogo/db exec drizzle-kit generate --custom --name=<ad>`.

## 5. İlk admin

Admin sitesine girecek hesap önce kullanıcı uygulamasından kayıt olur ve profilini tamamlar. Sonra SQL Editor'da:
```sql
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'siz@alanadiniz.com');
```
Admin hesabında 2FA (Supabase MFA) kullanın.

## 6. Canlıya çıkış kontrol listesi

- [ ] Alan adları bağlı: `<alan-adı>` → web, `admin.<alan-adı>` → admin; HTTPS aktif
- [ ] Prod Supabase: migration + `pnpm db:seed` uygulandı; pg_cron işi `cron.job` tablosunda görünüyor
- [ ] Advisors temiz; Realtime public access kapalı; PITR açık ve bir kez staging'e geri yükleme denendi
- [ ] Google OAuth prod istemcisi ve özel SMTP gerçek e-postayla test edildi (kayıt, doğrulama, şifre sıfırlama)
- [ ] Web push iOS (ana ekrana eklenmiş) ve Android'de test edildi
- [ ] Admin → Sözleşmeler: `[ŞİRKET UNVANI]` vb. alanlar dolduruldu, metinler hukukçu kontrolünden geçti, yeni sürüm yayınlandı
- [ ] KVKK: yurt dışına aktarım için standart sözleşme süreci ve VERBİS yükümlülüğü değerlendirildi
- [ ] Admin → Planlar: fiyatlar güncellendi; Admin → Ayarlar: destek e-postası / WhatsApp girildi
- [ ] Admin → Bildirim şablonları gözden geçirildi
- [ ] Pilot salonların işletme başvuruları onaylandı; masa QR afişleri `/isletme/masalar/afis` sayfasından basılıp masalara yapıştırıldı
- [ ] Sentry / Vercel Analytics (opsiyonel) ve dakikalık uptime kontrolü kuruldu
- [ ] İlk admin hesabı ve MFA
- [ ] Pilot: 2–3 salonda bir hafta; "Abonelik zorunlu" ayarı pilot boyunca kapalı

## Bilinen sınırlar

- Abonelik ödemeleri manuel (admin panelinden plan aktivasyonu ve ödeme kaydı). Otomatik tahsilat (iyzico/PayTR) ileride
  `subscriptions.provider` alanı üzerinden eklenebilir.
- Turnuva, hafta sonu etkinlikleri ve sadakat sistemi bu sürümde yok.
- Admin "Uyar" moderasyon aksiyonu şimdilik yalnız kayıt tutar; kullanıcıya bildirim göndermez.
