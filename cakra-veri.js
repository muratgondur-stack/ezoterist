// Çakra verisi (tarayıcı + sunucu): yedi ana çakra, denge testi soruları ve puanlama.
// Metinler ruhsal/duygusal çerçevede tutulur; tıbbi iddia içermez.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CakraVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const cakralar = [
    {
      id: "kok", ad: "Kök Çakra", sanskrit: "Muladhara", konum: "Omurganın tabanı", renk: "#e5383b", element: "Toprak", mantra: "LAM",
      tema: "Güven, köklenme, aidiyet ve hayatta kalma duygusu.",
      dengede: "Kendini güvende, ayakları yere basan, sakin ve hayata güvenen biri gibi hissedersin.",
      dengesiz: "Huzursuzluk, sürekli endişe, güvensizlik ya da yerinde duramama hâli.",
      uygulama: "Çıplak ayakla toprağa ya da çimene bas, yavaş yürüyüş yap, köklü sebzeler ve sıcak yemekler ye.",
      olumlama: "Güvendeyim. Toprak beni taşıyor; hayat bana destek oluyor.",
      kristaller: ["siyah-turmalin", "hematit", "kirmizi-jasper", "garnet", "obsidyen"],
      meditasyon: "Dikkatini omurganın tabanına getir. Orada kırmızı, sıcak bir ışık hayal et. Her nefes verişinde köklerinin toprağın derinliklerine uzandığını hisset. Güvendesin; toprak seni taşıyor.",
    },
    {
      id: "sakral", ad: "Sakral Çakra", sanskrit: "Svadhisthana", konum: "Göbeğin biraz altı", renk: "#f77f00", element: "Su", mantra: "VAM",
      tema: "Duygular, yaratıcılık, keyif ve akış.",
      dengede: "Duygularını rahatça yaşar, yaratıcı ve hayattan keyif alan biri olursun.",
      dengesiz: "Duygusal donukluk, yaratıcılığın tıkanması ya da keyif alamama hâli.",
      uygulama: "Dans et, su kenarında vakit geçir, resim ya da müzik gibi yaratıcı bir işle oyna.",
      olumlama: "Duygularıma izin veriyorum; yaratıcılığım özgürce akıyor.",
      kristaller: ["karneol", "ay-tasi"],
      meditasyon: "Şimdi dikkatini göbeğinin biraz altına indir. Orada turuncu, akışkan bir ışık parlıyor. Bir nehrin yumuşak akışı gibi duygularının serbestçe dolaştığını hisset.",
    },
    {
      id: "solar", ad: "Solar Pleksus Çakrası", sanskrit: "Manipura", konum: "Mide bölgesi, göğüs kafesinin altı", renk: "#fcbf49", element: "Ateş", mantra: "RAM",
      tema: "Özgüven, irade, kişisel güç ve karar verme.",
      dengede: "Kendine güvenir, net kararlar verir ve sınırlarını sağlıklı biçimde korursun.",
      dengesiz: "Kararsızlık, özgüven eksikliği ya da her şeyi kontrol etme ihtiyacı.",
      uygulama: "Güneşte vakit geçir, küçük bir hedef koyup tamamla, derin karın nefesi çalış.",
      olumlama: "Gücümü sahipleniyorum; kararlarıma güveniyorum.",
      kristaller: ["sitrin", "kaplan-gozu", "pirit"],
      meditasyon: "Dikkatini mide bölgene getir. Orada sarı, parlak bir güneş doğuyor. Her nefeste bu güneşin büyüdüğünü, sana sıcaklık ve güç verdiğini hisset.",
    },
    {
      id: "kalp", ad: "Kalp Çakrası", sanskrit: "Anahata", konum: "Göğsün ortası", renk: "#52b788", element: "Hava", mantra: "YAM",
      tema: "Sevgi, şefkat, affetme ve bağ kurma.",
      dengede: "Sevgiyi verir ve alırsın; şefkatli, affedici ve bağlarında açık olursun.",
      dengesiz: "Kırgınlıkları bırakamamak, kendini kapatmak ya da sevgiyi kabul edememek.",
      uygulama: "Birine içten bir iyilik yap, şükran listesi yaz, doğada yeşilin içinde yürü.",
      olumlama: "Kalbim açık; sevgiyi özgürce veriyor ve alıyorum.",
      kristaller: ["gul-kuvars", "yesim", "malakit", "aventurin", "amazonit"],
      meditasyon: "Şimdi göğsünün ortasına odaklan. Orada yeşil, yumuşak bir ışık açılıyor. Her nefes alışında sevginin içine dolduğunu, her verişinde dünyaya yayıldığını hisset.",
    },
    {
      id: "bogaz", ad: "Boğaz Çakrası", sanskrit: "Vishuddha", konum: "Boğaz", renk: "#4cc9f0", element: "Ses (eter)", mantra: "HAM",
      tema: "İfade, iletişim, hakikati söylemek ve dinlemek.",
      dengede: "Düşüncelerini açık ve nazikçe ifade eder, başkalarını da gerçekten dinlersin.",
      dengesiz: "Söylemek istediklerini yutmak ya da dinlemeden konuşmak.",
      uygulama: "Şarkı söyle, mırıldan, günlük yaz; söylemek istediğini nazikçe ifade et.",
      olumlama: "Hakikatimi sevgiyle dile getiriyorum; sesim değerli.",
      kristaller: ["akuamarin", "turkuaz", "lapis", "sodalit", "amazonit"],
      meditasyon: "Dikkatini boğazına taşı. Orada açık mavi, berrak bir ışık parlıyor. Sesinin özgür olduğunu, söylediğin her sözün sevgi taşıdığını hisset.",
    },
    {
      id: "ucuncu-goz", ad: "Üçüncü Göz Çakrası", sanskrit: "Ajna", konum: "Kaşların arası", renk: "#5a4fcf", element: "Işık", mantra: "OM",
      tema: "Sezgi, iç görü, hayal gücü ve berrak düşünme.",
      dengede: "Sezgilerine güvenir, büyük resmi görür ve iç sesini duyarsın.",
      dengesiz: "Zihin bulanıklığı, sezgiye güvenememek ya da hayallerde kaybolmak.",
      uygulama: "Sessizce meditasyon yap, rüyalarını not et, bir mum alevine birkaç dakika bak.",
      olumlama: "İç sesime güveniyorum; sezgim bana yol gösteriyor.",
      kristaller: ["ametist", "lapis", "sodalit", "labradorit", "florit"],
      meditasyon: "Şimdi kaşlarının arasına odaklan. Orada çivit mavisi, derin bir ışık açılıyor. Zihninin sakinleştiğini, iç görünün berraklaştığını hisset.",
    },
    {
      id: "tac", ad: "Taç Çakra", sanskrit: "Sahasrara", konum: "Başın tepesi", renk: "#b388eb", element: "Düşünce / bilinç", mantra: "OM (sessizlik)",
      tema: "Ruhsal bağ, bütünlük, anlam ve teslimiyet.",
      dengede: "Kendini bütünün bir parçası gibi hisseder, hayatta bir anlam ve huzur bulursun.",
      dengesiz: "Anlamsızlık hissi, kopukluk ya da her şeyi zihinle çözmeye çalışmak.",
      uygulama: "Sessiz kalmaya zaman ayır, dua ya da meditasyon et, gökyüzünü seyret.",
      olumlama: "Evrenle bağım güçlü; bütünün bir parçasıyım.",
      kristaller: ["ametist", "kuvars", "selenit"],
      meditasyon: "Son olarak başının tepesine odaklan. Oradan mor ve beyaz bir ışık açılıyor, yukarıya, sonsuzluğa uzanıyor. Kendini bütünle bir hisset. Yavaşça nefes al ve gözlerini açmaya hazırlan.",
    },
  ];

  // Denge testi: her çakra için 3 ifade; 1 (hiç katılmıyorum) – 5 (tamamen katılıyorum).
  const sorular = [
    ["kok", "Kendimi genel olarak güvende hissederim."],
    ["kok", "Bedenimle ve fiziksel dünyayla bağım güçlüdür."],
    ["kok", "Maddi konularda içim rahattır, sürekli endişelenmem."],
    ["sakral", "Duygularımı rahatça yaşar ve ifade ederim."],
    ["sakral", "Hayatın küçük keyiflerinden zevk alırım."],
    ["sakral", "Yaratıcı fikirlerim kolayca akar."],
    ["solar", "Kararlarımı kolay ve net veririm."],
    ["solar", "Kendime ve yeteneklerime güvenirim."],
    ["solar", "Gerektiğinde 'hayır' diyebilirim."],
    ["kalp", "Sevgiyi kolayca verir ve kabul ederim."],
    ["kalp", "Bana kırgınlık yaşatanları affedebilirim."],
    ["kalp", "Kendime karşı şefkatliyim."],
    ["bogaz", "Düşündüklerimi açıkça ifade ederim."],
    ["bogaz", "Karşımdakini gerçekten dinlerim."],
    ["bogaz", "Doğruyu söylemekten çekinmem."],
    ["ucuncu-goz", "Sezgilerime güvenirim."],
    ["ucuncu-goz", "Olaylarda büyük resmi görebilirim."],
    ["ucuncu-goz", "Zihnim çoğu zaman berrak ve odaklıdır."],
    ["tac", "Hayatımın bir anlamı ve amacı olduğunu hissederim."],
    ["tac", "Kendimi evrenle ya da daha büyük bir bütünle bağlı hissederim."],
    ["tac", "İçimde sık sık derin bir huzur duyarım."],
  ];

  // Cevaplar (21 değer, 1-5) → her çakra için 0-100 puan.
  function puanla(cevaplar) {
    const toplam = {};
    sorular.forEach(([id], i) => { toplam[id] = (toplam[id] || 0) + (Number(cevaplar[i]) || 0); });
    return Object.fromEntries(cakralar.map((c) => [c.id, Math.round(((toplam[c.id] - 3) / 12) * 100)]));
  }

  const durumu = (p) => (p >= 75 ? "Açık ve dengeli" : p >= 50 ? "Dengede" : p >= 30 ? "Desteğe ihtiyaç duyuyor" : "Tıkanık");

  return { cakralar, sorular, puanla, durumu, cakraBul: (id) => cakralar.find((c) => c.id === id) };
});
