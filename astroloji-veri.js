// Astroloji bölümünün sabit içeriği (tarayıcı + sunucu). Yorumlar Ezoter.ist'in kendi metinleridir.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AstrolojiVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const burclar = {
    koc: {
      ad: "Koç", sembol: "♈", tarih: "21 Mart – 19 Nisan", element: "ates", nitelik: "Öncü", gezegen: "Mars",
      tas: "Kırmızı jasper", renk: "Kırmızı", gun: "Salı", anahtar: ["cesaret", "başlangıç", "tutku"],
      ozet: "Zodyağın ilk burcu Koç, baharın ilk kıvılcımıdır. Bir şey istediğinde beklemez, ilk adımı atan hep odur. Enerjisi bulaşıcıdır; durgun bir odaya girdiğinde ortamı hareketlendirir.",
      guclu: ["Cesur ve girişken", "Dürüst ve açık sözlü", "Hızlı karar verir", "Liderlik ruhu güçlü"],
      golge: ["Sabırsızlık", "Düşünmeden hareket etme", "Çabuk parlayıp çabuk sönme"],
      ask: "Aşkta avcıdır; heyecanı, kovalamacayı ve tutkuyu sever. Sevdiğini korur, ama ilgisiz kaldığını hissettiğinde çabuk soğur.",
      kariyer: "Rekabetin olduğu, hızlı karar gerektiren işlerde parlar. Girişimcilik, spor ve acil durum meslekleri ona göredir.",
      uyum: ["aslan", "yay", "ikizler"],
      mitoloji: "Altın postlu koçtan gelir: Frixos ile Helle'yi sırtında taşıyıp kurtaran, sonra gökyüzüne yerleştirilen kahraman koç.",
    },
    boga: {
      ad: "Boğa", sembol: "♉", tarih: "20 Nisan – 20 Mayıs", element: "toprak", nitelik: "Sabit", gezegen: "Venüs",
      tas: "Zümrüt", renk: "Yeşil", gun: "Cuma", anahtar: ["güven", "sabır", "haz"],
      ozet: "Boğa, toprağın bereketini ve sakin gücünü taşır. Yavaş ama emin adımlarla ilerler; bir kez karar verdiğinde onu yolundan döndürmek zordur. Güzel olanı, lezzetli olanı ve kalıcı olanı sever.",
      guclu: ["Sadık ve güvenilir", "Sabırlı ve kararlı", "Pratik ve ayağı yere basan", "Estetik zevki yüksek"],
      golge: ["İnatçılık", "Değişime direnç", "Sahiplenicilik"],
      ask: "Aşkta yavaş açılır ama derin bağlanır. Dokunuşa, güzel sofralara ve huzurlu bir eve önem verir; sadakat onun için vazgeçilmezdir.",
      kariyer: "Finans, mimari, sanat, gastronomi ve doğayla ilgili işlerde başarılıdır. Uzun vadeli, sağlam yapılar kurmayı sever.",
      uyum: ["basak", "oglak", "yengec"],
      mitoloji: "Zeus'un, güzel Europa'yı kaçırmak için büründüğü beyaz boğadır; Europa kıtasının adı da bu hikâyeden gelir.",
    },
    ikizler: {
      ad: "İkizler", sembol: "♊", tarih: "21 Mayıs – 20 Haziran", element: "hava", nitelik: "Değişken", gezegen: "Merkür",
      tas: "Akik", renk: "Sarı", gun: "Çarşamba", anahtar: ["merak", "iletişim", "çeviklik"],
      ozet: "İkizler zodyağın meraklı habercisidir. Aklı aynı anda birçok konuda dolaşır; konuşmayı, öğrenmeyi ve bağlantı kurmayı sever. Sıkılmak onun en büyük düşmanıdır.",
      guclu: ["Zeki ve hazırcevap", "Uyum sağlaması kolay", "Sosyal ve eğlenceli", "Öğrenmeye açık"],
      golge: ["Dağınıklık", "Kararsızlık", "Yüzeyde kalma eğilimi"],
      ask: "Aşkta önce zihin uyumu arar; iyi bir sohbet onun için en güçlü çekimdir. Esprili, değişken ve sürprizlerle dolu bir ilişki ister.",
      kariyer: "Yazarlık, gazetecilik, satış, eğitim ve medya gibi iletişim ağırlıklı alanlarda parlar.",
      uyum: ["terazi", "kova", "koc"],
      mitoloji: "Ölümlü Kastor ile ölümsüz Polluks'tur; ayrılmamak için ölümsüzlüğü paylaşan ve gökte yan yana parlayan iki kardeş.",
    },
    yengec: {
      ad: "Yengeç", sembol: "♋", tarih: "21 Haziran – 22 Temmuz", element: "su", nitelik: "Öncü", gezegen: "Ay",
      tas: "Aytaşı", renk: "Gümüş", gun: "Pazartesi", anahtar: ["şefkat", "yuva", "sezgi"],
      ozet: "Yengeç, kabuğunun altında kocaman bir kalp taşır. Ailesine, evine ve sevdiklerine derinden bağlıdır. Sezgileri güçlüdür; bir odadaki havayı söze gerek kalmadan hisseder.",
      guclu: ["Şefkatli ve koruyucu", "Sezgileri kuvvetli", "Sadık dost", "Duygusal zekâsı yüksek"],
      golge: ["Alınganlık", "Geçmişe takılma", "Ruh hali dalgalanmaları"],
      ask: "Aşkta güven arar; kalbini açtığında tüm benliğiyle sever. Ona kendini evinde hissettiren biri, onun için her şeydir.",
      kariyer: "Sağlık, eğitim, psikoloji, gıda ve ev-yaşam alanlarında; insanlara bakım veren işlerde mutludur.",
      uyum: ["akrep", "balik", "boga"],
      mitoloji: "Herakles'in Hydra ile savaşında ona saldıran yengeçtir; Hera, sadakati için onu yıldızlara yerleştirmiştir.",
    },
    aslan: {
      ad: "Aslan", sembol: "♌", tarih: "23 Temmuz – 22 Ağustos", element: "ates", nitelik: "Sabit", gezegen: "Güneş",
      tas: "Kehribar", renk: "Altın", gun: "Pazar", anahtar: ["yaratıcılık", "cömertlik", "ışık"],
      ozet: "Aslan, Güneş'in çocuğudur; parlamak için doğmuştur. Sıcak, cömert ve yaratıcıdır. Sahnede olmayı sever ama asıl gücü, çevresindekileri de parlatabilmesidir.",
      guclu: ["Cömert ve sıcak kalpli", "Yaratıcı ve oyuncu", "Kendine güvenli", "Koruyucu lider"],
      golge: ["Gurur", "Takdir edilme ihtiyacı", "Dramatize etme"],
      ask: "Aşkta romantik ve gösterişlidir; sevgisini büyük jestlerle gösterir. Karşılığında hayranlık ve sadakat bekler.",
      kariyer: "Sanat, sahne, yöneticilik, eğitim ve marka işlerinde; görünür olduğu her rolde başarılıdır.",
      uyum: ["koc", "yay", "terazi"],
      mitoloji: "Herakles'in ilk görevinde yendiği, oklar işlemeyen Nemea aslanıdır.",
    },
    basak: {
      ad: "Başak", sembol: "♍", tarih: "23 Ağustos – 22 Eylül", element: "toprak", nitelik: "Değişken", gezegen: "Merkür",
      tas: "Safir", renk: "Lacivert", gun: "Çarşamba", anahtar: ["düzen", "hizmet", "şifa"],
      ozet: "Başak, hasat zamanının özenli elidir. Ayrıntıları görür, düzen kurar ve işleri iyileştirmeyi sever. Yardım etmek onun sevgi dilidir.",
      guclu: ["Çalışkan ve titiz", "Analitik düşünür", "Yardımsever", "Mütevazı ve güvenilir"],
      golge: ["Aşırı eleştirellik", "Kaygıya yatkınlık", "Mükemmeliyetçilik"],
      ask: "Aşkta sözden çok davranışa bakar; küçük ama düşünceli jestlerle sever. Güvendiğinde son derece sadık bir partnerdir.",
      kariyer: "Sağlık, araştırma, editörlük, muhasebe, yazılım ve el işçiliğinde; dikkat isteyen her alanda ustadır.",
      uyum: ["boga", "oglak", "akrep"],
      mitoloji: "Elinde başak taşıyan hasat tanrıçası Demeter ya da adaleti temsil eden bakire Astraea ile anılır.",
    },
    terazi: {
      ad: "Terazi", sembol: "♎", tarih: "23 Eylül – 22 Ekim", element: "hava", nitelik: "Öncü", gezegen: "Venüs",
      tas: "Opal", renk: "Pembe", gun: "Cuma", anahtar: ["denge", "uyum", "estetik"],
      ozet: "Terazi, zodyağın diplomatıdır. Adaleti, güzelliği ve uyumu arar. İnsanlar arasında köprü kurar; çatışmayı sevmez, herkesin sesinin duyulmasını ister.",
      guclu: ["Diplomatik ve nazik", "Adil", "Zarif ve estetik", "İyi bir dinleyici"],
      golge: ["Kararsızlık", "Hayır diyememe", "Çatışmadan kaçma"],
      ask: "Aşkta romantik ve zariftir; ilişkiyi bir ortaklık olarak görür. Güzel anlar, nazik sözler ve denge onun için önemlidir.",
      kariyer: "Hukuk, tasarım, moda, insan kaynakları ve diplomasi gibi denge ve estetik isteyen alanlarda başarılıdır.",
      uyum: ["ikizler", "kova", "aslan"],
      mitoloji: "Adalet tanrıçası Themis'in ve kızı Astraea'nın elindeki terazidir; zodyakta tek cansız semboldür.",
    },
    akrep: {
      ad: "Akrep", sembol: "♏", tarih: "23 Ekim – 21 Kasım", element: "su", nitelik: "Sabit", gezegen: "Plüton (geleneksel: Mars)",
      tas: "Obsidyen", renk: "Bordo", gun: "Salı", anahtar: ["derinlik", "dönüşüm", "tutku"],
      ozet: "Akrep, yüzeyin altında olanı görür. Yoğun, tutkulu ve sezgiseldir. Hayatı yarım yamalak yaşamaz; her bitişten daha güçlü bir başlangıç çıkarmayı bilir.",
      guclu: ["Derin sezgi", "Kararlılık ve odak", "Sadakat", "Dönüştürücü güç"],
      golge: ["Kıskançlık", "Kin tutma", "Kontrol ihtiyacı"],
      ask: "Aşkta ya hep ya hiç der; derin bir bağ, güven ve tutku ister. Kalbini açtığı kişiye ruhunu verir.",
      kariyer: "Araştırma, psikoloji, tıp, finans ve kriz yönetimi gibi derinlik ve sır gerektiren işlerde güçlüdür.",
      uyum: ["yengec", "balik", "basak"],
      mitoloji: "Avcı Orion'u alt etmek için gönderilen akreptir; bu yüzden ikisi gökte asla aynı anda görünmez.",
    },
    yay: {
      ad: "Yay", sembol: "♐", tarih: "22 Kasım – 21 Aralık", element: "ates", nitelik: "Değişken", gezegen: "Jüpiter",
      tas: "Turkuaz", renk: "Mor", gun: "Perşembe", anahtar: ["özgürlük", "keşif", "iyimserlik"],
      ozet: "Yay, okunu ufka çeviren gezgindir. Yeni yerler, yeni fikirler ve büyük anlamlar peşindedir. İyimserliği ve mizah anlayışı en zor günleri bile hafifletir.",
      guclu: ["İyimser ve neşeli", "Özgür ruhlu", "Felsefi ve meraklı", "Dürüst"],
      golge: ["Patavatsızlık", "Bağlanmaktan kaçma", "Aşırıya kaçma"],
      ask: "Aşkta macera arkadaşı arar; kendisiyle birlikte büyüyen, onu kısıtlamayan biriyle mutludur.",
      kariyer: "Seyahat, akademi, yayıncılık, hukuk ve öğretmenlik gibi ufuk genişleten işlerde parlar.",
      uyum: ["koc", "aslan", "kova"],
      mitoloji: "Bilge kentaur Chiron'dur; kahramanlara öğretmenlik yapan, şifacı ve okçu yarı insan yarı at.",
    },
    oglak: {
      ad: "Oğlak", sembol: "♑", tarih: "22 Aralık – 19 Ocak", element: "toprak", nitelik: "Öncü", gezegen: "Satürn",
      tas: "Oniks", renk: "Kahverengi", gun: "Cumartesi", anahtar: ["disiplin", "hedef", "sorumluluk"],
      ozet: "Oğlak, dağın zirvesine adım adım tırmanan dağ keçisidir. Disiplinli, sabırlı ve hedef odaklıdır. Zamanla olgunlaşan bir şarap gibi, yaşı ilerledikçe daha da parlar.",
      guclu: ["Sorumluluk sahibi", "Disiplinli ve azimli", "Stratejik düşünür", "Güvenilir"],
      golge: ["Aşırı ciddiyet", "Duygularını saklama", "İşkoliklik"],
      ask: "Aşkta temkinlidir ama bağlandığında kalıcıdır. Sevgisini güven vererek, emek vererek ve söz tutarak gösterir.",
      kariyer: "Yöneticilik, mühendislik, finans, devlet ve kendi işini kurmak; uzun soluklu her kariyerde zirveye çıkar.",
      uyum: ["boga", "basak", "balik"],
      mitoloji: "Yarı keçi yarı balık Pan ya da Zeus'u besleyen keçi Amaltheia ile anılır.",
    },
    kova: {
      ad: "Kova", sembol: "♒", tarih: "20 Ocak – 18 Şubat", element: "hava", nitelik: "Sabit", gezegen: "Uranüs (geleneksel: Satürn)",
      tas: "Ametist", renk: "Elektrik mavisi", gun: "Cumartesi", anahtar: ["özgünlük", "gelecek", "dostluk"],
      ozet: "Kova, geleceği bugünden düşleyen yenilikçidir. Kalıpların dışında düşünür, farklı olmaktan korkmaz. İnsanlığa ve dostluğa büyük değer verir.",
      guclu: ["Yenilikçi ve özgün", "İnsancıl", "Bağımsız", "Vizyoner"],
      golge: ["Duygusal mesafe", "İnatçılık", "Asilik"],
      ask: "Aşkta önce dostluk arar; özgürlüğüne saygı duyan, zihnini besleyen biriyle bağ kurar.",
      kariyer: "Teknoloji, bilim, sosyal girişimcilik, astroloji ve yaratıcı tasarım alanlarında öncüdür.",
      uyum: ["ikizler", "terazi", "yay"],
      mitoloji: "Tanrılara sakilik yapan güzel Ganymedes'tir; testisinden göklere akan su hayat verir.",
    },
    balik: {
      ad: "Balık", sembol: "♓", tarih: "19 Şubat – 20 Mart", element: "su", nitelik: "Değişken", gezegen: "Neptün (geleneksel: Jüpiter)",
      tas: "Akuamarin", renk: "Deniz yeşili", gun: "Perşembe", anahtar: ["hayal", "empati", "ruhsallık"],
      ozet: "Balık, zodyağın son ve en mistik burcudur. Hayal gücü sınırsız, empatisi derindir. Görünmeyeni hisseder; sanat ve ruhsallık onun doğal dilidir.",
      guclu: ["Empatik ve şefkatli", "Hayal gücü zengin", "Sezgisel", "Fedakâr"],
      golge: ["Gerçeklerden kaçma", "Sınır koyamama", "Kolay etkilenme"],
      ask: "Aşkta masalsı ve fedakârdır; ruh eşini arar. Sevdiğinin duygularını kendi duyguları gibi yaşar.",
      kariyer: "Sanat, müzik, şifa, psikoloji ve yardım kuruluşlarında; hayal gücü ve şefkat isteyen işlerde mutludur.",
      uyum: ["yengec", "akrep", "oglak"],
      mitoloji: "Canavar Tifon'dan kaçmak için balığa dönüşen ve birbirine bir iple bağlanan Afrodit ile oğlu Eros'tur.",
    },
  };

  const elementler = {
    ates: { ad: "Ateş", ikon: "🔥", burclar: ["koc", "aslan", "yay"], aciklama: "Tutku, cesaret ve ilham. Ateş burçları harekete geçirir, heyecan yaratır." },
    toprak: { ad: "Toprak", ikon: "🌿", burclar: ["boga", "basak", "oglak"], aciklama: "Güven, emek ve somutluk. Toprak burçları hayali gerçeğe dönüştürür." },
    hava: { ad: "Hava", ikon: "🌬️", burclar: ["ikizler", "terazi", "kova"], aciklama: "Düşünce, iletişim ve bağ. Hava burçları fikirleri dolaştırır, insanları buluşturur." },
    su: { ad: "Su", ikon: "🌊", burclar: ["yengec", "akrep", "balik"], aciklama: "Duygu, sezgi ve derinlik. Su burçları hisseder, iyileştirir, dönüştürür." },
  };

  const nitelikler = {
    "Öncü": "Mevsimleri başlatan burçlar (Koç, Yengeç, Terazi, Oğlak): ilk adımı atar, başlatır.",
    "Sabit": "Mevsimin ortasındaki burçlar (Boğa, Aslan, Akrep, Kova): sürdürür, derinleştirir.",
    "Değişken": "Mevsimi kapatan burçlar (İkizler, Başak, Yay, Balık): uyum sağlar, dönüştürür.",
  };

  const gezegenler = {
    sun: { ad: "Güneş", sembol: "☉", anlam: "Öz benlik, yaşam enerjisi ve parlamak istediğin alan." },
    moon: { ad: "Ay", sembol: "☽", anlam: "Duygular, iç dünya, ihtiyaçların ve kendini güvende hissetme biçimin." },
    mercury: { ad: "Merkür", sembol: "☿", anlam: "Düşünce, konuşma, öğrenme ve yolculuklar." },
    venus: { ad: "Venüs", sembol: "♀", anlam: "Aşk, güzellik, zevkler ve değer verdiklerin." },
    mars: { ad: "Mars", sembol: "♂", anlam: "İrade, cesaret, mücadele ve tutku." },
    jupiter: { ad: "Jüpiter", sembol: "♃", anlam: "Şans, büyüme, inanç ve bolluk." },
    saturn: { ad: "Satürn", sembol: "♄", anlam: "Sınırlar, sorumluluk, zaman ve olgunlaşma." },
    uranus: { ad: "Uranüs", sembol: "♅", anlam: "Ani değişimler, özgürlük ve yenilik." },
    neptune: { ad: "Neptün", sembol: "♆", anlam: "Hayaller, sezgi, ruhsallık ve ilham." },
    pluto: { ad: "Plüton", sembol: "♇", anlam: "Dönüşüm, güç ve küllerinden doğuş." },
  };

  // Ay burcu: duygusal ihtiyaç (kısa).
  const ayBurcunda = {
    koc: "Duygularını hızlı ve doğrudan yaşarsın; öfken de sevincin de çabuk parlar, çabuk geçer.",
    boga: "Huzur, düzen ve fiziksel konfor seni sakinleştirir; duygusal güvenliğe çok önem verirsin.",
    ikizler: "Duygularını konuşarak anlarsın; merakın ve sohbet, iç dünyanın en iyi ilacıdır.",
    yengec: "Ay kendi evinde: duyguların derin, sezgilerin güçlü, aile bağların çok önemli.",
    aslan: "Sevilmek ve takdir edilmek seni besler; duygularını cömertçe ve sıcacık gösterirsin.",
    basak: "İşleri yoluna koymak seni rahatlatır; sevgini yardım ederek, özen göstererek ifade edersin.",
    terazi: "Uyum ve denge duygusal huzurunun anahtarıdır; yalnızlık yerine paylaşmayı seçersin.",
    akrep: "Duyguların yoğun ve derindir; güvendiğin insanlarla ruhunun en derinini paylaşırsın.",
    yay: "Özgürlük ve anlam duygusal yakıtındır; iyimserliğin seni zor anlarda ayakta tutar.",
    oglak: "Duygularını kontrol altında tutarsın; güven ve istikrar seni en çok rahatlatan şeydir.",
    kova: "Duygularına biraz mesafeden bakarsın; dostluk ve özgürlük senin için çok kıymetlidir.",
    balik: "Sünger gibi hissedersin; empatin derin, hayal gücün iç dünyanın en güzel sığınağıdır.",
  };

  // Yükselen: dışarıya nasıl göründüğün (kısa).
  const yukselenBurcunda = {
    koc: "İlk izlenimde enerjik, cesur ve doğrudan görünürsün; insanlar seni bir hareket kaynağı olarak algılar.",
    boga: "Sakin, güven veren ve zarif bir duruşun vardır; yanında olmak insanlara huzur verir.",
    ikizler: "Meraklı, konuşkan ve genç ruhlu görünürsün; ilk sohbette insanları kendine çekersin.",
    yengec: "Yumuşak, korumacı ve sıcak bir enerjin vardır; insanlar sana kolayca açılır.",
    aslan: "Girdiğin yerde fark edilirsin; özgüvenli, karizmatik ve sıcak bir izlenim bırakırsın.",
    basak: "Düzenli, dikkatli ve zarif görünürsün; güvenilir ve yardımsever bir ilk izlenimin vardır.",
    terazi: "Zarif, nazik ve sevimli görünürsün; insanlar senin yanında kendilerini rahat hisseder.",
    akrep: "Gizemli ve etkileyici bir havan vardır; bakışların derin, varlığın güçlüdür.",
    yay: "Neşeli, açık ve maceraperest görünürsün; enerjin insanlara iyimserlik aşılar.",
    oglak: "Ciddi, olgun ve kendinden emin görünürsün; insanlar sana doğal olarak güvenir.",
    kova: "Farklı, özgün ve biraz gizemli görünürsün; seni bir kalıba sokmak zordur.",
    balik: "Hayalperest, yumuşak ve şefkatli bir izlenim bırakırsın; insanlar seni anlayışlı bulur.",
  };

  // Ay'ın, kişinin Güneş burcuna göre konumu → günün havası.
  const gunlukAcilar = {
    kavusum: "Ay bugün senin burcunda: duyguların ve sezgilerin güçlü, enerjin yüksek. Kendine zaman ayır ve içinden geleni dinle; bugün ne istediğini her zamankinden net hissedebilirsin.",
    "yarim-altmislik": "Ay sana komşu bir burçta: küçük ayarlamalar günü. Planlarında ufak değişiklikler yapmak, beklenmedik bir kolaylık getirebilir.",
    altmislik: "Ay seninle uyumlu bir açıda: fırsatların kapıyı çaldığı, iletişimin kolay aktığı bir gün. Bir telefon, bir mesaj ya da bir buluşma güzel sonuçlar doğurabilir.",
    kare: "Ay seninle gerilimli bir açıda: sabır günü. Tepki vermeden önce bir nefes al; küçük sürtüşmeleri büyütmezsen, bu gerilim seni harekete geçiren bir güce dönüşür.",
    ucgen: "Ay seninle ahenkli bir açıda: akışın yanında olduğun bir gün. Yaratıcılığın ve şansın yüksek; ertelediğin güzel işler için harika bir zaman.",
    "yarim-karsit": "Ay sana göre zorlu bir köşede: dengeleme günü. İhtiyaçlarınla sorumlulukların arasında orta yolu bulmak, günü kolaylaştırır.",
    karsit: "Ay karşı burcunda: ilişkiler gündemde. Başkalarının bakış açısı sana yeni bir şey öğretebilir; uzlaşma ve dinleme bugün en büyük gücün.",
  };

  const elementDuygu = {
    ates: "Ay ateş burcunda; ortamda cesaret ve heyecan var.",
    toprak: "Ay toprak burcunda; somut işler ve düzen ön planda.",
    hava: "Ay hava burcunda; konuşmalar, fikirler ve bağlantılar canlı.",
    su: "Ay su burcunda; duygular ve sezgiler derinleşiyor.",
  };

  // Türkiye'nin 81 ili (yaklaşık merkez koordinatları) + sık kullanılan yurt dışı şehirleri.
  const sehirler = [
    ["Adana", 37.0, 35.32], ["Adıyaman", 37.76, 38.28], ["Afyonkarahisar", 38.76, 30.54], ["Ağrı", 39.72, 43.05],
    ["Aksaray", 38.37, 34.03], ["Amasya", 40.65, 35.83], ["Ankara", 39.93, 32.86], ["Antalya", 36.89, 30.71],
    ["Ardahan", 41.11, 42.7], ["Artvin", 41.18, 41.82], ["Aydın", 37.85, 27.84], ["Balıkesir", 39.65, 27.88],
    ["Bartın", 41.64, 32.34], ["Batman", 37.88, 41.13], ["Bayburt", 40.26, 40.23], ["Bilecik", 40.14, 29.98],
    ["Bingöl", 38.88, 40.5], ["Bitlis", 38.4, 42.11], ["Bolu", 40.74, 31.61], ["Burdur", 37.72, 30.29],
    ["Bursa", 40.19, 29.06], ["Çanakkale", 40.15, 26.41], ["Çankırı", 40.6, 33.62], ["Çorum", 40.55, 34.95],
    ["Denizli", 37.78, 29.09], ["Diyarbakır", 37.91, 40.24], ["Düzce", 40.84, 31.16], ["Edirne", 41.68, 26.56],
    ["Elazığ", 38.67, 39.22], ["Erzincan", 39.75, 39.49], ["Erzurum", 39.9, 41.27], ["Eskişehir", 39.78, 30.52],
    ["Gaziantep", 37.07, 37.38], ["Giresun", 40.91, 38.39], ["Gümüşhane", 40.46, 39.48], ["Hakkâri", 37.57, 43.74],
    ["Hatay", 36.2, 36.16], ["Iğdır", 39.92, 44.05], ["Isparta", 37.76, 30.55], ["İstanbul", 41.01, 28.98],
    ["İzmir", 38.42, 27.14], ["Kahramanmaraş", 37.58, 36.94], ["Karabük", 41.2, 32.63], ["Karaman", 37.18, 33.22],
    ["Kars", 40.6, 43.1], ["Kastamonu", 41.39, 33.78], ["Kayseri", 38.73, 35.48], ["Kırıkkale", 39.85, 33.51],
    ["Kırklareli", 41.73, 27.22], ["Kırşehir", 39.15, 34.16], ["Kilis", 36.72, 37.12], ["Kocaeli", 40.77, 29.92],
    ["Konya", 37.87, 32.48], ["Kütahya", 39.42, 29.98], ["Malatya", 38.35, 38.31], ["Manisa", 38.61, 27.43],
    ["Mardin", 37.31, 40.74], ["Mersin", 36.81, 34.64], ["Muğla", 37.22, 28.36], ["Muş", 38.74, 41.49],
    ["Nevşehir", 38.62, 34.71], ["Niğde", 37.97, 34.68], ["Ordu", 40.98, 37.88], ["Osmaniye", 37.07, 36.25],
    ["Rize", 41.02, 40.52], ["Sakarya", 40.78, 30.4], ["Samsun", 41.29, 36.33], ["Siirt", 37.93, 41.94],
    ["Sinop", 42.03, 35.15], ["Sivas", 39.75, 37.02], ["Şanlıurfa", 37.16, 38.79], ["Şırnak", 37.52, 42.46],
    ["Tekirdağ", 40.98, 27.51], ["Tokat", 40.31, 36.55], ["Trabzon", 41.0, 39.72], ["Tunceli", 39.11, 39.55],
    ["Uşak", 38.68, 29.41], ["Van", 38.5, 43.38], ["Yalova", 40.65, 29.27], ["Yozgat", 39.82, 34.81],
    ["Zonguldak", 41.46, 31.79],
    ["Lefkoşa (KKTC)", 35.19, 33.36, "Asia/Nicosia"], ["Bakü", 40.41, 49.87, "Asia/Baku"],
    ["Berlin", 52.52, 13.4, "Europe/Berlin"], ["Köln", 50.94, 6.96, "Europe/Berlin"], ["Münih", 48.14, 11.58, "Europe/Berlin"],
    ["Frankfurt", 50.11, 8.68, "Europe/Berlin"], ["Hamburg", 53.55, 9.99, "Europe/Berlin"], ["Viyana", 48.21, 16.37, "Europe/Vienna"],
    ["Amsterdam", 52.37, 4.9, "Europe/Amsterdam"], ["Brüksel", 50.85, 4.35, "Europe/Brussels"], ["Paris", 48.86, 2.35, "Europe/Paris"],
    ["Londra", 51.51, -0.13, "Europe/London"], ["Stockholm", 59.33, 18.07, "Europe/Stockholm"], ["Zürih", 47.38, 8.54, "Europe/Zurich"],
    ["New York", 40.71, -74.01, "America/New_York"], ["Los Angeles", 34.05, -118.24, "America/Los_Angeles"],
  ].map(([ad, enlem, boylam, saatDilimi]) => ({ ad, enlem, boylam, saatDilimi: saatDilimi || "Europe/Istanbul" }));

  return { burclar, elementler, nitelikler, gezegenler, ayBurcunda, yukselenBurcunda, gunlukAcilar, elementDuygu, sehirler };
});
