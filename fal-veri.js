// Kahve falı bölümünün sabit içeriği (tarayıcı + sunucu): fincan sembolleri ve fincan okuma kuralları.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FalVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  // [sembol, anlamı]
  const semboller = [
    ["Kuş", "Haber gelecek; kuş yukarı uçuyorsa sevindirici, aşağı iniyorsa beklenmedik bir haber."],
    ["Balık", "Kısmet ve bereket; beklenmedik bir kazanç ya da hayırlı bir fırsat."],
    ["Yol", "Yolculuk ya da hayatında açılan yeni bir yön; açık yol işlerin kolaylaşmasıdır."],
    ["Kalp", "Aşk, sevgi ve gönül işleri; net bir kalp karşılıklı bir duygudur."],
    ["Yüzük", "Söz, nişan, evlilik ya da güçlü bir bağlılık."],
    ["Göz", "Nazar ya da seni dikkatle izleyen biri; kendini koru."],
    ["At", "Murada erme; uzun süredir beklediğin bir dileğin gerçekleşmesi."],
    ["Yılan", "Etrafında sinsi biri ya da kıskançlık; dikkatli ol ama korkma."],
    ["Dağ", "Aşılması gereken bir engel; tepede bir figür varsa engeli aşacaksın."],
    ["Ağaç", "Sağlam kökler, büyüme ve uzun ömürlü bir iş."],
    ["Ev", "Yuva, aile; yeni bir ev ya da evde bir değişiklik."],
    ["Merdiven", "Yükseliş, terfi ve adım adım başarı."],
    ["Anahtar", "Bir sorunun çözülmesi ve açılan yeni bir kapı."],
    ["Kapı", "Yeni bir fırsat; açık kapı hayırlı bir başlangıçtır."],
    ["Köprü", "Bir zorluğun atlatılması ya da iki dünya arasında bağ kurma."],
    ["Gemi", "Uzaktan gelen kısmet ya da büyük bir yolculuk."],
    ["Uçak", "Ani bir yolculuk ya da hızla değişecek bir durum."],
    ["Kelebek", "Hafiflik, dönüşüm ve kısa süreli bir mutluluk."],
    ["Çiçek", "Sevinç, güzel söz ve gönül ferahlığı."],
    ["Köpek", "Sadık bir dost; havlayan köpek ise dedikodu."],
    ["Kedi", "Ev içinde bir kıskançlık ya da gizli niyet; dikkatli ol."],
    ["Ay", "Duygusal bir dönem ve dilek; hilal yeni bir başlangıç."],
    ["Güneş", "Aydınlık günler, başarı ve ferahlama."],
    ["Yıldız", "Şans, umut ve dileğin gerçekleşmesi."],
    ["Melek", "Koruma, iyi haber ve manevi destek."],
    ["İnsan figürü", "Hayatına girecek ya da seni düşünen biri; figürün yönüne bak."],
    ["Taç", "Başarı, itibar ve takdir görme."],
    ["Mum", "Bir dileğin, bir duanın yanması; aydınlanan bir mesele."],
    ["Fil", "Güç, şans ve uzun soluklu bir destek."],
    ["Aslan", "Güçlü bir koruyucu ya da senin gücün; liderlik."],
    ["Kaplumbağa", "Yavaş ama sağlam ilerleyen bir iş; sabır."],
    ["Deve", "Uzun bir sabrın sonunda gelen ferahlık."],
    ["Örümcek", "Kurulan bir düzen ya da biriktirilen bir para."],
    ["Harf", "Hayatındaki önemli birinin adının baş harfi."],
    ["Sayı", "Bir tarih, süre ya da önemli bir zamanın işareti."],
    ["Çizgi", "Düz çizgi yolculuk ve açık yol, kırık çizgi ertelenen işler."],
    ["Nokta", "Para ve kısmet; noktalar çoksa bereket artıyor."],
    ["Halka", "Tamamlanma, bir döngünün kapanması ya da bir birlik."],
    ["Bulut", "Kafa karışıklığı; dağılan bulut netleşen bir mesele."],
    ["Telve yığını", "Biriken dert ya da yoğun bir dönem; ince akıntılar dertlerin açıldığını gösterir."],
  ].map(([ad, anlam]) => ({ ad, anlam }));

  const kurallar = [
    ["Kulp tarafı", "Fincanın kulbuna yakın taraf senin ve evinindir; buradaki semboller seni ve yakın çevreni anlatır."],
    ["Karşı taraf", "Kulbun karşısı dışarıdan gelenleri, yeni insanları ve dış dünyadaki gelişmeleri gösterir."],
    ["Fincanın dibi", "Dip geçmişi ve kalbinin derinindekileri anlatır; dipte yoğunluk eski bir yükün işaretidir."],
    ["Ağız kenarı", "Kenara yakın semboller yakın geleceği, birkaç gün ya da hafta içinde olacakları gösterir."],
    ["Akıntılar", "Telvenin aşağı akması dertlerin akıp gittiği, ferahlığın yaklaştığı anlamına gelir."],
    ["Tabak", "Tabak niyetin cevabıdır; tabakta beliren açıklık ya da semboller dileğin yönünü gösterir."],
  ];

  return { semboller, kurallar };
});
