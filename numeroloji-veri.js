// Numeroloji bölümünün sabit içeriği (tarayıcı + sunucu). Yorumlar Ezoter.ist'in kendi metinleridir.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NumerolojiVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const sayilar = {
    1: {
      ad: "Öncü", resim: "parmak-izi", anahtar: ["bağımsızlık", "cesaret", "başlangıç"],
      ozet: "1, her şeyin başladığı sayıdır. Kendi yolunu çizen, ilk adımı atan ve başkalarına yön gösteren bir enerji taşır. Kararlılığı ve özgüveniyle hayalini gerçeğe dönüştürür.",
      guclu: ["Liderlik ve inisiyatif", "Kararlılık", "Özgün fikirler", "Cesaret"],
      golge: ["İnatçılık", "Yalnız kalma eğilimi", "Sabırsızlık"],
      ask: "Aşkta tutkulu ve korumacıdır; kendi alanına saygı duyan, onu destekleyen bir partnerle parlar.",
      kariyer: "Girişimcilik, yöneticilik ve kendi markasını kurmak; söz sahibi olduğu her iş ona göredir.",
    },
    2: {
      ad: "Barışçı", resim: "gunes-ay", anahtar: ["uyum", "ortaklık", "sezgi"],
      ozet: "2, iki ucu birleştiren köprüdür. Duyarlı, sabırlı ve sezgiseldir; insanlar arasında dengeyi kurar. Gücünü sesini yükseltmekten değil, anlamaktan ve birleştirmekten alır.",
      guclu: ["Diplomasi", "Empati", "Takım ruhu", "İnce sezgiler"],
      golge: ["Aşırı hassasiyet", "Kararsızlık", "Kendini geri planda bırakma"],
      ask: "Aşkta sadık ve şefkatlidir; huzur, güven ve birlikte büyümek onun için her şeydir.",
      kariyer: "Danışmanlık, arabuluculuk, sağlık, sanat ve ekip işleri; uyum gerektiren her alanda değerlidir.",
    },
    3: {
      ad: "Yaratıcı", resim: "kadin-profil", anahtar: ["ifade", "neşe", "yaratıcılık"],
      ozet: "3, kendini ifade etmenin sayısıdır. Sözü, kalemi, sanatı ve neşesiyle çevresine ışık saçar. Hayatı bir sahne gibi yaşar ve başkalarına ilham verir.",
      guclu: ["Yaratıcılık", "İletişim yeteneği", "İyimserlik", "Sosyallik"],
      golge: ["Dağınıklık", "Yüzeysellik", "Duygusal iniş çıkışlar"],
      ask: "Aşkta eğlenceli ve romantiktir; kahkaha, sohbet ve sürprizlerle dolu bir ilişki ister.",
      kariyer: "Yazarlık, tasarım, sahne, medya ve eğitim; kendini ifade edebildiği işlerde parlar.",
    },
    4: {
      ad: "İnşaatçı", resim: "sihirli-kare", anahtar: ["düzen", "emek", "güven"],
      ozet: "4, sağlam temellerin sayısıdır. Çalışkan, disiplinli ve güvenilirdir; hayalleri taş taş üstüne koyarak gerçeğe dönüştürür. Ona dayanan herkes kendini güvende hisseder.",
      guclu: ["Disiplin", "Sadakat", "Pratik zekâ", "Sabır"],
      golge: ["Katılık", "Değişime direnç", "Aşırı çalışma"],
      ask: "Aşkta istikrarlı ve sadıktır; sevgisini söz yerine emekle, güvenle gösterir.",
      kariyer: "Mühendislik, mimarlık, finans, yönetim ve zanaat; sistem kurmayı gerektiren işlerde ustadır.",
    },
    5: {
      ad: "Özgür Ruh", resim: "sonsuzluk", anahtar: ["özgürlük", "değişim", "macera"],
      ozet: "5, hareketin ve özgürlüğün sayısıdır. Merakı onu yeni yerlere, yeni insanlara ve yeni deneyimlere taşır. Değişimden korkmaz; tam tersine, değişim onun yakıtıdır.",
      guclu: ["Uyum yeteneği", "Merak", "Çok yönlülük", "Cesaret"],
      golge: ["Huzursuzluk", "Bağlanma korkusu", "Aşırılık"],
      ask: "Aşkta heyecan ve özgürlük arar; onu kısıtlamayan, maceralarına eşlik eden biriyle mutludur.",
      kariyer: "Seyahat, satış, medya, iletişim ve girişimcilik; rutinin az olduğu işlerde parlar.",
    },
    6: {
      ad: "Şefkatli", resim: "lotus-kitap", anahtar: ["sevgi", "aile", "sorumluluk"],
      ozet: "6, sevginin ve sorumluluğun sayısıdır. Ailesine, dostlarına ve topluma kucak açar. Güzelliği, uyumu ve iyileştirmeyi sever; yanında olanlar kendini evinde hisseder.",
      guclu: ["Şefkat", "Sorumluluk bilinci", "Estetik zevk", "Koruyuculuk"],
      golge: ["Fedakârlığı abartma", "Kontrol etme isteği", "Mükemmeliyetçilik"],
      ask: "Aşkta adanmış ve sıcaktır; yuva kurmak ve sevdiklerini mutlu etmek onun en büyük dileğidir.",
      kariyer: "Sağlık, eğitim, danışmanlık, tasarım ve sosyal hizmet; insanlara dokunan işlerde mutludur.",
    },
    7: {
      ad: "Bilge", resim: "ucgen-yedi", anahtar: ["bilgelik", "sezgi", "derinlik"],
      ozet: "7, arayışın ve iç bilgeliğin sayısıdır. Görünenin ardındaki gerçeği merak eder; düşünür, araştırır, sorgular. Sessizliği sever, çünkü cevapları orada bulur.",
      guclu: ["Analitik zekâ", "Sezgi", "Derin düşünce", "Ruhsal merak"],
      golge: ["İçe kapanma", "Şüphecilik", "Mesafeli görünme"],
      ask: "Aşkta seçicidir; zihnine ve ruhuna dokunan biriyle derin, sakin bir bağ kurar.",
      kariyer: "Araştırma, bilim, felsefe, teknoloji ve ruhsal çalışmalar; derinlik isteyen her alanda ustadır.",
    },
    8: {
      ad: "Güç", resim: "eller-sekiz", anahtar: ["başarı", "bolluk", "otorite"],
      ozet: "8, maddi ve manevi gücün sayısıdır. Hedef koyar, organize eder ve sonuç alır. Bolluğu çekme yeteneği güçlüdür; ama asıl dersi gücü adaletle kullanmaktır.",
      guclu: ["Hırs ve azim", "Organizasyon", "Liderlik", "Dayanıklılık"],
      golge: ["İşkoliklik", "Kontrolcülük", "Maddiyata fazla odaklanma"],
      ask: "Aşkta koruyucu ve cömerttir; güçlü, kendine güvenen ve onu takdir eden biriyle uyumludur.",
      kariyer: "Yöneticilik, finans, hukuk, iş kurmak ve gayrimenkul; büyük ölçekli işlerde başarılıdır.",
    },
    9: {
      ad: "İnsancıl", resim: "hayat-agaci", anahtar: ["merhamet", "bilgelik", "tamamlanma"],
      ozet: "9, döngüyü tamamlayan sayıdır. Tüm sayıların deneyimini taşır; geniş yüreklidir, insanlığa ve dünyaya hizmet etmek ister. Bırakmayı ve affetmeyi bilir.",
      guclu: ["Merhamet", "Cömertlik", "Geniş bakış açısı", "İlham verme"],
      golge: ["Geçmişe tutunma", "Kendini ihmal etme", "Hayal kırıklığı"],
      ask: "Aşkta romantik ve fedakârdır; ruhunu paylaşabileceği, ideallerine ortak biriyle bütünleşir.",
      kariyer: "Sanat, sağlık, eğitim, yardım kuruluşları ve uluslararası işler; anlam taşıyan işlerde mutludur.",
    },
    11: {
      ad: "Aydınlatıcı (Üstat Sayı)", resim: "cakra", anahtar: ["ilham", "sezgi", "ruhsal ışık"],
      ozet: "11, ilk üstat sayıdır: sezgisi çok güçlü, ruhsal farkındalığı yüksek bir ışık taşıyıcısıdır. 2'nin duyarlılığını iki katına çıkarır. Başkalarına ilham verir, ama yüksek titreşimi bazen yorucu olabilir.",
      guclu: ["Güçlü sezgi", "İlham verme", "Vizyon", "Ruhsal derinlik"],
      golge: ["Gerginlik ve kaygı", "Kendinden şüphe", "Aşırı duyarlılık"],
      ask: "Aşkta ruh eşi arar; anlam ve derinlik taşıyan, onu anlayan bir bağ ister.",
      kariyer: "Rehberlik, sanat, şifa, öğretmenlik ve ruhsal çalışmalar; insanlara ilham verdiği işlerde parlar.",
    },
    22: {
      ad: "Usta Mimar (Üstat Sayı)", resim: "kristal-zar", anahtar: ["vizyon", "inşa", "büyük işler"],
      ozet: "22, en güçlü üstat sayıdır: büyük hayalleri somut, kalıcı yapılara dönüştürme yeteneği taşır. 4'ün disiplinine 11'in vizyonunu ekler. Topluma iz bırakacak işler için doğmuştur.",
      guclu: ["Vizyonerlik", "Pratik deha", "Liderlik", "Kalıcı başarı"],
      golge: ["Ağır sorumluluk baskısı", "Aşırı kontrol", "Mükemmeliyetçilik"],
      ask: "Aşkta güvenilir ve kararlıdır; büyük hedeflerini paylaşan, onu destekleyen bir ortak ister.",
      kariyer: "Mimarlık, büyük organizasyonlar, kurum kurmak ve toplumsal projeler; ölçek ne kadar büyükse o kadar iyi.",
    },
    33: {
      ad: "Usta Öğretmen (Üstat Sayı)", resim: "sayi-cemberi", anahtar: ["koşulsuz sevgi", "şifa", "öğretmenlik"],
      ozet: "33, en nadir üstat sayıdır: şefkati, şifayı ve öğretmeyi birleştirir. 6'nın sevgisini evrensel bir sorumluluğa dönüştürür. Varlığıyla çevresini iyileştirir.",
      guclu: ["Koşulsuz sevgi", "Şifa enerjisi", "Bilgelik", "Fedakârlık"],
      golge: ["Kendini tüketme", "Başkalarının yükünü taşıma", "Sınır koyamama"],
      ask: "Aşkta derin şefkatlidir; sevgiyi büyüten, birlikte iyilik üreten bir ilişki ister.",
      kariyer: "Öğretmenlik, şifa, psikoloji, sanat ve topluma hizmet; insanları dönüştürdüğü her alanda değerlidir.",
    },
  };

  const pozisyonlar = {
    yasamYolu: { ad: "Yaşam Yolu", aciklama: "Doğum tarihinden gelir; hayat yolculuğunun ana teması ve öğrenmeye geldiğin ders." },
    kader: { ad: "Kader (İfade)", aciklama: "Tam adındaki tüm harflerden gelir; yeteneklerin ve bu hayatta ortaya koyacakların." },
    ruh: { ad: "Ruh Güdüsü", aciklama: "Adındaki sesli harflerden gelir; kalbinin en derin isteği, içten içe seni ne mutlu eder." },
    kisilik: { ad: "Kişilik", aciklama: "Adındaki sessiz harflerden gelir; dış dünyanın seni ilk bakışta nasıl gördüğü." },
    dogumGunu: { ad: "Doğum Günü", aciklama: "Doğduğun günden gelir; yaşam yoluna eşlik eden özel bir yetenek." },
    olgunluk: { ad: "Olgunluk", aciklama: "Yaşam Yolu ile Kader'in toplamı; yaşın ilerledikçe öne çıkan hedefin." },
    kisiselYil: { ad: "Kişisel Yıl", aciklama: "Bu takvim yılının sana özel teması; 9 yıllık döngüde neredesin." },
  };

  const kisiselYil = {
    1: "Yeni başlangıçlar yılı: tohum ekme zamanı. Yeni bir işe, ilişkiye ya da projeye cesurca adım at.",
    2: "Sabır ve ortaklık yılı: ekilen tohumlar kök salıyor. İş birlikleri ve ilişkiler öne çıkıyor; acele etme.",
    3: "İfade ve keyif yılı: sosyal çevren genişliyor, yaratıcılığın canlanıyor. Kendini göster.",
    4: "Emek ve temel atma yılı: düzen kur, çalış, sağlamlaştır. Bugünkü disiplin yarının güvencesi.",
    5: "Değişim ve özgürlük yılı: sürprizlere, yolculuklara ve yeniliklere açık ol. Esnek olan kazanır.",
    6: "Sevgi ve sorumluluk yılı: aile, ev ve ilişkiler gündemde. Sevdiklerine zaman ayır, yuvanı güzelleştir.",
    7: "İçe dönüş ve öğrenme yılı: dinlen, araştır, kendini dinle. Ruhsal büyüme için güçlü bir dönem.",
    8: "Güç ve bolluk yılı: emeklerinin karşılığını alma zamanı. Kariyer ve para konularında cesur ol.",
    9: "Tamamlanma ve arınma yılı: döngü kapanıyor. Artık sana hizmet etmeyeni bırak, yeni başlangıca yer aç.",
  };

  const gunEnerjisi = {
    1: "Başlatma günü: yeni bir fikre, işe ya da konuşmaya ilk adımı at. İnisiyatif senin elinde.",
    2: "Uyum günü: dinle, iş birliği yap, küçük jestlerle bağ kur. Sabır bugün en güçlü silahın.",
    3: "İfade günü: konuş, yaz, paylaş, gül. Yaratıcılığın ve sosyal enerjin yüksek.",
    4: "Düzen günü: listeni yap, ertelediğin işleri bitir. Sağlam adımlar sana huzur verecek.",
    5: "Değişim günü: rutinin dışına çık, yeni bir şey dene. Esnek ol, sürprizlere açık ol.",
    6: "Sevgi günü: ailene, evine ve sevdiklerine zaman ayır. Bir iyilik, günün en güzel anı olabilir.",
    7: "Sükûnet günü: biraz yalnız kal, düşün, oku, dinlen. Sezgilerin bugün sana yol gösterecek.",
    8: "Başarı günü: para, iş ve hedefler gündemde. Kararlı ol, emeğinin hakkını iste.",
    9: "Bırakma günü: bitmesi gerekeni bitir, affet, arın. Yarına hafiflemiş gir.",
  };

  const karmikBorclar = {
    13: "13 karmik borcu: emek ve sabır dersi. Kısa yollar yerine istikrarlı çalışma seni ödüllendirir.",
    14: "14 karmik borcu: özgürlüğü dengeleme dersi. Aşırılıklardan kaçınıp ölçülü olmak seni güçlendirir.",
    16: "16 karmik borcu: egodan arınma dersi. Ani değişimler seni daha bilge ve alçakgönüllü yapar.",
    19: "19 karmik borcu: güç ve bağımsızlık dersi. Yardım istemeyi öğrenmek seni özgürleştirir.",
  };

  const eksikSayilar = {
    1: "1 eksik: kendi sesini duyurmayı ve kendine güvenmeyi öğreniyorsun.",
    2: "2 eksik: sabır, iş birliği ve başkalarının duygularına alan açmayı öğreniyorsun.",
    3: "3 eksik: kendini özgürce ifade etmeyi ve hayatın tadını çıkarmayı öğreniyorsun.",
    4: "4 eksik: düzen, disiplin ve adım adım ilerlemeyi öğreniyorsun.",
    5: "5 eksik: değişime açılmayı ve risk almayı öğreniyorsun.",
    6: "6 eksik: sorumluluk almayı ve sevgini göstermeyi öğreniyorsun.",
    7: "7 eksik: kendi iç sesine güvenmeyi ve derinleşmeyi öğreniyorsun.",
    8: "8 eksik: parayla, güçle ve kendi değerinle barışmayı öğreniyorsun.",
    9: "9 eksik: bırakmayı, affetmeyi ve daha geniş bir yürekle bakmayı öğreniyorsun.",
  };

  const kavramlar = [
    ["Pisagor sistemi", "Her harf 1 ile 9 arasında bir sayıya karşılık gelir (A=1, B=2 … I=9, J=1 …). Türkçe harfler temel harflerine göre sayılır: Ç=C, Ğ=G, Ö=O, Ş=S, Ü=U."],
    ["İndirgeme", "Sayının rakamları toplanarak tek haneye inilir: 28 → 2+8 = 10 → 1+0 = 1."],
    ["Üstat sayılar", "11, 22 ve 33 indirgenmez; daha yüksek bir titreşim ve daha büyük bir sorumluluk taşırlar."],
    ["Karmik borç", "13, 14, 16 ve 19 hesap sırasında görülürse geçmişten gelen bir dersin işaretidir."],
    ["Eksik sayılar", "Adında hiç bulunmayan sayılar, bu hayatta geliştirmeye geldiğin alanları gösterir."],
    ["Lo Shu ızgarası", "Doğum tarihindeki rakamların 3×3'lük kadim Çin karesine yerleşimi; güçlü ve boş alanlarını gösterir."],
  ];

  return { sayilar, pozisyonlar, kisiselYil, gunEnerjisi, karmikBorclar, eksikSayilar, kavramlar };
});
