// Rün taşları verisi (tarayıcı + sunucu): Yaşlı Futhark'ın 24 rünü, üç aett, açılımlar ve rün çizimleri.
// Şekiller 40x60'lık bir kutuda çizgi dizileri (polyline) olarak tutulur; böylece font gerekmeden SVG ile çizilir.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RunVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  // ters: false → simetrik rün, ters (merkstave) gelemez.
  const R = (id, ad, ses, anlam, aett, anahtar, duz, tersAnlam, sekil, tersOlur = true) =>
    ({ id, ad, ses, anlam, aett, anahtar, duz, tersAnlam: tersOlur ? tersAnlam : "", sekil, tersOlur });

  const runler = [
    R("fehu", "Fehu", "F", "Sığır, servet", "freyr", ["bolluk", "kazanç", "enerji akışı"],
      "Kazanılmış zenginlik ve akan enerji. Emeğinin karşılığını alıyorsun; bolluğu paylaştıkça çoğalır.",
      "Kayıp ya da tıkanan bir akış. Kaynaklarını nereye harcadığına dikkat et; açgözlülükten uzak dur.",
      [[[12, 4], [12, 56]], [[12, 20], [30, 8]], [[12, 34], [30, 22]]]),
    R("uruz", "Uruz", "U", "Yaban öküzü, güç", "freyr", ["güç", "sağlık", "cesaret"],
      "Ham ve vahşi bir güç uyanıyor. Cesaretin ve dayanıklılığın seni engellerin üstünden taşır.",
      "Gücün dağınık ya da yanlış yöne akıyor. Bedenine ve sınırlarına iyi bak, zorlamadan topla.",
      [[[10, 56], [10, 4], [30, 20], [30, 56]]]),
    R("thurisaz", "Thurisaz", "TH", "Diken, dev", "freyr", ["koruma", "kararlılık", "sınır"],
      "Dikenli bir kapı: güçlü bir koruma ve kritik bir karar anı. Düşünerek ilerle, aceleyle değil.",
      "Savunmasız ya da fevri hissedebilirsin. Öfkeyle hareket etme, sınırlarını sakin bir dille çiz.",
      [[[14, 4], [14, 56]], [[14, 18], [30, 30], [14, 42]]]),
    R("ansuz", "Ansuz", "A", "Tanrı Odin, söz", "freyr", ["bilgelik", "iletişim", "ilham"],
      "Bir mesaj geliyor: bir söz, bir öğüt, bir ilham. Dinle; bilgelik bugün kelimelerde saklı.",
      "Yanlış anlaşılmalar ya da yanıltıcı sözler. Duyduğuna hemen inanma, sezgini de dinle.",
      [[[12, 4], [12, 56]], [[12, 4], [30, 16]], [[12, 18], [30, 30]]]),
    R("raidho", "Raidho", "R", "Yolculuk, araba", "freyr", ["yol", "ritim", "doğru yön"],
      "Doğru yolda, doğru ritimde bir yolculuk. Hem dış hem iç yolculuğun anlamlı bir yere gidiyor.",
      "Yolculukta aksaklık ya da yön kaybı. Planlarını gözden geçir, ritmini yeniden bul.",
      [[[12, 56], [12, 4], [30, 16], [12, 30], [30, 56]]]),
    R("kenaz", "Kenaz", "K", "Meşale", "freyr", ["aydınlanma", "yaratıcılık", "bilgi"],
      "Karanlığı aydınlatan meşale: yaratıcı bir fikir, bir anlayış, içinde yanan bir ateş.",
      "Işığın kısılmış; bir şeyi göremiyor ya da ilhamını kaybetmiş olabilirsin. Dinlen, yeniden tutuştur.",
      [[[28, 10], [12, 30], [28, 50]]]),
    R("gebo", "Gebo", "G", "Hediye", "freyr", ["armağan", "ortaklık", "denge"],
      "Karşılıklı bir armağan: verme ve alma dengesi. Bir ortaklık, bir bağ ya da bir lütuf yolda.",
      "", [[[8, 10], [32, 50]], [[32, 10], [8, 50]]], false),
    R("wunjo", "Wunjo", "W", "Sevinç", "freyr", ["mutluluk", "uyum", "başarı"],
      "Sevinç ve uyum. Emeklerinin tatlı meyvesi; içinde ve çevrende huzur var.",
      "Mutsuzluk ya da yabancılaşma hissi. Seni neyin gerçekten mutlu ettiğini yeniden hatırla.",
      [[[12, 56], [12, 4], [30, 16], [12, 28]]]),
    R("hagalaz", "Hagalaz", "H", "Dolu", "hagal", ["ani değişim", "arınma", "dönüşüm"],
      "Gökten dolu yağar ama toprağı da sular. Kontrol edemediğin bir sarsıntı, sonunda arındırıcı olacak.",
      "", [[[10, 4], [10, 56]], [[30, 4], [30, 56]], [[10, 22], [30, 38]]], false),
    R("nauthiz", "Nauthiz", "N", "İhtiyaç", "hagal", ["sabır", "eksiklik", "dayanıklılık"],
      "Bir ihtiyaç ya da kısıtlama seni sınıyor. Sabır ve azim, eksikliği güce dönüştürür.",
      "", [[[20, 4], [20, 56]], [[10, 22], [30, 38]]], false),
    R("isa", "Isa", "I", "Buz", "hagal", ["durgunluk", "bekleme", "içe dönüş"],
      "Her şey buz gibi durmuş. Zorlamak yerine bekle; donmuş olan zamanı gelince çözülecek.",
      "", [[[20, 4], [20, 56]]], false),
    R("jera", "Jera", "J", "Hasat, yıl", "hagal", ["hasat", "döngü", "emeğin karşılığı"],
      "Ekilen biçilir: doğal döngü işliyor. Sabırla verdiğin emeğin hasadı yaklaşıyor.",
      "", [[[18, 8], [8, 20], [18, 32]], [[22, 28], [32, 40], [22, 52]]], false),
    R("eihwaz", "Eihwaz", "EI", "Porsuk ağacı", "hagal", ["dayanıklılık", "dönüşüm", "koruma"],
      "Ölümsüz porsuk ağacı gibi kökleri derin, dalları göğe uzanan bir dayanıklılık. Zor bir geçişten güçlenerek çıkıyorsun.",
      "", [[[20, 4], [20, 56]], [[20, 4], [30, 14]], [[20, 56], [10, 46]]], false),
    R("perthro", "Perthro", "P", "Zar kabı, gizem", "hagal", ["gizem", "kader", "sürpriz"],
      "Kaderin zar kabı: gizli olan açığa çıkmak üzere. Bir sır, bir sürpriz ya da şansın oyunu.",
      "Beklenmedik bir hayal kırıklığı ya da açığa çıkmayan bir sır. Kontrol edemediğini bırak.",
      [[[10, 4], [10, 56]], [[10, 4], [24, 14], [30, 6]], [[10, 56], [24, 46], [30, 54]]]),
    R("algiz", "Algiz", "Z", "Geyik boynuzu, koruma", "hagal", ["koruma", "ruhsal bağ", "sezgi"],
      "Yüce bir koruma altındasın. Sezgin keskin, ruhsal rehberlerinle bağın güçlü.",
      "Korunmasız hissetmek ya da tehlikeyi görmezden gelmek. Sınırlarını ve sezgini ciddiye al.",
      [[[20, 4], [20, 56]], [[20, 24], [8, 8]], [[20, 24], [32, 8]]]),
    R("sowilo", "Sowilo", "S", "Güneş", "hagal", ["zafer", "canlılık", "başarı"],
      "Güneşin zafer ışığı. Enerjin yüksek, yolun aydınlık; başarı ve sağlık seninle.",
      "", [[[26, 4], [12, 22], [28, 38], [14, 56]]], false),
    R("tiwaz", "Tiwaz", "T", "Tanrı Tyr, adalet", "tyr", ["adalet", "cesaret", "fedakârlık"],
      "Savaşçının onuru: adalet, cesaret ve doğru olan için fedakârlık. Haklı bir mücadelede kazanırsın.",
      "Cesaret kaybı, adaletsizlik hissi ya da motivasyon düşüklüğü. Neyin doğru olduğunu yeniden sor.",
      [[[20, 4], [20, 56]], [[8, 18], [20, 4], [32, 18]]]),
    R("berkano", "Berkano", "B", "Huş ağacı, doğum", "tyr", ["yeni başlangıç", "büyüme", "şefkat"],
      "Huş ağacının taze filizleri: doğum, yenilenme ve şefkatli bir büyüme dönemi.",
      "Büyümede bir duraklama ya da ihmal edilen bir başlangıç. Kendine ve sevdiklerine özen göster.",
      [[[10, 4], [10, 56]], [[10, 4], [28, 17], [10, 30], [28, 43], [10, 56]]]),
    R("ehwaz", "Ehwaz", "E", "At", "tyr", ["ilerleme", "güven", "ortaklık"],
      "At ile binicisi gibi uyumlu bir ortaklık. Güvenle ilerliyorsun; değişim kolaylıkla geliyor.",
      "Huzursuzluk ya da uyumsuz bir ortaklık. Acele etme, güveni yeniden inşa et.",
      [[[10, 56], [10, 4], [20, 18], [30, 4], [30, 56]]]),
    R("mannaz", "Mannaz", "M", "İnsan", "tyr", ["insanlık", "benlik", "iş birliği"],
      "İnsan ve topluluk. Kendini tanıma, başkalarıyla bağ kurma ve birlikte güçlenme zamanı.",
      "Yalnızlık, yanlış anlaşılma ya da kendine yabancılaşma. Önce kendinle barış.",
      [[[10, 56], [10, 4], [30, 24]], [[30, 56], [30, 4], [10, 24]]]),
    R("laguz", "Laguz", "L", "Su, göl", "tyr", ["sezgi", "akış", "duygular"],
      "Derin sular: sezgi, rüyalar ve duyguların akışı. Mantığın ötesinde bir bilgi seni yönlendiriyor.",
      "Duygusal karmaşa ya da sezgiyi bastırmak. Akıntıya karşı yüzme, iç sesini dinle.",
      [[[14, 56], [14, 4], [30, 18]]]),
    R("ingwaz", "Ingwaz", "NG", "Tanrı Ing, tohum", "tyr", ["tamamlanma", "iç büyüme", "bereket"],
      "Toprakta olgunlaşan tohum: bir aşama tamamlanıyor, yeni bir başlangıç için güç toplanıyor.",
      "", [[[20, 14], [32, 30], [20, 46], [8, 30], [20, 14]]], false),
    R("dagaz", "Dagaz", "D", "Gün, şafak", "tyr", ["uyanış", "dönüşüm", "umut"],
      "Şafak söküyor: karanlıktan aydınlığa köklü bir dönüşüm. Yeni bir gün, yeni bir bilinç.",
      "", [[[8, 8], [8, 52], [32, 8], [32, 52], [8, 8]]], false),
    R("othala", "Othala", "O", "Miras, yurt", "tyr", ["aile", "kökler", "miras"],
      "Atalardan gelen miras ve yuva. Köklerin, ailen ve sana aktarılan değerler güç kaynağın.",
      "Aile içi gerginlik ya da köklerden kopuş. Geçmişin yükünü bırak, değerini koru.",
      [[[20, 6], [32, 22], [10, 54]], [[20, 6], [8, 22], [30, 54]]]),
  ];

  const aettler = {
    freyr: { ad: "Freyr'in aett'i", aciklama: "Yaratılış, bolluk ve hayatın temel güçleri." },
    hagal: { ad: "Hagal'ın aett'i", aciklama: "Kader, sınavlar ve doğanın kontrol edilemeyen güçleri." },
    tyr: { ad: "Tyr'ın aett'i", aciklama: "İnsan, ruhsal gelişim, ilişkiler ve miras." },
  };

  const acilimlar = {
    gunun: { ad: "Günün rünü", aciklama: "Bugün sana eşlik edecek rün.", pozisyonlar: ["Günün enerjisi"] },
    tek: { ad: "Odin'in rünü", aciklama: "Tek bir soru, tek bir taş: net ve özlü cevap.", pozisyonlar: ["Cevap"] },
    norn: { ad: "Üç Norn", aciklama: "Urd, Verdandi ve Skuld: geçmiş, şimdi ve olacak olan.", pozisyonlar: ["Urd · Geçmiş", "Verdandi · Şimdi", "Skuld · Olacak olan"] },
    hac: { ad: "Rün Haçı", aciklama: "Beş taşla durumun bütün katmanları.", pozisyonlar: ["Şu anki durum", "Geçmişin etkisi", "Yardımcı güçler", "Engel", "Sonuç"] },
  };

  const runBul = (id) => runler.find((r) => r.id === id);

  return { runler, aettler, acilimlar, runBul };
});
