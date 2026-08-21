// Real legal text ported verbatim from v1's CookiePolicyModal/PrivacyPolicyModal/
// SiteTermsOfUseModal (public/locales/tr/translation.json's cerez_politikasi*/
// gizlilik_politikasi*/site_kullanim* keys) - v1 showed these in footer-triggered
// modals; v2 serves them as dedicated pages instead (simpler than porting a modal
// mechanic, same content and the same footer entry points).

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: { type: "ol" | "ul"; items: string[] };
}

export const COOKIE_POLICY_TITLE = "Çerez Politikası";
export const COOKIE_POLICY_INTRO = [
  "Diğer birçok internet sitesinde olduğu gibi içerik ve reklamları kişiselleştirmek, trafiği analiz edebilmek ve internet sitemizi (kısaca “dklist” olarak anılacaktır) nasıl kullandığınızı anlayabilmek için çerezler kullanıyoruz. Çerez politikamızı, size dklist'te kullanılan çerezler ve bunlara ilişkin yapabileceğiniz seçimler hakkında bilgi sağlamak amacıyla oluşturduk. Çerez politikamız, gizlilik politikamızın bir parçasını oluşturur.",
  "Dklist'te bulunduğunuz süre boyunca 'cookie' olarak da adlandırılan çerezlerin ve buna benzer unsurların tarayıcınıza yerleştirilmesi söz konusu olabilir. Çerez ayarlarını değiştirmeden dklist'i kullanmaya devam ederek çerez kullanımına izin vermektesiniz.",
];

export const COOKIE_POLICY: LegalSection[] = [
  { heading: "1. Çerez nedir?", paragraphs: ["Çerezler, ziyaret ettiğiniz internet siteleri tarafından tarayıcınıza yerleştirilen basit metin dosyalarından ibaret olup; kimlik ve başka özel bilgiler içermez. Çerezler, bu tür kişisel bilgiler içermemekle beraber, oturum bilgileri ve benzeri veriler anonim olarak saklanarak sizi tekrar tanımak ve benzeri hizmetler için kullanılabilir."] },
  { heading: "2. Hangi tür çerezleri kullanıyoruz?", paragraphs: ["Dklist'te “oturum çerezleri” ve “kalıcı çerezler” olarak iki tür çerez kullanıyoruz. Oturum çerezleri, dklist'te dolaşırken geçici hafızada yer alan ancak internet tarayıcınızı kapattığınızda silinen çerezlerdir. Kalıcı çerezler ise belli bir tarihle ya da süreyle sınırlanmış olan bu tarih ya da süre sonunda kendiliğinden silinen veya tarafınızdan silinene kadar sabit diskinizde kalan çerezlerdir."] },
  { heading: "3. Dklist'te 3. şahıslar hangi tür çerezleri kullanılıyor?", paragraphs: ["Kendi çerezlerimize ek olarak 3. şahıs (“3. parti” olarak da anılacaktır) tedarikçi ve reklam ağları, sosyal medya platformları ile diğer iş ortaklarımız, sizin dklist'i ve diğer internet sitelerini önceki ziyaretlerinize dayalı olarak reklam sunmak da dahil olmak üzere size daha iyi ve daha kişiselleştirilmiş hizmet sağlanması amacıyla tarayıcınıza çerez yerleştirebilirler."] },
  { heading: "a. Google Analytics", paragraphs: ["Kalıcı, oturum ve 3. parti çerez türlerinin kullanılması aracılığıyla dklist'in trafiği izlenerek ve raporlanarak kullanıcı deneyiminin daha iyi analiz edilmesi sağlanır. Daha fazla bilgi için: http://www.google.com/policies/privacy/ (verilen linklerden ulaşacağınız içeriğin güvenilirliğine ilişkin sorumluluğumuz bulunmamaktadır.) Bu çerezlerden vazgeçmek için: https://tools.google.com/dlpage/gaoptout (verilen linklerden ulaşacağınız içeriğin güvenilirliğine ilişkin sorumluluğumuz bulunmamaktadır.)"] },
  { heading: "b. Doubleclick", paragraphs: [
    "Kalıcı, oturum ve 3. parti çerez türleri kullanılarak çevrimiçi deneyiminizi iyileştirmek için internet üzerinde geçirdiğiniz zaman ve alışkanlıklarınız analiz edilerek reklamların ilgi alanlarınıza göre gösterilmesi sağlanır.",
    "Daha fazla bilgi için: http://www.google.com/policies/privacy/ (verilen linklerden ulaşacağınız içeriğin güvenilirliğine ilişkin sorumluluğumuz bulunmamaktadır.)",
    "Bu çerezlerden vazgeçmek için: https://www.google.com/settings/u/0/ads/authenticated (verilen linklerden ulaşacağınız içeriğin güvenilirliğine ilişkin sorumluluğumuz bulunmamaktadır.)",
  ] },
  { heading: "c. Diğer reklam platformları", paragraphs: ["Kalıcı, oturum ve 3. parti çerez türleri kullanılarak çevrimiçi deneyiminizi iyileştirmek için internet üzerinde geçirdiğiniz zaman ve alışkanlıklarınız analiz ederek reklamların ilgi alanlarınıza göre gösterilmesi sağlanır."] },
  {
    heading: "4. Dklist'te çerezler hangi amaçlarla kullanılıyor",
    paragraphs: ["Dklist'te çerezler, genel olarak size daha iyi ve daha kişiselleştirilmiş hizmet sağlamak ve dklist'i geliştirmemize yardımcı olması amacıyla kullanılıyor olup; bu çerezler sayesinde aşağıdaki hedefler gerçekleştirilebiliyor:"],
    list: {
      type: "ul",
      items: [
        "Dklist'e döndüğünüzde sizi tanımak",
        "Reklamlar için hedeflenen kitleye erişilerek sizin kendi ilgi alanlarınıza uygun reklamlar görmenizi ve aynı reklamları tekrar tekrar görmemenizi sağlamak",
        "İçerik ve reklamları kişiselleştirmek",
        "Dklist'in trafiğini analiz etmek",
        "Dklist'i nasıl kullandığınızı anlamak",
      ],
    },
  },
  {
    heading: "5. Çerezleri nasıl yönetebilir veya silebilirsiniz?",
    paragraphs: [
      "Çerezleri, tarayıcınız buna imkan sunuyorsa tarayıcı ayarlarını düzenleyerek yönetebilirsiniz. Bu şekilde tüm çerezleri reddedebilir, sabit diskinize bir çerez kaydedilmeden önce uyarılabilir, sadece belirlediğiniz internet sitelerinin çerezlerini kabul edebilir, önceden kabul ettiğiniz çerezleri devre dışı bırakabilir ya da silebilirsiniz.",
      "Dklist'te yer alan 3. şahısların çerezlerinden eğer imkan sunuyorlarsa ilgili 3. şahsın internet sitesini ziyaret ederek vazgeçebilirsiniz.",
      "Dklist'te yer alan çerezleri reddetmeniz durumunda dklist'te yer alan özellik ve fonksiyonların bir kısmını kullanamayabilirsiniz.",
      "Dklist'e farklı tarayıcılardan ve/veya cihazlardan erişiyorsanız, bu tarayıcı ve cihazların her birinin çerez ayarlarının seçiminize uygunluğunu kontrol etmelisiniz.",
      "Çerez politikamızı, size herhangi bir bildirimde bulunmaksızın güncelleyebiliriz. Bu nedenle; çerez politikamızı belirli aralıklarla yeniden gözden geçirmeniz önerilmektedir.",
    ],
  },
];

export const PRIVACY_POLICY_TITLE = "Gizlilik Politikası";
export const PRIVACY_POLICY_INTRO = [
  "Dklist'i kullanırken sizin ile ilgili çeşitli bilgileri depoluyoruz, kullanıyoruz. Bu bilgileri nerede ve nasıl kullandığımızı Gizlilik Politikası başlığı altında açıklamaya çalıştık. Çünkü gizliliğiniz ve dklist'i kullanırken gönlünüzün rahat olması bizim için önemli. Ayrıca hesabınızın gizlilik ayarlarından hangi verileri kiminle paylaştığınızı seçebilirsiniz.",
];

export const PRIVACY_POLICY: LegalSection[] = [
  { heading: "Topladığımız bilgiler", paragraphs: ["Dklist'i kullandığınız zaman yaptığınız birçok etkinliği kaydederiz."] },
  { heading: "Sizin verdiğiniz bilgiler", paragraphs: ["Dklist'e kayıt olduğunuz zaman adınız, soyadınız, doğum tarihiniz, cinsiyetiniz, okul ve iş bilgileriniz, yaşadığınız yer vb bilgileri kaydedip profil oluşturmuş olursunuz. Bunun yanı sıra okuduğunuz kitapları, beğendiğiniz kitapları işaretleyerek de bilgi vermiş olursunuz."] },
  { heading: "Arka planda aldığımız bilgiler", paragraphs: ["Siz dklist'te gezinirken, örneğin bir kitap sayfasını incelediğiniz zaman bunu nasıl yaptığınıza dair bilgileri kaydederiz. Bu bilgiler otomatik olarak elde edilmekte olup görüntülediğiniz sayfalar, ziyaret süreleriniz gibi log bilgileri, çerezler vasıtasıyla elde edilen bilgiler, konumunuz, tarayıcınızın tipi ve dili, cihazınızın modeli gibi verileri içermektedir."] },
  {
    heading: "Bu bilgileri nasıl kullanıyoruz?",
    paragraphs: [
      "Kişisel verilerinizi, Kişisel Verilerin Korunması Kanunu, 5651 sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi ve Bu Yayınlar Yoluyla İşlenen Suçlarla Mücadele Edilmesi hakkında kanun, 5846 sayılı Fikir ve Sanat Eserleri kanunu, 5237 sayılı Türk Ceza Kanunu başta olmak üzere ilgili diğer mevzuat kapsamındaki yükümlülüklerimizi yerine getirebilmek ve size daha iyi hizmet sunabilmek amacıyla bu gizlilik politikası ve Kişisel Verilerin Korunması Kanununa uygun olacak şekilde işliyoruz.",
      "Verilerinizi, Türkiye'de ve yurtdışında bulunan sistemlerimizde saklayabiliriz.",
      "Kişisel verilerinizi yasal yükümlülüklerimiz dışında herhangi bir sebepten dolayı 3. kişilerle hiçbir şekilde paylaşmayız. Kişisel olmayan veriler hakkında detaylar için Site Kullanım Şartlarına bakabilirsiniz.",
    ],
  },
  {
    heading: "Verilerin silinmesi",
    paragraphs: [
      "İp kayıtları ve benzeri bilgilerinizi yasal yükümlülüklerimiz nedeniyle 12 ay boyunca saklarız. 12 ayın sonunda bu bilgiler otomatik olarak silinir.",
      "Dklist'te bulunduğunuz süre boyunca tarayıcınıza çerezlerin ve buna benzer unsurların yerleştirilmesi söz konusu olabilir. Ayrıntılı bilgi için lütfen çerez politikamızı ziyaret ediniz.",
      "Gizlilik politikamızı, size herhangi bir bildirimde bulunmaksızın güncelleyebiliriz. Bu nedenle; gizlilik politikamızı belirli aralıklarla yeniden gözden geçirmenizi öneriyoruz.",
    ],
  },
];

export const SITE_TERMS_TITLE = "Site Kullanım Şartları";

export const SITE_TERMS: LegalSection[] = [
  {
    heading: "1. Tanımlar",
    paragraphs: ["İş bu sözleşmede kullanılan bazı terimlerin anlamları aşağıdaki maddelerde yazılmıştır."],
    list: {
      type: "ol",
      items: [
        "Dklist, dklist.com alan adında hizmet veren web sitesi, Google Play'de bulunan dklist isimli Android ve App Store'da bulunan dklist isimli IOS uygulamasının kısaca adı.",
        "Okur, dklist'e ücretsiz bir şekilde kaydolan, içerik paylaşabilen ve bu şartları kabul etmiş sayılan insanlar.",
        "Gönderi, Okurların dklist üzerinde yaptıkları paylaşımların genel adı.",
      ],
    },
  },
  { heading: "2. 18+ Yaş sınırı", paragraphs: ["Dklist'in içeriği önceden kontrol edilmediğinden dolayı 18 yaşından küçüklere uygun olmayabilir. Çocuklarınızın gelişimini olumsuz etkileyecek içeriklerden uzak durmasını sağlayabileceğiniz filtre yazılımları güvenli internet paketleri bulunmaktadır, bunları kullanmanızı tavsiye ederiz. İnternet'in çocuklarca güvenli kullanımı konusunda bilgilendirme için: http://www.guvenliweb.org.tr (verilen linklerden ulaşacağınız içeriğin güvenilirliğine ilişkin sorumluluğumuz bulunmamaktadır.)"] },
  {
    heading: "3. Şikayet mekanizması ve hukuka aykırı içerik",
    paragraphs: [
      "Dklist 5651 sayılı kanun çerçevesinde yer sağlayıcı sıfatı'yla hizmet vermektedir. Dklist'te okurlar tarafından oluşturulan gönderiler herhangi bir ön incelemeye tabi olmaksızın ve doğrudan okurlar tarafından yayına alınmaktadır. Tarafımıza başvurulmadığı müddetçe, yayınlanan içeriğin hukuka uygunluğunu denetleme yükümlülüğümüz bulunmamaktadır. Ancak, dklist yer sağladığı içeriğin hukuka uygunluğunu sağlamaya özen göstermekte, bu nedenle yapılan her başvuruyu dikkatle değerlendirmektedir.",
      "Site içerisinde yer alan her bir gönderi şayet kayıtlı bir kullanıcı iseniz 'şikayet' butonu kullanılarak ayrı ayrı şikayet edilebilmektedir. Bunun haricinde, info@dklist.com posta adresinden bize ulaşabilirsiniz. Yapacağınız başvurulara en kısa sürede dönüş yapılacaktır. (24 saat içerisinde tarafınıza dönüş hedeflenmektedir.)",
      "Şikayetleriniz kişisel haberleşme niteliğinde olmayıp, şikayetiniz ve iletişim bilgileriniz gerekli görüldüğü takdirde yayınlanabilir, üçüncü kişilerle ve/veya yasal mercilerle paylaşılabilir. Bu nedenle şikayetlerinizde ifşa edilmesini istemediğiniz beyanlarda bulunmamanızı tavsiye ederiz.",
      "Şikayet sebepleri 'Çıplaklık', 'Şiddet', 'Taciz', 'İntihar veya Kendini Yaralama', 'Spam', 'Yetkisiz Şatış', 'Nefret Söylemi' sebepleri ile paylaşımları şikayet edebilirsiniz. Bu kurallara ek olarak site kullanım şartlarımızı veya gizlilik politikamızı doğrudan ihlal eden kullanıcıların hesabı askıya alınmaktadır. Dklist'i kötü niyetli kullanma, okurları rahatsız etme, toplu mesaj gönderme ya da yayınlama, spam ya da reklam amaçlı paylaşımlar yapmak, kendisi ya da bir temsilcisi olup olmadığı fark etmeksizin herhangi bir kişi veya kuruma hakaret, küfür etmek veya bunlarla alay etmek gibi durumları içeren paylaşımlar, dklist'in okunurluğuna zarar verecek şekilde eklenen ve kitapla ilgisiz olan alıntı ve yorumlar, bu tür paylaşımları en kısa sürede yayından kaldırırız. (24 saat içerisinde yayından kaldırma hedeflenmektedir.)",
      "Sahibi belirtilmiş olsun ya olmasın başka bir kimseye ait cümlelerle eklenen kitap yorumlamasıdır. Kitap yorumunun ilk şartı ekleyen okurun kendi cümlelerinden oluşmasıdır. İstisna: Alıntı yapılan metin okurun kendisine aitse inceleme kurallara aykırı sayılmayacaktır. İstisna2: Başka bir yorumun bir kısmı sahibi belirtilmiş olunması kaydıyla yorumda kullanılabilir. Ancak okurun kendi cümleleri alıntı yapılan incelemeden daha fazla olmalıdır. Aksi halde bu paylaşımları en kısa sürede yayından kaldırırız. (24 saat içerisinde yayından kaldırma hedeflenmektedir.)",
      "Ayrıca paylaşım sahibi kişilerin bu davranışları tekrarlaması durumunda dklist'e erişimlerini tamamen engellemek amacıyla önlemler alırız.",
      "Türkiye cumhuriyeti anayasa ve/veya kanunlarına aykırılık. İletinin neden hukuka aykırı olduğunu düşündüğünüzü lütfen 'ek açıklama' bölümüne yazın. Hukuka aykırılık çok geniş bir kavram olduğundan dolayı çok açık olmadığı sürece ek açıklama içermeyen 'hukuka aykırılık' şikayetleri red edilecektir.",
    ],
  },
  { heading: "4. Kullanım", paragraphs: ["Dklist'te yer alan hizmetler ve içeriklerden sadece şahsi kullanımınız için faydalanabilirsiniz. Dklist tarafından sunulan hizmetlerin ve içeriğin dklist'ten yazılı izin alınmadığı müddetçe ticari amaçla kullanılması yasaktır. Dklist'e çeşitli yazılımlar veya aletler kullanarak; izinsiz giriş yapma, veri değiştirme veya başka işlemlerle sitenin işleyişine müdahale etme veya engelleme, sitenin işleyişini kasıtlı olarak yavaşlatma, virüs vs. zararlı içerik yüklemek suretiyle dklist'e zarar verme girişiminde bulunduğunuz takdirde dklist'in yasal yollara başvurma hakkı saklıdır."] },
  { heading: "5. İçerik", paragraphs: ["Dklist'te yer alan içeriğin doğru ve/veya güncel olduğu hiçbir şekilde iddia veya garanti edilmemektedir. Aksine, okurlar tamamen gerçekdışı içerik dahi üretebilirler. Dklist'te yer alan içeriğe yukarıda 'Hukuka aykırı içerik ve Şikayet' kısmında belirtilen haller dışında müdahale edilmediğinden, dklist'te yer alan herhangi bir bilgi, yorum, öneri, espri, ironi, tecrübe paylaşımı ve benzeri içeriğin referans alınması nedeniyle oluşabilecek (dolaylı veya doğrudan) maddi ve/veya manevi herhangi bir kaybınızdan sorumlu olmadığımızı belirtmek isteriz. Dklist'te yer alan bağlantılara/yönlendirmelere (link) ilişkin hiçbir sorumluluğumuz bulunmamaktadır."] },
  {
    heading: "6. Telif hakları ve alıntı",
    paragraphs: [
      "Dklist, bir derleme eser olup, derleme esere (içerik) ve site kodlarına ilişkin tüm haklar (kopyalama, çoğaltma, işleme, yayma) dklist'e aittir. İçeriğe ilişkin okurlar ile dklist arasında yapılmış sözleşme hükümleri saklıdır.",
      "Dklist içeriğini, içeriği değiştirmemek, ilgili okura ve dklist'e aktif link vererek atıfta bulunmak ve ticari amaç gütmeden kullanmak kaydıyla kısmen alıntılamanız mümkündür. Ancak tüm bu kurallara uyulsa dahi alıntılama eserin, konularının veya başlıklarının tümünü kapsamayacak ve tam içeriğe ulaşmak için dklist'in ziyaret edilmesi ihtiyacını ortadan kaldırmayacak düzeyde olmalıdır.",
      "Aksi yönde açık yazılı izin olmadığı müddetçe dklist içeriğinin kısmen veya tamamen ticari amaçla ve/veya reklam ve benzeri gelir elde edecek şekilde kullanılması yasaktır.",
      "Dklist'in dilediği zaman, dilediği kişi veya kurumun yukarıdaki kurallara uyarak dahi alıntı yapmasını engelleme hakkı saklıdır.",
    ],
  },
  { heading: "7. Gizlilik", paragraphs: ["Dklist'te bulunduğunuz süre boyunca 'cookie' olarak da adlandırılan çerezlerin ve buna benzer unsurların bilgisayarınıza yerleştirilmesi söz konusu olabilir. Çerezler basit metin dosyalarından ibaret olup, kimlik ve sair özel bilgiler içermez, bu nevi kişisel bilgi içermemekle beraber, oturum bilgileri ve benzeri veriler saklanır ve sizi tekrar tanımak ve benzeri hizmetler için kullanılabilir. Dklist'i ziyaretiniz esnasında ip adresiniz ve bilgisayarınız aracılığıyla toplanabilen diğer veriler dklist tarafından anonim olarak kaydedilmektedir."] },
  {
    heading: "8. Dklist'in hak ve yükümlülükleri",
    paragraphs: [
      "Dklist kullanım koşullarını önceden bildirmeksizin değiştirebilir. Bu nedenle, kullanım koşullarını belirli aralıklarla incelemenizi öneririz.",
      "Dklist yönetimi, dklist'i oluşturan tüm unsurları önceden haber vermeksizin değiştirme, sona erdirme, yenilerini ekleme, ücretlendirme haklarını saklı tutmaktadır.",
      "Dklist yönetimi, gerekli gördüğü takdirde belli kişilerin, kurumların, ip numaralarının veya ip bloklarının dklist'e erişimini geçici veya kalıcı olarak durdurma hakkını saklı tutar.",
      "Dklist'in virüs ve sair zararlı içerik barındırmaması için özen sarf edilmekle birlikte, gelişen teknoloji, teknik sorun ve diğer nedenlerle bilgisayarınıza virüs, trojan gibi zararlı yazılımların bulaşması ihtimali bulunmaktadır. Bu gibi risklere karşı antivirüs programları ve benzeri uygulamalar kullanmanızı tavsiye ederiz.",
      "Hizmet, kullanıcıların ürünler, kitaplar için ilan ('Ürün İlanları') koyabilecekleri ve bunlara göz atabilecekleri bir forum içermektedir. Bu ürün ilanları tarafımızdan değil, kullanıcılar tarafından sağlanmaktadır. Herhangi bir ürün, gayrimenkul veya hizmet satmamakta, kiralamamakta veya diğer bir şekilde mevcut kılmamaktayız. Lütfen bir ürün ilanı satın alırken, satarken, kiralarken veya kiraya verirken dikkatli ve sağduyulu davranınız.",
    ],
  },
  {
    heading: "9. Güvenlik Önerilerimiz",
    paragraphs: [
      "Dklist milyonlarca kişi tarafından kullanılan ve milyonlarca ürün ilanı içeren bir uygulamadır. Dklist kullanıcılarının büyük bölümü oldukça güvenilir kişilerden oluşur. İnternet üzerinden ilan verme ve alışveriş yapma uzun yıllardır hem Türkiye'de hem de tüm dünyada yaygın bir şekilde, güvenle kullanılmaktadır. Her alışverişte olduğu gibi internet üzerinden bir şeyler alıp satarken de dolandırıcı kişilere karşı gerekli önlemleri mutlaka almak gerekir.",
      "Bir numaralı önceliğimiz, her zaman kullanıcılarımızın güvenliği ve memnuniyetidir. Kitaplarınızı dklist'de alıp satarken, iyi bir alışveriş deneyimi yaşamanı isteriz. Yeni bir kitap aramaya başlamadan veya kullanmadığın kitaplar için ilan vermeden önce aşağıdaki önerileri okumanı tavsiye ediyoruz:",
      "Dklist, insan ve yapay zeka karışımını kullanarak platformu güvenli ve eğlenceli kılmayı hedefliyor. Ama aynı zamanda kullanıcılarımızdan uygunsuz içerik yayınlayan ve uygunsuz davranışta bulunan kişileri bize şikayet ederek bildirmelerini rica ediyoruz. Eğer bir kullanıcı tarafından dolandırıldıysan veya şahsi güvenliğinle ilgili bir tehdit aldıysan, hemen yerel emniyet müdürlüğünle irtibata geç.",
    ],
    list: {
      type: "ol",
      items: [
        "Lütfen yetkililerin önerdiği kurallara uymaya dikkat et, kendini ve başkalarını korumak için gerekli önlemleri almaya özen göster.",
        "Ücret ödeme ve ürünün takas sürecini tamamlamak için halka açık bir yer seçerek görüşmeyi yüz yüze gerçekleştirmeni öneriyoruz. Şahsen tanışmadığın birine asla ödeme gönderme ve bir şeyi görmeden asla satın alma.",
        "Çok fazla kitap alımı yada satımı gibi durumlarda, bazen alıcı veya satıcıyla ev ortamında görüşmen gerekebilir. Bu tarz durumlarda yanında mutlaka başka birilerinin de olmasını öneriyoruz.",
        "Banka çeklerini kabul etme. Başka kullanıcılara Western Union, EFT ve havale gönderme.",
        "Olağan dışı öneri veya istekte bulunan kullanıcılara dikkat et.",
        "Gerçek dışı fiyatlı, fotoğrafları katalogtan alınmış gibi duran veya spam gibi gözüken açıklamalara sahip ürünlere dikkat et. Bir ürün gerçek olamayacak kadar iyiyse, muhtemelen gerçek değildir.",
        "Bir alışverişi tamamlamanın en iyi yolu ürün teslimini ve ödemeyi aynı zamanda gerçekleştirmektir. Dolandırıcılıktan korunmak için havale veya kredi kartı yoluyla önceden ödeme yapmayı hiçbir zaman kabul etmemelisin.",
        "Olağan dışı isteklerde bulunan veya spam gibi gözüken mesajlar gönderen kişilere güvenmemelisin.",
        "Almak veya satmak için sakın şahsi finansal bilgilerini verme.",
        "Kullanıcılarla sadece dklist üzerindeki sohbet sistemiyle iletişim kurmanı tavsiye ediyoruz.",
        "Eğer kullanıcının dürüstlüğü hakkında şüphen olursa başka bir satıcı/alıcı bulmalısın. Dklist'de milyonlarca başka kullanıcı var!",
        "Her zaman satıcının profil sayfasını kontrol et.",
        "Ürünün durumu ile ilgili bilgi, fiyat ve ödeme yönteminin görüşme öncesinde kesin kararlaştırılmış olduğuna emin ol.",
        "Ödemeyi gerçekleştirmeden önce ürünü incele ve her şeyinin, satıcının tanımı ile uyumlu olup olmadığını kontrol et.",
        "Bir ürünü satın almadan önce mutlaka kontrolden geçir.",
      ],
    },
  },
];
