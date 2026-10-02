// Yüz okuma bölümünün sabit içeriği (tarayıcı + sunucu): yüz şekilleri, beş element ve yüz bölgeleri.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.YuzOkumaVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const elementler = [
    ["Ağaç", "🌳", "Uzun, ince yüz", "Büyümeye açık, idealist ve yaratıcı; yeni fikirlerin ve başlangıçların insanı."],
    ["Ateş", "🔥", "Kalp ya da üçgen yüz, sivri çene", "Tutkulu, ilham veren ve sıcak; girdiği ortama enerji katar."],
    ["Toprak", "⛰️", "Kare ya da dolgun yüz, güçlü çene", "Güvenilir, sabırlı ve koruyucu; insanlar ona yaslanır."],
    ["Metal", "⚪", "Oval ya da elmas yüz, belirgin elmacık kemikleri", "Düzenli, zarif ve kararlı; ilkeleri olan ve detayı gören biri."],
    ["Su", "💧", "Yuvarlak yüz, yumuşak hatlar", "Sezgisel, uyumlu ve derin; duyguları ve insanları kolayca anlar."],
  ];

  const bolgeler = [
    ["Alın", "Düşünce dünyası, hayal gücü ve ilk gençlik dönemi. Geniş alın vizyonu, yuvarlak alın yaratıcılığı simgeler."],
    ["Kaşlar", "İrade, kararlılık ve kardeş ilişkileri. Belirgin kaşlar azmi, yumuşak kavisli kaşlar diplomasiyi anlatır."],
    ["Gözler", "Ruhun penceresi: duygular, sezgi ve iletişim. Gözlerin bakışı kişinin dünyaya nasıl baktığını gösterir."],
    ["Burun", "Kariyer, kararlılık ve maddi dünya. Burun çizgisi kişinin hedeflerine nasıl yürüdüğünü anlatır."],
    ["Elmacık kemikleri", "Otorite, cesaret ve sosyal güç. Belirgin elmacık kemikleri liderlik enerjisidir."],
    ["Dudaklar", "Sevgi dili, iletişim ve keyif. Dudakların hatları kişinin sevgisini nasıl ifade ettiğini gösterir."],
    ["Çene", "İrade, dayanıklılık ve olgunluk dönemi. Güçlü çene kararlılığı, yumuşak çene uyumu anlatır."],
  ];

  const ipuclari = [
    "Yüzünü kameraya düz çevir; aydınlık bir yerde, gölgesiz çek.",
    "Saçların alnını ve gözlüğün gözlerini kapatmasın; yüz ifaden doğal olsun.",
    "Fotoğrafta yalnızca sen ol. Yüz okuma yetişkinler içindir.",
  ];

  return { elementler, bolgeler, ipuclari };
});
