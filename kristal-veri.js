// Kristal rehberi (tarayıcı + sunucu): 24 kristal, çakra ve burç eşleşmeleri, niyet etiketleri.
// Geleneksel kristal bilgisine dayanan ruhsal anlamlar; tıbbi iddia içermez.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KristalVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const niyetler = {
    huzur: "Huzur ve sakinlik", ask: "Aşk ve şefkat", bolluk: "Bolluk ve bereket", koruma: "Koruma", odak: "Odak ve zihin",
    sezgi: "Sezgi ve ruhsallık", ozguven: "Özgüven ve cesaret", iletisim: "İletişim", denge: "Denge ve köklenme", yaraticilik: "Yaratıcılık",
  };

  const K = (id, ad, renk, cakralar, burclar, niyet, anahtar, anlam, kullanim) => ({ id, ad, renk, cakralar, burclar, niyet, anahtar, anlam, kullanim });

  const kristaller = [
    K("ametist", "Ametist", "Mor", ["ucuncu-goz", "tac"], ["yay", "kova", "balik"], ["huzur", "sezgi"], ["sakinlik", "sezgi", "ruhsal koruma"],
      "Zihni sakinleştiren, sezgiyi açan ve ruhsal farkındalığı destekleyen taş olarak bilinir. Huzursuz zihinlere dinginlik getirir.",
      "Yatağının başucuna koy ya da meditasyonda alnına yakın tut."),
    K("gul-kuvars", "Gül Kuvars", "Pembe", ["kalp"], ["boga", "yengec", "terazi"], ["ask", "huzur"], ["koşulsuz sevgi", "şefkat", "öz sevgi"],
      "Koşulsuz sevginin taşı. Kalbi yumuşatır, öz sevgiyi ve ilişkilerde şefkati destekler.",
      "Kalp hizasında taşı ya da evin ilişkiler köşesine yerleştir."),
    K("kuvars", "Kaya Kristali (Şeffaf Kuvars)", "Şeffaf", ["tac"], ["koc", "aslan"], ["odak", "sezgi"], ["berraklık", "güçlendirme", "niyet"],
      "Usta şifacı olarak bilinir; niyeti netleştirir, diğer taşların etkisini güçlendirdiğine inanılır.",
      "Niyetini düşünerek avucunda tut, sonra çalışma masana koy."),
    K("sitrin", "Sitrin", "Altın sarısı", ["solar", "sakral"], ["ikizler", "aslan"], ["bolluk", "ozguven"], ["bolluk", "neşe", "motivasyon"],
      "Güneşin taşı: bolluk, iyimserlik ve kişisel gücü destekler. Neşe ve motivasyon getirir.",
      "Kasana, cüzdanına ya da çalışma alanının sol arka köşesine koy."),
    K("kaplan-gozu", "Kaplan Gözü", "Altın kahve", ["solar"], ["ikizler", "aslan"], ["ozguven", "koruma"], ["cesaret", "kararlılık", "netlik"],
      "Cesaret ve kararlılık taşı. Korkuları azaltır, net düşünmeyi ve sağlam adımları destekler.",
      "Önemli bir görüşmeye giderken cebinde taşı."),
    K("siyah-turmalin", "Siyah Turmalin", "Siyah", ["kok"], ["oglak"], ["koruma", "denge"], ["koruma", "arınma", "köklenme"],
      "En güçlü koruma taşlarından biri olarak bilinir; olumsuz enerjiden korur ve köklendirir.",
      "Evin girişine ya da elektronik cihazların yanına koy."),
    K("obsidyen", "Obsidyen", "Siyah, camsı", ["kok"], ["akrep", "oglak"], ["koruma", "denge"], ["gerçekle yüzleşme", "koruma", "arınma"],
      "Volkanik camdan doğan bu taş, gölgelerle yüzleşmeyi ve duygusal arınmayı destekler.",
      "Kısa süreli kullan; meditasyondan sonra kenara kaldır."),
    K("labradorit", "Labradorit", "Gri, mavi-yeşil ışıltılı", ["ucuncu-goz"], ["terazi", "akrep", "kova"], ["sezgi", "koruma"], ["dönüşüm", "sezgi", "büyü"],
      "Dönüşüm taşı. Sezgiyi uyandırır, değişim dönemlerinde koruma kalkanı olarak bilinir.",
      "Değişim dönemlerinde yanında taşı, meditasyonda ışıltısına bak."),
    K("ay-tasi", "Ay Taşı", "Süt beyazı, mavi ışıltılı", ["sakral", "tac"], ["yengec", "balik"], ["sezgi", "yaraticilik"], ["yeni başlangıç", "sezgi", "kadınsı enerji"],
      "Ay'ın taşı: duygusal dengeyi, sezgiyi ve yeni başlangıçları destekler.",
      "Yeni Ay'da niyetinle birlikte pencere önüne koy."),
    K("lapis", "Lapis Lazuli", "Lacivert, altın benekli", ["ucuncu-goz", "bogaz"], ["boga", "terazi", "yay"], ["iletisim", "sezgi"], ["bilgelik", "hakikat", "ifade"],
      "Kralların taşı: bilgeliği, hakikati söylemeyi ve iç görüyü destekler.",
      "Konuşma ya da sunumdan önce boğaz hizasında taşı."),
    K("akuamarin", "Akuamarin", "Deniz mavisi", ["bogaz"], ["ikizler", "kova", "balik"], ["iletisim", "huzur"], ["sakinlik", "cesur ifade", "akış"],
      "Denizin taşı: sakinleştirir ve duyguları nazik ama cesurca ifade etmeyi destekler.",
      "Kolye olarak boğaz hizasında taşı."),
    K("turkuaz", "Turkuaz", "Gök mavisi", ["bogaz"], ["yay"], ["koruma", "iletisim"], ["koruma", "şans", "dostluk"],
      "Anadolu'da da yüzyıllardır sevilen koruma ve şans taşı. Yolculukta ve iletişimde eşlik eder.",
      "Yolculuklarda üzerinde taşı."),
    K("yesim", "Yeşim (Jade)", "Yeşil", ["kalp"], ["boga", "basak"], ["bolluk", "huzur"], ["uyum", "şans", "dinginlik"],
      "Uzak Doğu'da kutsal sayılan taş: uyum, şans ve huzurlu bir kalp getirir.",
      "Elinde tutarak birkaç derin nefes al; masanın üzerinde bulundur."),
    K("malakit", "Malakit", "Desenli yeşil", ["kalp"], ["boga", "akrep"], ["koruma", "denge"], ["dönüşüm", "duygusal arınma", "cesaret"],
      "Dönüşüm ve duygusal arınma taşı. Eski kalıpları bırakmaya cesaret verir.",
      "Kuru bir yerde sakla; suyla temizleme (su ona zarar verir)."),
    K("aventurin", "Yeşil Aventurin", "Yeşil, ışıltılı", ["kalp"], ["basak"], ["bolluk", "ask"], ["fırsat", "şans", "iyimserlik"],
      "Fırsatlar taşı olarak bilinir: şans, iyimserlik ve yeni kapılar.",
      "İş görüşmesi ya da yeni bir başlangıçta cebinde taşı."),
    K("karneol", "Karneol", "Turuncu", ["sakral"], ["koc", "aslan"], ["yaraticilik", "ozguven"], ["yaratıcılık", "canlılık", "motivasyon"],
      "Canlılık ve yaratıcılık taşı. Motivasyonu ve harekete geçme cesaretini destekler.",
      "Yaratıcı işlerle uğraşırken masanda bulundur."),
    K("hematit", "Hematit", "Metalik gri", ["kok"], ["koc", "oglak"], ["denge", "odak"], ["köklenme", "odak", "dayanıklılık"],
      "Köklendirici taş: dağınık zihni toparlar, ayakların yere basmasına yardımcı olur.",
      "Yoğun günlerde avucunda tutup birkaç dakika derin nefes al."),
    K("selenit", "Selenit", "Saten beyaz", ["tac"], ["yengec"], ["huzur", "sezgi"], ["arınma", "ışık", "dinginlik"],
      "Işığın taşı: ortamı ve diğer taşları arındırdığına inanılır, derin bir dinginlik verir.",
      "Diğer kristallerini üzerine koyarak arındır; suyla temas ettirme."),
    K("florit", "Florit", "Mor-yeşil", ["ucuncu-goz", "kalp"], ["kova", "balik"], ["odak", "denge"], ["odak", "düzen", "zihinsel berraklık"],
      "Zihnin düzen taşı: odaklanmayı ve karmaşık düşünceleri toparlamayı destekler.",
      "Ders çalışırken ya da plan yaparken masanda bulundur."),
    K("sodalit", "Sodalit", "Mavi, beyaz damarlı", ["ucuncu-goz", "bogaz"], ["basak", "yay"], ["iletisim", "odak"], ["mantık", "sezgi", "ifade"],
      "Mantık ile sezgiyi buluşturan taş; düşünceleri netleştirir ve ifadeyi kolaylaştırır.",
      "Yazı yazarken ya da konuşma hazırlarken yanında tut."),
    K("pirit", "Pirit", "Altın metalik", ["solar"], ["aslan"], ["bolluk", "koruma"], ["bolluk", "irade", "koruma"],
      "'Aptal altını' diye de bilinir ama bolluk ve irade gücü taşı olarak çok sevilir.",
      "Çalışma masana ya da kasanın yanına koy."),
    K("kirmizi-jasper", "Kırmızı Jasper", "Kiremit kırmızısı", ["kok", "sakral"], ["koc"], ["denge", "ozguven"], ["dayanıklılık", "köklenme", "canlılık"],
      "Sabır ve dayanıklılık taşı: köklendirir, uzun soluklu işlerde enerji verir.",
      "Uzun ve yorucu günlerde cebinde taşı."),
    K("garnet", "Garnet (Lal)", "Bordo", ["kok", "kalp"], ["koc", "akrep", "oglak"], ["ask", "ozguven"], ["tutku", "bağlılık", "canlılık"],
      "Tutku ve bağlılık taşı. Kalbe sıcaklık, yaşama coşku katar.",
      "Takı olarak kullan ya da yatak odasında bulundur."),
    K("amazonit", "Amazonit", "Yeşil-mavi", ["kalp", "bogaz"], ["basak"], ["iletisim", "huzur"], ["umut", "denge", "cesur ifade"],
      "Umut taşı: kalp ile boğazı buluşturarak duyguları dengeli ve cesurca ifade etmeyi destekler.",
      "Zor bir konuşma öncesi elinde tut."),
  ];

  const temizleme = [
    "Dolunay gecesi pencere önüne koyarak Ay ışığında bekletebilirsin.",
    "Tütsü ya da adaçayı dumanından birkaç kez geçirebilirsin.",
    "Selenit ya da kuvars kümesinin üzerinde bir gece bırakabilirsin.",
    "Sertliği yüksek taşları kısa süre akan suda yıkayabilirsin (malakit, selenit ve pirit gibi taşları suya sokma).",
  ];

  return { kristaller, niyetler, temizleme, kristalBul: (id) => kristaller.find((k) => k.id === id) };
});
