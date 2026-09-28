/**
 * Sözleşme ve KVKK metinleri için TASLAKLAR. Yayına almadan önce bir hukukçuya kontrol ettirin ve
 * köşeli parantezli alanları ([ŞİRKET UNVANI] vb.) doldurun. Admin panelinden yeni sürüm yayınlanabilir.
 */
const CONTROLLER = `Veri Sorumlusu: [ŞİRKET UNVANI], [ADRES], MERSİS: [MERSİS NO], E-posta: [KVKK E-POSTA]`;

export const LEGAL_SEED = [
  {
    kind: 'kvkk_notice' as const,
    title: 'KVKK Aydınlatma Metni',
    body: `${CONTROLLER}

1. İşlenen kişisel veriler
Kimlik (ad, soyad, kullanıcı adı), iletişim (e-posta, telefon), profil (şehir, seviye, oynadığı oyun türleri, profil fotoğrafı), konum bildirimi (salonda / geleceğim durumu; cihaz konumu toplanmaz), maç ve istatistik kayıtları, sohbet mesajları ve medya, sipariş kayıtları, işlem güvenliği (IP adresi, oturum ve log kayıtları), işletme hesaplarında vergi kimlik bilgileri ve belgeler.

2. İşleme amaçları
Üyelik oluşturulması ve hesabın yönetimi; salon, masa ve maç eşleşme hizmetlerinin sunulması; maç sonuçlarının ve istatistiklerin tutulması; kullanıcılar arası iletişimin sağlanması; salon içi siparişlerin salona iletilmesi; bildirimlerin gönderilmesi; abonelik süreçlerinin yürütülmesi; bilgi güvenliği, kötüye kullanımın önlenmesi ve şikâyetlerin incelenmesi; mevzuattan doğan yükümlülüklerin yerine getirilmesi.

3. Hukuki sebepler
KVKK m.5/2-c (sözleşmenin kurulması ve ifası), m.5/2-ç (hukuki yükümlülük), m.5/2-f (meşru menfaat) ve gerektiğinde m.5/1 (açık rıza).

4. Aktarım
Veriler, hizmetin sunulması için kullanılan barındırma ve altyapı sağlayıcılarına (veritabanı, dosya depolama, e-posta ve bildirim altyapısı) aktarılabilir. Bu sağlayıcıların sunucuları yurt dışında bulunabilir; yurt dışına aktarım KVKK m.9 kapsamında standart sözleşme veya açık rızanıza dayanılarak yapılır. Maç sonuçlarınız ve profiliniz diğer kullanıcılara, siparişleriniz ilgili salona gösterilir. Yetkili kamu kurumlarına yalnız kanuni zorunluluk halinde aktarım yapılır.

5. Toplama yöntemi
Veriler uygulama ve web sitesi üzerinden elektronik ortamda, Google ile giriş seçildiğinde Google'dan alınan temel profil bilgileriyle toplanır.

6. Haklarınız
KVKK m.11 kapsamında verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme, aktarıldığı üçüncü kişileri öğrenme, itiraz ve zararın giderilmesini talep etme haklarına sahipsiniz. Başvurularınızı [KVKK E-POSTA] adresine iletebilirsiniz. Hesabınızı uygulamadaki "Hesabı sil" seçeneğiyle dilediğiniz zaman silebilirsiniz.`,
  },
  {
    kind: 'user_agreement' as const,
    title: 'Kullanıcı Sözleşmesi',
    body: `Bu sözleşme [ŞİRKET UNVANI] ("BilardoGo") ile uygulamaya üye olan kullanıcı arasındadır.

1. Hizmet
BilardoGo; salonları, salondaki oyuncuları, masa durumunu görmeyi, maç ayarlamayı, sonuç ve istatistik kaydetmeyi, sohbet etmeyi ve salon içi sipariş vermeyi sağlayan bir platformdur.

2. Kullanıcının yükümlülükleri
Kullanıcı doğru bilgi vermeyi, maç sonuçlarını dürüstçe girmeyi, diğer kullanıcılara saygılı davranmayı, hakaret, spam, yanıltıcı skor ve hukuka aykırı içerik paylaşmamayı kabul eder. Kural ihlalinde hesap kısıtlanabilir veya kapatılabilir.

3. Ödemeler
BilardoGo salon içi sipariş ve turnuva katılım ücreti tahsil etmez; bu ödemeler doğrudan salona yapılır. BilardoGo yalnızca abonelik ücreti tahsil edebilir. Yeni kullanıcılar 30 gün ücretsiz kullanır.

4. Sorumluluk
Salonların sunduğu hizmet, ürün ve fiyatlardan ilgili salon sorumludur. BilardoGo, kullanıcılar arasındaki maç ve buluşmalarda taraf değildir.

5. Değişiklikler
Sözleşme değiştiğinde yeni sürüm uygulamada yayınlanır ve kullanıcıdan onay istenir.`,
  },
  {
    kind: 'explicit_consent' as const,
    title: 'Açık Rıza Metni (Yurt Dışına Aktarım)',
    body: `Kişisel verilerimin, KVKK Aydınlatma Metni'nde belirtilen amaçlarla, hizmet altyapısını sağlayan ve sunucuları yurt dışında bulunabilen barındırma, veritabanı, e-posta ve bildirim sağlayıcılarına aktarılmasına açık rıza veriyorum. Bu rızayı dilediğim zaman profil ayarlarından geri alabileceğimi biliyorum.`,
  },
  {
    kind: 'marketing' as const,
    title: 'Ticari Elektronik İleti İzni',
    body: `BilardoGo ve iş ortaklarının kampanya, turnuva ve etkinlik duyurularını e-posta ve bildirim yoluyla almayı kabul ediyorum. Bu izni dilediğim zaman ayarlardan geri alabilirim.`,
  },
  {
    kind: 'business_agreement' as const,
    title: 'İşletme Sözleşmesi',
    body: `Bu sözleşme [ŞİRKET UNVANI] ile BilardoGo'ya salonunu kaydeden işletme arasındadır.

1. İşletme, başvuruda verdiği ticari bilgilerin (unvan, VKN/TCKN, vergi dairesi) ve belgelerin doğru olduğunu kabul eder. Başvuru BilardoGo tarafından incelenir; onaylanmadan salon uygulamada görünmez.
2. İşletme salon profilini, masa tanımlarını, ürün fiyatlarını ve duyurularını güncel tutmakla yükümlüdür.
3. Siparişlerin ve turnuva katılım ücretlerinin tahsilatı işletme tarafından kasada yapılır; BilardoGo bu ödemelere aracılık etmez.
4. BilardoGo turnuva sistemi özel turnuvaların düzenlenmesi içindir; Türkiye Bilardo Federasyonu veya il temsilcilikleri tarafından düzenlenen resmi müsabakalar için kullanılamaz.
5. İşletme, çalışan hesaplarının işlemlerinden sorumludur.
6. İşletme hesabı 30 gün ücretsiz deneme ile başlar; sonrasında geçerli abonelik ücretine tabidir.`,
  },
];
