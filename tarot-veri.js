// Tarot bölümünün sabit içeriği (tarayıcı + sunucu): 78 kartlık deste ve açılımlar.
// Kart görselleri /tarot/kart/<id>.webp, arka yüz /tarot/kart/arka.webp (Ezoter.ist destesi, gpt-image-2 ile üretildi).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TarotVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  // Büyük Arkana: [id, ad, anahtar (düz), anlam (düz), anlam (ters)]
  const buyuk = [
    ["deli", "Deli", "yeni başlangıç, cesaret, özgürlük", "Bilinmeze güvenle adım atma zamanı. Hayat seni yeni bir maceraya çağırıyor; kalbinin sesini dinle.", "Düşüncesizce atılan adımlar ya da korkudan ertelenen bir başlangıç. Atlamadan önce yere bak."],
    ["buyucu", "Büyücü", "irade, yetenek, yaratma gücü", "İhtiyacın olan her şey elinde. Niyetini netleştir; düşünceni gerçeğe dönüştürme gücün var.", "Dağılan enerji, kullanılmayan yetenekler ya da etrafındaki birinin manipülasyonu."],
    ["azize", "Azize", "sezgi, sır, iç bilgelik", "Cevap içinde. Sessiz kal, sezgilerine kulak ver; görünenin ardında saklı bir bilgi var.", "Sezgini bastırmak ya da açığa çıkmayı bekleyen bir sır. İç sesini yeniden dinle."],
    ["imparatorice", "İmparatoriçe", "bereket, şefkat, yaratıcılık", "Bolluk ve bereket dönemi. Sevgi, güzellik ve yaratıcılık hayatında filizleniyor.", "Kendini ihmal etmek ya da aşırı korumacılık. Önce kendine şefkat göster."],
    ["imparator", "İmparator", "düzen, otorite, istikrar", "Kontrolü eline al, sağlam bir düzen kur. Disiplin ve kararlılık seni zirveye taşır.", "Katılık, aşırı kontrol ya da bir otorite figürüyle çatışma."],
    ["aziz", "Aziz", "gelenek, öğreti, rehberlik", "Bir öğretmen, gelenek ya da kurum sana yol gösterecek. Bilgeliği deneyimlilerden al.", "Kalıpları sorgulama zamanı; başkalarının kurallarına körü körüne uyma."],
    ["asiklar", "Aşıklar", "aşk, uyum, seçim", "Kalpten bir bağ ve önemli bir seçim. Değerlerinle uyumlu olan yolu seç.", "Uyumsuzluk, kararsızlık ya da kalbinle aklının çatışması."],
    ["savas-arabasi", "Savaş Arabası", "zafer, kararlılık, ilerleme", "İradenle zıt güçleri bir araya getirip zafere yürüyorsun. Odaklan ve ilerle.", "Yön kaybı, kontrolün elden kaçması ya da önüne çıkan engellere takılmak."],
    ["guc", "Güç", "cesaret, sabır, iç güç", "Gerçek güç yumuşaklıktan gelir. Sabır ve şefkatle en vahşi duyguyu bile evcilleştirirsin.", "Kendinden şüphe, bastırılmış öfke ya da gücünü unutmak."],
    ["ermis", "Ermiş", "içe dönüş, arayış, bilgelik", "Kendi iç ışığına çekil. Yalnız kalmak sana aradığın cevabı gösterecek.", "Aşırı yalnızlık ya da içe kapanma. Işığını başkalarıyla da paylaş."],
    ["kader-carki", "Kader Çarkı", "döngü, şans, değişim", "Çark dönüyor; şans kapını çalıyor. Değişime direnme, akışın bir parçası ol.", "Kontrol edemediğin değişimlere direnç ya da kısa süreli bir şanssızlık."],
    ["adalet", "Adalet", "denge, hakikat, sorumluluk", "Ne ekersen onu biçersin. Dürüst ve adil kararlar seni huzura taşır.", "Haksızlık, dengesizlik ya da sorumluluktan kaçmak."],
    ["asilan-adam", "Asılan Adam", "teslimiyet, bekleyiş, yeni bakış", "Bir süre durmak ve olaylara başka açıdan bakmak gerek. Teslimiyet sana yeni bir anlayış getirecek.", "Gereksiz fedakârlık ya da durgunlukta takılı kalmak."],
    ["olum", "Ölüm", "son, dönüşüm, yenilenme", "Bir dönem kapanıyor ki yenisi başlayabilsin. Bu kart fiziksel ölüm değil, derin bir dönüşümdür.", "Değişime direnmek ve bitmesi gerekeni bırakamamak."],
    ["denge", "Denge", "ölçülülük, uyum, sabır", "Zıtlıkları ustaca harmanlıyorsun. Ölçülü ve sabırlı ol; doğru karışım kendiliğinden oluşacak.", "Aşırılık, dengesizlik ya da sabırsızlık."],
    ["seytan", "Şeytan", "bağımlılık, arzu, gölge", "Seni bağlayan bir alışkanlık, korku ya da tutku var. Zincirlerin sandığından daha gevşek.", "Özgürleşme, bir bağımlılıktan ya da toksik bağdan kurtulma."],
    ["kule", "Kule", "ani değişim, uyanış, sarsıntı", "Sağlam sanılan bir yapı yıkılıyor; ardından gerçek bir aydınlanma geliyor.", "Kaçınılmaz bir değişimi ertelemek ya da krizden ucuz kurtulmak."],
    ["yildiz", "Yıldız", "umut, ilham, şifa", "Fırtınadan sonra gelen umut. İnancını tazele; evren sana şifa gönderiyor.", "Umutsuzluk ya da inanç kaybı. Küçük bir ışığa bile tutun."],
    ["ay", "Ay", "yanılsama, sezgi, bilinçaltı", "Her şey göründüğü gibi değil. Korkularını ve sezgilerini ayırt etmeyi öğren.", "Kafa karışıklığının dağılması ya da açığa çıkan bir gerçek."],
    ["gunes", "Güneş", "neşe, başarı, canlılık", "Işıl ışıl bir dönem: başarı, mutluluk ve içten bir neşe seni bekliyor.", "Geçici bir bulut; iyimserliğini kaybetme, güneş yine doğacak."],
    ["mahkeme", "Mahkeme", "uyanış, çağrı, yeniden doğuş", "Bir çağrı duyuyorsun. Geçmişi değerlendirip yeni bir hayata uyanma zamanı.", "Kendini yargılamak ya da gelen çağrıyı duymazdan gelmek."],
    ["dunya", "Dünya", "tamamlanma, bütünlük, başarı", "Bir döngü başarıyla tamamlanıyor. Emeğinin meyvesini topla ve kutla.", "Yarım kalan işler ya da tamamlanmayı bekleyen son bir adım."],
  ];

  // Küçük Arkana takımları ve rütbeleri.
  const takimlar = [
    { id: "degnek", ad: "Değnek", cogul: "Değnekler", element: "Ateş", tema: "tutku, irade ve eylem" },
    { id: "kupa", ad: "Kupa", cogul: "Kupalar", element: "Su", tema: "duygular, aşk ve ilişkiler" },
    { id: "kilic", ad: "Kılıç", cogul: "Kılıçlar", element: "Hava", tema: "düşünceler, kararlar ve çatışmalar" },
    { id: "tilsim", ad: "Tılsım", cogul: "Tılsımlar", element: "Toprak", tema: "para, iş ve maddi dünya" },
  ];
  const rutbeler = [
    ["as", "Ası"], ["2", "İkilisi"], ["3", "Üçlüsü"], ["4", "Dörtlüsü"], ["5", "Beşlisi"], ["6", "Altılısı"], ["7", "Yedilisi"],
    ["8", "Sekizlisi"], ["9", "Dokuzlusu"], ["10", "Onlusu"], ["prens", "Prensi"], ["sovalye", "Şövalyesi"], ["kralice", "Kraliçesi"], ["kral", "Kralı"],
  ];

  // [anahtar, düz, ters] — takım ve rütbe sırasıyla.
  const kucukAnlam = {
    degnek: [
      ["ilham, başlangıç", "Yeni bir tutku ya da proje doğuyor; içindeki kıvılcımı büyüt.", "Ertelenen bir başlangıç ya da sönen bir heves."],
      ["plan, vizyon", "Ufkuna bakıp geleceğini planlıyorsun; cesur bir karar eşiktesin.", "Kararsızlık ya da konfor alanından çıkma korkusu."],
      ["genişleme, öngörü", "Ektiğin tohumlar filizleniyor; ufkun genişliyor.", "Gecikmeler ya da beklentilerin karşılanmaması."],
      ["kutlama, yuva", "Mutlu bir kutlama, huzurlu bir yuva ve sağlam temeller.", "Evde ya da çevrende geçici bir huzursuzluk."],
      ["rekabet, çatışma", "Fikirlerin çarpıştığı hareketli bir dönem; rekabet seni geliştirir.", "Gereksiz çatışmalardan uzak durmak."],
      ["zafer, takdir", "Başarın görünür oluyor; alkışı hak ediyorsun.", "Takdir görmeme ya da gururun incinmesi."],
      ["savunma, kararlılık", "Yerini koru; inandığın şey için dimdik dur.", "Yorgunluk ya da her mücadeleye girmeye çalışmak."],
      ["hız, haber", "İşler hızlanıyor; beklediğin haberler yolda.", "Aceleyle yapılan hatalar ya da gecikmeler."],
      ["direnç, son çaba", "Yorgun ama güçlüsün; son bir çabayla hedefe ulaşacaksın.", "Tükenmişlik; biraz dinlenmen gerek."],
      ["yük, sorumluluk", "Fazla yük taşıyorsun; bazılarını paylaşmayı öğren.", "Yükleri bırakmak ve hafiflemek."],
      ["merak, haber", "Heyecan verici bir haber ya da yeni bir keşif isteği.", "Yarım kalan fikirler ya da sabırsızlık."],
      ["macera, tutku", "Atılgan, tutkulu ve maceraya hazır bir enerji.", "Düşünmeden atılmak ya da dağınıklık."],
      ["özgüven, sıcaklık", "Kendinden emin, sıcak ve çekici bir duruş.", "Kıskançlık ya da özgüven eksikliği."],
      ["liderlik, vizyon", "İlham veren bir lider; büyük resmi görüyorsun.", "Aşırı kontrol ya da sabırsız liderlik."],
    ],
    kupa: [
      ["yeni aşk, duygu", "Kalbinde yeni bir sevgi filizleniyor; duyguların taşıyor.", "Bastırılmış duygular ya da kendine sevgi eksikliği."],
      ["birlik, karşılıklı sevgi", "Karşılıklı bir çekim, uyumlu bir ortaklık.", "İlişkide dengesizlik ya da kopukluk."],
      ["dostluk, kutlama", "Dostlarla kutlama, neşe ve paylaşım.", "Aşırılık ya da dedikodu."],
      ["tatminsizlik, içe dönüş", "Elindekilerin değerini göremiyorsun; önündeki fırsata bak.", "Yeni fırsatlara açılmak."],
      ["kayıp, hayal kırıklığı", "Dökülen için üzülme; ayakta kalan kupalar hâlâ seni bekliyor.", "Yasın bitmesi ve kabulleniş."],
      ["nostalji, masumiyet", "Geçmişten tatlı anılar ya da eski bir dostun dönüşü.", "Geçmişe takılı kalmak."],
      ["hayaller, seçenekler", "Birçok seçenek var; hayal ile gerçeği ayırt et.", "Netleşen seçimler."],
      ["vazgeçiş, arayış", "Artık sana yetmeyeni geride bırakıp daha anlamlıyı arıyorsun.", "Gitmekten korkmak ya da kararsızlık."],
      ["dilek, mutluluk", "Dilek kartı: içinden geçen dilek gerçekleşmeye yakın.", "Maddi tatminin ruhu doyurmaması."],
      ["aile, huzur", "Aile mutluluğu, ev huzuru ve gönül doygunluğu.", "Ailede kırgınlıklar ya da uyumsuzluk."],
      ["duygusal haber, sezgi", "Tatlı bir mesaj, romantik bir teklif ya da sezgisel bir ilham.", "Duygusal olgunlaşmamışlık."],
      ["romantizm, teklif", "Romantik bir teklif ya da kalbin peşinden gitmek.", "Gerçekçi olmayan beklentiler."],
      ["şefkat, sezgi", "Şefkatli, sezgisel ve duygusal olarak güçlü bir enerji.", "Duygusal tükenmişlik ya da aşırı hassasiyet."],
      ["duygusal denge, bilgelik", "Duygularını ustaca yöneten, sakin ve bilge bir duruş.", "Duygusal manipülasyon ya da bastırılmış hisler."],
    ],
    kilic: [
      ["netlik, hakikat", "Zihnin berraklaşıyor; gerçeği görüp keskin bir karar veriyorsun.", "Kafa karışıklığı ya da yanlış anlaşılma."],
      ["kararsızlık, çıkmaz", "İki seçenek arasında kalmışsın; gözlerini aç ve seç.", "Bilgi açığa çıkıyor, karar kolaylaşıyor."],
      ["kırgınlık, acı", "Kalp kırıklığı ya da acı bir gerçek; ama iyileşme başlıyor.", "Acının hafiflemesi ve affetme."],
      ["dinlenme, toparlanma", "Bir süre geri çekil ve dinlen; zihnin toparlanacak.", "Yeniden harekete geçme zamanı."],
      ["çatışma, gerilim", "Bir tartışmada kazanmak her şey değil; neyin önemli olduğunu düşün.", "Barışma ve geçmişi geride bırakma."],
      ["geçiş, yolculuk", "Sakin sulara doğru yol alıyorsun; zor dönem geride kalıyor.", "Geçişte zorluklar ya da bırakamamak."],
      ["strateji, kurnazlık", "Akıllıca bir strateji gerekiyor; ama dürüstlüğü elden bırakma.", "Gizli kalan şeylerin açığa çıkması."],
      ["kısıtlanma, korku", "Kendini sıkışmış hissediyorsun; ama düğümler sandığından gevşek.", "Kısıtlamalardan kurtulma."],
      ["kaygı, uykusuzluk", "Kaygıların büyüyor; çoğu, zihninin yarattığı gölgeler.", "Kaygının azalması ve umut."],
      ["bitiş, dip nokta", "Zor bir dönem sona eriyor; dipten sonra yalnızca yükseliş var.", "Toparlanma ve yeniden doğuş."],
      ["merak, uyanıklık", "Keskin bir merak, yeni fikirler ve dikkatli gözler.", "Dedikodu ya da aceleci sözler."],
      ["hız, kararlılık", "Hedefe doğru hızla ve kararlılıkla ilerliyorsun.", "Düşünmeden hareket etmek."],
      ["bağımsızlık, açık sözlülük", "Net, bağımsız ve açık sözlü bir akıl.", "Soğukluk ya da sert sözler."],
      ["otorite, adalet", "Mantıklı, adil ve güçlü bir karar verici.", "Katılık ya da gücün kötüye kullanılması."],
    ],
    tilsim: [
      ["fırsat, bolluk", "Maddi bir fırsat kapında; sağlam bir başlangıç için tohum ek.", "Kaçırılan bir fırsat ya da kötü planlama."],
      ["denge, esneklik", "Birden fazla işi ustalıkla dengeliyorsun.", "Fazla yüklenmek ya da dengesizlik."],
      ["ekip çalışması, ustalık", "Emeğin takdir görüyor; birlikte daha güçlüsünüz.", "Uyumsuz bir ekip ya da özensiz iş."],
      ["tutumluluk, güvenlik", "Birikimlerini koruyorsun; güvende hissetmek istiyorsun.", "Cimrilik ya da paraya aşırı bağlılık."],
      ["zorluk, yoksunluk", "Zor bir dönem; ama yardım eli çok yakında.", "Toparlanma ve destek bulma."],
      ["cömertlik, paylaşım", "Vermek ve almak arasında güzel bir denge; cömertlik kazandırır.", "Borç ya da dengesiz yardımlaşma."],
      ["sabır, yatırım", "Ektiğin tohumların büyümesini sabırla bekle.", "Sabırsızlık ya da verimsiz yatırım."],
      ["emek, ustalık", "Ustalaşmak için çalışıyorsun; emeğin değerli.", "Tekdüzelik ya da özensizlik."],
      ["bağımsızlık, refah", "Kendi emeğinle kazandığın bolluğun tadını çıkar.", "Maddi bağımlılık ya da gösteriş."],
      ["miras, aile refahı", "Kalıcı bir refah, aile mirası ve sağlam temeller.", "Aile içi maddi anlaşmazlıklar."],
      ["öğrenme, fırsat", "Yeni bir beceri ya da maddi bir fırsat haberi.", "Odak eksikliği ya da ertelenen hedefler."],
      ["istikrar, çalışkanlık", "Yavaş ama emin adımlarla ilerliyorsun.", "Durgunluk ya da aşırı temkin."],
      ["bereket, pratiklik", "Bereketli, pratik ve şefkatli bir enerji; evin direği.", "İş ile ev arasında dengesizlik."],
      ["başarı, zenginlik", "Maddi başarı ve güvenilir bir liderlik.", "Hırs ya da maddiyata aşırı odaklanma."],
    ],
  };

  const kartlar = [
    ...buyuk.map(([id, ad, anahtar, duz, ters], sira) => ({ id, ad, anahtar, duz, ters, arkana: "buyuk", numara: sira })),
    ...takimlar.flatMap((t) =>
      rutbeler.map(([r, rAd], i) => {
        const [anahtar, duz, ters] = kucukAnlam[t.id][i];
        return { id: `${t.id}-${r}`, ad: `${t.ad} ${rAd}`, anahtar, duz, ters, arkana: "kucuk", takim: t.id, rutbe: r };
      }),
    ),
  ];

  const acilimlar = {
    gunun: { ad: "Günün kartı", aciklama: "Bugün sana eşlik edecek enerji.", pozisyonlar: ["Günün enerjisi"] },
    uc: { ad: "Geçmiş · Şimdi · Gelecek", aciklama: "Yolculuğunun üç durağı.", pozisyonlar: ["Geçmiş", "Şimdi", "Gelecek"] },
    ask: {
      ad: "Aşk açılımı",
      aciklama: "Kalbin, karşındaki ve aranızdaki bağ.",
      pozisyonlar: ["Sen", "Karşındaki", "Aranızdaki bağ", "Engel", "İlişkinin yönü"],
    },
    kelt: {
      ad: "Kelt Haçı",
      aciklama: "En derin açılım: durumun tüm katmanları.",
      pozisyonlar: ["Mevcut durum", "Engel", "Bilinçaltı", "Yakın geçmiş", "Olası sonuç", "Yakın gelecek", "Sen", "Çevren", "Umutların ve korkuların", "Sonuç"],
    },
  };

  return { kartlar, takimlar, acilimlar };
});
