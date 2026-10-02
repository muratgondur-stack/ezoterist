// El falı bölümünün sabit içeriği (tarayıcı + sunucu): el tipleri, çizgiler ve tepeler.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ElFaliVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const elTipleri = [
    ["Toprak eli", "🌿", "Kare avuç, kısa parmaklar", "Pratik, güvenilir ve çalışkan; somut işlerle mutlu olur, sözünün eridir."],
    ["Hava eli", "🌬️", "Kare avuç, uzun parmaklar", "Meraklı, konuşkan ve zeki; fikir üretir, iletişim onun gücüdür."],
    ["Ateş eli", "🔥", "Uzun avuç, kısa parmaklar", "Enerjik, tutkulu ve cesur; harekete geçer, ilham verir."],
    ["Su eli", "🌊", "Uzun avuç, uzun parmaklar", "Duygusal, sezgisel ve yaratıcı; sanata ve insanlara derin bir duyarlılıkla bakar."],
  ];

  const cizgiler = [
    ["Hayat çizgisi", "Başparmak ile işaret parmağı arasından başlayıp başparmağın etrafını dolanır.", "Yaşam enerjini, canlılığını ve hayatındaki büyük değişimleri anlatır. Uzunluğu ömrü göstermez; derinliği ve akışı enerjini anlatır."],
    ["Kalp çizgisi", "Serçe parmağın altından başlayıp işaret ya da orta parmağa doğru uzanır.", "Duygularını, sevme biçimini ve ilişkilerini anlatır. Kıvrımlı bir kalp çizgisi duygularını açıkça gösterdiğine işarettir."],
    ["Akıl çizgisi", "Hayat çizgisinin başlangıcına yakın yerden avucun ortasına doğru uzanır.", "Düşünme biçimini, odaklanmanı ve öğrenme tarzını anlatır. Düz çizgi mantığı, eğik çizgi yaratıcılığı öne çıkarır."],
    ["Kader çizgisi", "Avucun altından orta parmağa doğru dikey uzanır; herkeste belirgin değildir.", "Kariyerini, hayat yolunu ve dış etkileri anlatır. Belirginse hedefleri net biri, siliksi ise yolunu kendi çizen biri."],
    ["Güneş çizgisi", "Yüzük parmağının altına doğru uzanan ince bir çizgidir.", "Şöhret, başarı, yaratıcılık ve hayattan aldığın keyfi anlatır."],
    ["İlişki çizgileri", "Serçe parmağın altında, avucun kenarında kısa yatay çizgilerdir.", "Hayatındaki derin bağları ve önemli ilişkileri gösterir."],
  ];

  const tepeler = [
    ["Venüs tepesi", "Başparmağın altı", "Sevgi, tutku, güzellik ve yaşam sevinci."],
    ["Jüpiter tepesi", "İşaret parmağının altı", "Özgüven, liderlik ve hırs."],
    ["Satürn tepesi", "Orta parmağın altı", "Sorumluluk, sabır ve bilgelik."],
    ["Güneş tepesi", "Yüzük parmağının altı", "Yaratıcılık, sanat ve parlama isteği."],
    ["Merkür tepesi", "Serçe parmağın altı", "İletişim, ticaret zekâsı ve hazırcevaplık."],
    ["Ay tepesi", "Avucun alt dış kenarı", "Hayal gücü, sezgi ve seyahat isteği."],
    ["Mars bölgesi", "Avucun ortası ve iki yanı", "Cesaret, dayanıklılık ve mücadele gücü."],
  ];

  const ipuclari = [
    "Baskın elin (yazı yazdığın el) bugününü ve kendi yarattıklarını, diğer elin doğuştan getirdiklerini anlatır.",
    "Fotoğrafı gün ışığında, avucunu tam açıp parmaklarını hafifçe aralayarak çek.",
    "Avucun kadrajı doldursun; çizgilerin net görünmesi için kamerayı avucuna dik tut.",
  ];

  return { elTipleri, cizgiler, tepeler, ipuclari };
});
