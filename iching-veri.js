// I Ching verisi (tarayıcı + sunucu): 8 trigram, 64 heksagram (King Wen sırası) ve çizgilerden heksagram bulma.
// Çizgiler alttan üste yazılır; 1 = yang (düz), 0 = yin (kırık).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.IChingVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const trigramlar = {
    gok: { ad: "Gök", cince: "Qian", cizgi: [1, 1, 1], doga: "yaratıcı güç", aile: "baba", sembol: "☰" },
    gol: { ad: "Göl", cince: "Dui", cizgi: [1, 1, 0], doga: "neşe, açıklık", aile: "küçük kız", sembol: "☱" },
    ates: { ad: "Ateş", cince: "Li", cizgi: [1, 0, 1], doga: "aydınlık, berraklık", aile: "ortanca kız", sembol: "☲" },
    gokgurultusu: { ad: "Gök Gürültüsü", cince: "Zhen", cizgi: [1, 0, 0], doga: "uyanış, hareket", aile: "büyük oğul", sembol: "☳" },
    ruzgar: { ad: "Rüzgâr", cince: "Xun", cizgi: [0, 1, 1], doga: "nüfuz eden yumuşaklık", aile: "büyük kız", sembol: "☴" },
    su: { ad: "Su", cince: "Kan", cizgi: [0, 1, 0], doga: "derinlik, tehlike", aile: "ortanca oğul", sembol: "☵" },
    dag: { ad: "Dağ", cince: "Gen", cizgi: [0, 0, 1], doga: "durgunluk, dinginlik", aile: "küçük oğul", sembol: "☶" },
    toprak: { ad: "Toprak", cince: "Kun", cizgi: [0, 0, 0], doga: "kabul edicilik, besleme", aile: "anne", sembol: "☷" },
  };

  // Satır: alttaki trigram, sütun: üstteki trigram → King Wen numarası.
  const SIRA = ["gok", "gokgurultusu", "su", "dag", "toprak", "ruzgar", "ates", "gol"];
  const TABLO = [
    [1, 34, 5, 26, 11, 9, 14, 43],
    [25, 51, 3, 27, 24, 42, 21, 17],
    [6, 40, 29, 4, 7, 59, 64, 47],
    [33, 62, 39, 52, 15, 53, 56, 31],
    [12, 16, 8, 23, 2, 20, 35, 45],
    [44, 32, 48, 18, 46, 57, 50, 28],
    [13, 55, 63, 22, 36, 37, 30, 49],
    [10, 54, 60, 41, 19, 61, 38, 58],
  ];

  const H = (ad, cince, anahtar, karar, tavsiye) => ({ ad, cince, anahtar, karar, tavsiye });
  const heksagramlar = {
    1: H("Yaratıcı", "Qian", ["güç", "girişim", "liderlik"], "Gökyüzünün durmayan hareketi gibi yaratıcı bir güç seninle. Doğru niyetle başlattığın şey büyüme potansiyeli taşıyor.", "Kararlılıkla ve dürüstlükle ilerle; gücünü bencilce değil, herkesin iyiliği için kullan."),
    2: H("Alıcı", "Kun", ["kabul", "sabır", "besleme"], "Toprak her şeyi taşır ve besler. Şimdi öne atılmak yerine izlemek, desteklemek ve uyum sağlamak bereket getirir.", "Liderliği başkasına bırakmaktan çekinme; sadakatin ve sabrın seni doğru yere taşır."),
    3: H("Başlangıçtaki Zorluk", "Zhun", ["filizlenme", "karmaşa", "sabır"], "Her yeni başlangıç bir kaos içinden doğar; tohum toprağı yararken zorlanır. Bu karışıklık büyümenin işaretidir.", "Aceleyle her şeyi çözmeye çalışma; yardım iste, düzeni adım adım kur."),
    4: H("Gençlik Toyluğu", "Meng", ["öğrenme", "deneyimsizlik", "rehber"], "Henüz bilmediğin şeyler var ve bu bir kusur değil, öğrenme fırsatı. Doğru öğretmen, içtenlikle soran öğrenciye kendini gösterir.", "Aynı soruyu tekrar tekrar sorma; aldığın cevabı uygula ve deneyimle öğren."),
    5: H("Bekleyiş", "Xu", ["sabır", "zamanlama", "güven"], "Bulutlar gökte toplanıyor ama yağmur henüz yağmadı. Beklemek pasiflik değil, güçlü bir hazırlıktır.", "Sakin kal, kendini besle ve doğru zamanın gelmesine güven; aceleci adımlar seni yorar."),
    6: H("Çatışma", "Song", ["anlaşmazlık", "uzlaşma", "sınır"], "Karşıt yönlere çeken güçler bir gerilim yaratıyor. Haklı olsan bile çatışmayı sonuna kadar götürmek kazandırmaz.", "Orta yolu ara, tarafsız birinin görüşüne başvur; büyük bir işe girişmeden önce anlaşmazlığı çöz."),
    7: H("Ordu", "Shi", ["disiplin", "organizasyon", "liderlik"], "Ortak bir amaç için güçleri bir araya getirme zamanı. Başarı, düzen ve güvenilir bir liderlikle gelir.", "Gücünü düzenli ve adil kullan; ekibine güven ver, hedefi net tut."),
    8: H("Birlik", "Bi", ["bağlılık", "topluluk", "destek"], "Su toprağın üzerinde birleşir; insanlar da ortak bir merkez etrafında toplanır. Doğru bağlar seni güçlendirir.", "Kime bağlanacağını özenle seç ve çok bekleme; içten bir bağlılık güven yaratır."),
    9: H("Küçüğün Evcilleştirme Gücü", "Xiao Chu", ["küçük adımlar", "nezaket", "hazırlık"], "Büyük bir hareket için henüz zaman gelmedi; rüzgâr bulutları topluyor ama yağmur yok. Küçük ve nazik etkiler şimdi daha güçlü.", "Büyük atılımlar yerine küçük düzenlemeler yap; yumuşaklıkla ilerlemek kapıları açar."),
    10: H("Adım Atmak", "Lu", ["incelik", "saygı", "dikkat"], "Kaplanın kuyruğuna basıyorsun ama kaplan ısırmıyor: zor bir durumda nezaket ve doğru davranış seni korur.", "Kendi yerini bil, saygılı ve dikkatli davran; incelik en tehlikeli yolu bile güvenli kılar."),
    11: H("Barış", "Tai", ["uyum", "bereket", "denge"], "Gök ve yer buluştu; küçük gidiyor, büyük geliyor. Uyum, bereket ve iş birliği dönemindesin.", "Bu güzel dönemi iyi değerlendir; ama bolluğun da bir döngü olduğunu unutmadan temellerini sağlamlaştır."),
    12: H("Durgunluk", "Pi", ["tıkanıklık", "içe dönüş", "dayanıklılık"], "Gök ve yer birbirinden uzaklaşmış; iletişim tıkanıyor, işler akmıyor. Bu geçici bir duraklama.", "Değerlerinden ödün verme, kendini geri çek ve iç dünyanı güçlendir; tıkanıklık da geçer."),
    13: H("İnsanlarla Dostluk", "Tong Ren", ["topluluk", "ortak amaç", "açıklık"], "Ortak bir ideal etrafında insanlarla birleşmenin zamanı. Açık ve kapsayıcı olduğunda büyük işler başarılır.", "Kendi çevrenle sınırlı kalma; farklı insanlarla ortak noktalar bul."),
    14: H("Büyük Varlık", "Da You", ["bolluk", "başarı", "cömertlik"], "Güneş göğün en yükseğinde parlıyor; elindeki kaynaklar ve imkânlar bol. Bu bir ödül dönemi.", "Bolluğunu alçakgönüllülükle taşı ve paylaş; iyi olanı destekle, kötü olanı durdur."),
    15: H("Alçakgönüllülük", "Qian", ["tevazu", "denge", "olgunluk"], "Dağ toprağın altında saklı: büyük olan kendini küçük gösterir. Tevazu her işi başarıya ulaştırır.", "Fazla olanı azalt, eksik olanı tamamla; övünmeden yaptığın iş en kalıcı olandır."),
    16: H("Coşku", "Yu", ["heyecan", "ilham", "hazırlık"], "Gök gürültüsü yerden yükseliyor; içinde ve çevrende bir coşku uyanıyor. Bu enerji insanları harekete geçirir.", "Coşkunu paylaş ama hazırlığı ihmal etme; müzik ve neşe insanları bir araya getirir."),
    17: H("İzlemek", "Sui", ["uyum sağlama", "akış", "esneklik"], "Zamanın akışını izlemek, doğru kişiyi takip etmek başarı getirir. İnatlaşmak yerine uyum sağla.", "Önce sen uyum göster, insanlar da seni izlesin; dinlenmeyi de unutma."),
    18: H("Bozulanı Onarmak", "Gu", ["onarım", "geçmiş", "temizlik"], "İhmal edilmiş bir şey bozulmuş; bu bozulma düzeltilmeyi bekliyor. Geçmişten gelen bir yükü temizleme zamanı.", "Sorunun kökünü anla, sonra kararlılıkla düzelt; başlamadan önce ve sonra iyi düşün."),
    19: H("Yaklaşma", "Lin", ["büyüme", "fırsat", "ilgi"], "Güçlü ve iyi bir dönem yaklaşıyor; bahar gelmek üzere. Fırsatlar sana doğru geliyor.", "Bu yükselişi iyi değerlendir ama her mevsimin döneceğini bil; şefkatle yaklaş."),
    20: H("Seyir", "Guan", ["gözlem", "tefekkür", "örnek olmak"], "Rüzgâr toprağın üzerinde esiyor, her şeye dokunuyor. Geri çekilip büyük resme bakma zamanı.", "Önce gözle ve anla; davranışların başkalarına örnek oluyor, bunun farkında ol."),
    21: H("Isırıp Geçmek", "Shi He", ["engel", "kararlılık", "adalet"], "Ağzın içindeki bir engel birleşmeyi önlüyor; onu ısırıp geçmek gerekiyor. Engeli açıkça ele al.", "Net ve adil ol; sorunu görmezden gelmek yerine kararlılıkla çöz."),
    22: H("Zarafet", "Bi", ["güzellik", "biçim", "estetik"], "Dağın eteğinde ateş: biçim ve güzellik öne çıkıyor. Görünüş önemli ama özün yerini tutmaz.", "Küçük işlerde zarafet ve özen göster; büyük kararları yalnızca dış görünüşe göre verme."),
    23: H("Dağılma", "Bo", ["çözülme", "bırakma", "bekleme"], "Eski yapı içten içe çözülüyor; bu durdurulamayan doğal bir süreç. Şimdi direnme zamanı değil.", "Sakin kal, temelini koru ve harekete geçmek için uygun zamanı bekle; dağılan her şey yeniden toparlanır."),
    24: H("Dönüş", "Fu", ["yenilenme", "dönüm noktası", "umut"], "En karanlık noktadan sonra ışık geri dönüyor. Kış gündönümü gibi, yeni bir döngü sessizce başlıyor.", "Yeni başlangıcı zorlamadan, doğal ritmiyle büyümesine izin ver; doğru olana geri dön."),
    25: H("Masumiyet", "Wu Wang", ["içtenlik", "doğallık", "beklenmedik"], "Hesapsız ve içten davrandığında evrenle uyum içindesin. Beklenmedik olaylar olabilir; saf niyet seni korur.", "Gizli amaçlarla değil, kalbinden gelenle hareket et; sonucu zorlamaya çalışma."),
    26: H("Büyüğün Evcilleştirme Gücü", "Da Chu", ["birikim", "güç toplama", "bilgelik"], "Dağın içinde gök saklı: büyük bir güç birikiyor. Bu enerjiyi dizginlemek ve doğru zamanda kullanmak gerekiyor.", "Bilgini ve gücünü biriktir, geçmişin bilgeliğinden öğren; zamanı gelince büyük adımı at."),
    27: H("Beslenme", "Yi", ["besin", "özen", "söz"], "Ağzın şekli: neyi yediğin ve ne söylediğin seni şekillendirir. Bedenini ve ruhunu neyle beslediğine dikkat et.", "Sözlerine ve beslenmene özen göster; başkalarını beslerken kendini de unutma."),
    28: H("Büyüğün Ağır Basması", "Da Guo", ["aşırı yük", "kriz", "cesaret"], "Kiriş ortadan bükülüyor; yük taşınabilecek olanın ötesine geçmiş. Olağanüstü bir durum olağanüstü bir adım istiyor.", "Paniğe kapılmadan ama cesaretle hareket et; gerekirse tek başına durmaktan korkma."),
    29: H("Uçurum", "Kan", ["tehlike", "derinlik", "içtenlik"], "Su üst üste akıyor: tehlike tekrar ediyor. Ama su, akmaya devam ederek her uçurumu doldurur.", "Kalbini sağlam tut, içtenliğinden vazgeçme; zorluğun içinden akarak geçeceksin."),
    30: H("Işık", "Li", ["berraklık", "aydınlanma", "bağ"], "Ateş bir şeye tutunarak parlar. Berraklık ve aydınlık, doğru olana bağlanmaktan gelir.", "Neye tutunduğuna dikkat et; şefkatli ve sabırlı olduğunda ışığın etrafını aydınlatır."),
    31: H("Etkileşim", "Xian", ["çekim", "aşk", "duyarlılık"], "Dağın üzerinde göl: karşılıklı bir çekim ve yakınlaşma var. Kalpten kalbe dokunan bir etki.", "Açık ve alıcı ol; içtenlikle yaklaştığında doğru kişi de sana yaklaşır."),
    32: H("Süreklilik", "Heng", ["kalıcılık", "sadakat", "istikrar"], "Gök gürültüsü ve rüzgâr birlikte: değişim içinde kalıcı olan. Uzun soluklu bağlar ve alışkanlıklar güç verir.", "Yönünü değiştirme ama yöntemini yenilemekten çekinme; sabır ve süreklilik başarı getirir."),
    33: H("Geri Çekilme", "Dun", ["çekilme", "koruma", "zamanlama"], "Karşı güçler yükselirken akıllıca geri çekilmek bir yenilgi değil, stratejidir.", "Onurunla çekil, gücünü koru; doğru an geldiğinde yeniden ileri gidebilirsin."),
    34: H("Büyüğün Gücü", "Da Zhuang", ["güç", "doğruluk", "ölçü"], "Gök gürültüsü göğün üstünde: büyük bir güç yükseliyor. Bu gücü doğrulukla kullanmak gerekiyor.", "Gücüne güvenirken ölçüyü kaçırma; doğru olmayan bir yola adım atma."),
    35: H("İlerleme", "Jin", ["yükseliş", "tanınma", "aydınlık"], "Güneş toprağın üzerinden doğuyor; hızlı ve parlak bir ilerleme dönemi. Emeklerin görünür oluyor.", "Işığını parlat ama başkalarının ışığını söndürme; iyi niyetle yükselen kalıcı yükselir."),
    36: H("Işığın Kararması", "Ming Yi", ["zor dönem", "içsel ışık", "sabır"], "Güneş toprağın altına girmiş; ışığını gizlemek gereken bir dönem. Dışarısı karanlık ama içindeki ışık sönmüyor.", "Zor koşullarda iç ışığını koru, gereksiz yere dikkat çekme; sabırla bu dönemi atlatacaksın."),
    37: H("Aile", "Jia Ren", ["yuva", "roller", "sevgi"], "Rüzgâr ateşten çıkar: dışarıdaki etki evin içinden doğar. Ailede ve yakın ilişkilerde düzen ve sevgi önemli.", "Sözlerinde içten, davranışlarında tutarlı ol; yuvadaki düzen tüm hayatını besler."),
    38: H("Karşıtlık", "Kui", ["farklılık", "küçük adımlar", "kabul"], "Ateş yukarı, göl aşağı çekiyor: zıt yönler. Büyük işler zor ama küçük işlerde başarı mümkün.", "Farklılıkları kabul et; ortak bir zemin bulmak için küçük adımlarla ilerle."),
    39: H("Engel", "Jian", ["engel", "yardım", "içe bakış"], "Önünde dağ, ardında su: yol kapalı görünüyor. Engel, dönüp kendine bakma çağrısı.", "Engelle kafa kafaya çarpışma; geri çekil, yardım iste ve kendini geliştir."),
    40: H("Kurtuluş", "Xie", ["rahatlama", "çözülme", "affetme"], "Fırtına geçti, gerginlik çözülüyor. Uzun süredir taşıdığın bir yükten kurtuluyorsun.", "Rahatlamanın tadını çıkar ama geçmişi kurcalama; affet ve hızlıca düzene dön."),
    41: H("Azalma", "Sun", ["sadeleşme", "fedakârlık", "içtenlik"], "Aşağıdan alınıp yukarıya verilen: bir şeyin azalması başka bir şeyi besliyor. Sadeleşme zamanı.", "Fazlalıkları bırak, öfkeni ve arzularını dizginle; az ama içten olan yeterlidir."),
    42: H("Artış", "Yi", ["büyüme", "fırsat", "yardımlaşma"], "Rüzgâr ve gök gürültüsü birbirini büyütüyor; bereketli bir artış dönemi. Büyük işlere girişmek için uygun zaman.", "Fırsatı değerlendir ve iyiliği çoğalt; başkasındaki iyiyi gördüğünde onu örnek al."),
    43: H("Kararlılık", "Guai", ["kesinlik", "açıklık", "çözüm"], "Göl göğe yükselmiş, taşmak üzere: bir karar anı. Uzun süredir ertelenen bir şeyi açıkça ele alma zamanı.", "Kararlı ama öfkesiz ol; doğruyu açıkça söyle, ama zorla değil adaletle ilerle."),
    44: H("Karşılaşma", "Gou", ["beklenmedik", "çekim", "dikkat"], "Göğün altında esen rüzgâr: beklenmedik bir karşılaşma ya da etki hayatına giriyor.", "Gelen kişiyi ya da fırsatı iyi tart; görünüşteki masumiyete hemen kapılma."),
    45: H("Toplanma", "Cui", ["bir araya gelme", "topluluk", "hazırlık"], "Göl toprağın üzerinde toplanıyor: insanlar ve kaynaklar bir araya geliyor. Ortak bir amaç güç veriyor.", "Birliği destekle ama beklenmedik durumlara hazırlıklı ol; ortak değerler etrafında toplan."),
    46: H("Yükseliş", "Sheng", ["gelişim", "emek", "adım adım"], "Topraktan filizlenen ağaç gibi yavaş ama kararlı bir yükseliş. Çabaların seni yukarı taşıyor.", "Sabırla ve küçük adımlarla büyü; danışacağın birini bul ve yoluna devam et."),
    47: H("Tükeniş", "Kun", ["sıkıntı", "dayanıklılık", "iç güç"], "Göl kurumuş: kaynaklar tükenmiş, sözler etkisiz kalıyor. Bu dönem karakterini sınıyor.", "Az konuş, iç gücüne güven; zor zamanlarda neşeni koruyan, sonunda kazanır."),
    48: H("Kuyu", "Jing", ["kaynak", "derinlik", "paylaşım"], "Kuyu yerini değiştirmez ama herkesi besler. Derindeki kaynağına, özüne ulaşma zamanı.", "İp yeterince uzun mu, kova sağlam mı? Kendini geliştir ki kaynağını başkalarıyla paylaşabilesin."),
    49: H("Devrim", "Ge", ["dönüşüm", "yenilik", "doğru zaman"], "Ateş ile göl karşılaşınca biri diğerini değiştirir: köklü bir dönüşüm zamanı. Eski deri dökülüyor.", "Değişimi zamanı gelince ve gerekçeleriyle yap; inandırıcı olduğunda insanlar seni izler."),
    50: H("Kazan", "Ding", ["dönüşüm", "beslenme", "kültür"], "Ateşin üzerindeki kazan: ham olanı pişirip besleyici kılan dönüşüm. Yeteneklerin olgunlaşıyor.", "Kendine ve değerlerine saygı göster; ruhunu besleyen şeylere zaman ayır."),
    51: H("Gök Gürültüsü", "Zhen", ["şok", "uyanış", "cesaret"], "Ani bir sarsıntı korkutabilir ama ardından kahkaha gelir. Bu şok seni uyandırmak için geldi.", "Sakin kal ve merkezini koru; sarsıntıdan ders çıkararak daha güçlü olacaksın."),
    52: H("Dağ", "Gen", ["dinginlik", "durmak", "meditasyon"], "Dağın üstünde dağ: tam bir duruş ve sükûnet. Zihnin dinginleştiğinde doğru cevaplar kendiliğinden gelir.", "Durman gereken yerde dur; düşüncelerini sakinleştir, şimdiki ana odaklan."),
    53: H("Kademeli Gelişme", "Jian", ["sabır", "adım adım", "kalıcılık"], "Dağın üzerindeki ağaç yavaş büyür ama kökleri derindir. Adım adım ilerleyen gelişme kalıcı olur.", "Aceleye getirme; ilişkilerde ve işlerde doğru sırayla ilerle."),
    54: H("Gelin Giden Kız", "Gui Mei", ["ilişkiler", "konum", "uyum"], "İstediğin konumda olmayabilirsin; ilişkilerde beklentiler ve roller dengesiz. Durumu olduğu gibi gör.", "İnisiyatifi zorlamak yerine kabul et ve uyum sağla; uzun vadeli olanı düşün."),
    55: H("Bolluk", "Feng", ["doruk", "parlaklık", "an"], "Güneş tepede: bolluk ve parlaklığın doruğundasın. Bu dolu anın tadını çıkar.", "Endişelenme, öğle güneşi gibi parla; ama her doruğun bir dönüşü olduğunu bilerek bilgece davran."),
    56: H("Yolcu", "Lu", ["yolculuk", "geçicilik", "uyum"], "Dağın üzerindeki ateş gibi hareket hâlindesin; yabancı bir yerdeki yolcu. Geçici durumlar dikkat ister.", "Alçakgönüllü ve dikkatli ol; yolculukta küçük iyilikler ve doğru davranış seni korur."),
    57: H("Rüzgâr", "Xun", ["nazik etki", "süreklilik", "nüfuz"], "Rüzgâr nazikçe ama durmadan eser ve her yere ulaşır. Küçük ama sürekli etkiler büyük değişim yaratır.", "Yönünü netleştir ve yumuşaklıkla ısrar et; iyi bir rehberin sözüne kulak ver."),
    58: H("Göl", "Dui", ["neşe", "paylaşım", "sohbet"], "İki göl birbirini besliyor: neşe, sohbet ve paylaşım. İçten gelen sevinç bulaşıcıdır.", "Dostlarınla öğren ve paylaş; neşen yüzeysel değil, içten olsun."),
    59: H("Çözülme", "Huan", ["dağılma", "birleştirme", "ruhsallık"], "Rüzgâr suyun üzerinde esip donmuş olanı çözüyor. Katılıklar ve ayrılıklar eriyor.", "Bencillikten ve katılıktan uzaklaş; ortak bir anlam ve ruhsal bağ insanları yeniden birleştirir."),
    60: H("Sınırlama", "Jie", ["ölçü", "sınır", "disiplin"], "Gölün suyu kıyılarıyla sınırlıdır; sınır olmadan taşar. Sağlıklı sınırlar özgürlük getirir.", "Kendine ölçülü sınırlar koy ama bunları acı veren katılığa dönüştürme."),
    61: H("İçsel Hakikat", "Zhong Fu", ["içtenlik", "güven", "anlayış"], "Gölün üzerinde esen rüzgâr: kalbin ortası boş ve açık. İçten gelen hakikat en zor kalpleri bile etkiler.", "Önyargısız dinle, içtenlikle konuş; karşındakini anlamaya çalış."),
    62: H("Küçüğün Ağır Basması", "Xiao Guo", ["ayrıntı", "tevazu", "dikkat"], "Kuş çok yükseğe uçmamalı. Şimdi büyük işler için değil, küçük ve özenli işler için zaman.", "Ayrıntılara dikkat et, alçakgönüllü kal; bugün küçük olanı iyi yapmak yeterli."),
    63: H("Tamamlanmış", "Ji Ji", ["tamamlanma", "denge", "dikkat"], "Su ateşin üzerinde: her şey yerli yerinde, bir iş tamamlanmış. Ama kusursuz denge kırılgandır.", "Başarıyı korumak için dikkatli ol; rehavete kapılma, küçük sorunları büyümeden çöz."),
    64: H("Tamamlanmamış", "Wei Ji", ["eşik", "umut", "son adım"], "Ateş suyun üzerinde: hedef görünüyor ama son adım henüz atılmadı. Kaostan düzene geçişin eşiğindesin.", "Acele etme, her şeyi yerli yerine koy; dikkatli son adımlar başarıyı getirecek."),
  };

  const trigramBul = (uc) => Object.keys(trigramlar).find((k) => trigramlar[k].cizgi.join("") === uc.join(""));

  // cizgiler: alttan üste 6 değer (1 yang, 0 yin) → { no, alt, ust, ...heksagram }
  function heksagram(cizgiler) {
    const alt = trigramBul(cizgiler.slice(0, 3));
    const ust = trigramBul(cizgiler.slice(3, 6));
    const no = TABLO[SIRA.indexOf(alt)][SIRA.indexOf(ust)];
    return { no, alt, ust, cizgiler: [...cizgiler], ...heksagramlar[no] };
  }

  // Atış değerleri: 6 (değişen yin), 7 (yang), 8 (yin), 9 (değişen yang).
  function atistan(atislar) {
    const ana = atislar.map((v) => (v === 7 || v === 9 ? 1 : 0));
    const degisen = atislar.map((v, i) => (v === 6 || v === 9 ? i + 1 : 0)).filter(Boolean);
    const sonra = degisen.length ? atislar.map((v) => (v === 7 || v === 6 ? 1 : 0)) : null;
    return { ana: heksagram(ana), degisen, sonra: sonra ? heksagram(sonra) : null };
  }

  // Bir heksagramın çizgileri (tablo ve sözlük için).
  function cizgileri(no) {
    for (let a = 0; a < 8; a += 1) {
      for (let u = 0; u < 8; u += 1) {
        if (TABLO[a][u] === no) return [...trigramlar[SIRA[a]].cizgi, ...trigramlar[SIRA[u]].cizgi];
      }
    }
    return null;
  }

  const CIZGI_YERI = ["Birinci (en alt) çizgi: başlangıç", "İkinci çizgi: iç dünya, hazırlık", "Üçüncü çizgi: eşik, geçiş", "Dördüncü çizgi: dış dünyaya ilk adım", "Beşinci çizgi: güç ve sorumluluk", "Altıncı (en üst) çizgi: doruk ve bitiş"];

  return { trigramlar, heksagramlar, heksagram, atistan, cizgileri, CIZGI_YERI };
});
