// Aşk uyumu hesabı (tarayıcı + sunucu): iki kişinin Güneş, Ay, Venüs, Mars, Merkür burçları arasındaki açılar ve
// yaşam yolu sayıları; kategori puanları ve genel uyum. Astro (astro.js) ve Numeroloji (numeroloji-hesap.js) gerekir.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./astro"), require("./numeroloji-hesap"));
  else root.AskUyumu = factory(root.Astro, root.Numeroloji);
})(typeof self !== "undefined" ? self : this, (Astro, Numeroloji) => {
  const ELEMENT = { koc: "ates", aslan: "ates", yay: "ates", boga: "toprak", basak: "toprak", oglak: "toprak", ikizler: "hava", terazi: "hava", kova: "hava", yengec: "su", akrep: "su", balik: "su" };
  const ACI_PUANI = { kavusum: 82, "yarim-altmislik": 56, altmislik: 86, kare: 46, ucgen: 95, "yarim-karsit": 42, karsit: 68 };
  const TAMAMLAYICI = new Set(["ates-hava", "hava-ates", "toprak-su", "su-toprak"]);

  // İki burç arasındaki uyum (0–100): burç açısı + element uyumu.
  function burcPuani(a, b) {
    let puan = ACI_PUANI[Astro.aspectBetween(a, b)];
    if (ELEMENT[a] === ELEMENT[b]) puan += 4;
    else if (TAMAMLAYICI.has(`${ELEMENT[a]}-${ELEMENT[b]}`)) puan += 3;
    return Math.min(99, puan);
  }

  // Yaşam yolu uyumu: zihin (1-5-7), pratik (2-4-8), yaratıcı (3-6-9) grupları; üstat sayılar köküne göre.
  const GRUP = { 1: "zihin", 5: "zihin", 7: "zihin", 2: "pratik", 4: "pratik", 8: "pratik", 3: "yaratici", 6: "yaratici", 9: "yaratici" };
  const kok = (n) => (n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n);
  const UYUMLU_CIFTLER = new Set(["1-3", "1-9", "2-6", "2-9", "3-5", "4-6", "4-7", "5-7", "6-9", "1-5", "2-8", "3-6"]);
  function sayiPuani(a, b) {
    const [x, y] = [kok(a), kok(b)].sort((m, n) => m - n);
    if (x === y) return 84;
    if (GRUP[x] === GRUP[y]) return 91;
    return UYUMLU_CIFTLER.has(`${x}-${y}`) ? 78 : 60;
  }

  // Kişinin yerleşimleri: saat yoksa öğle saati alınır (Ay burcu gün içinde değişebilir).
  function kisiHesapla({ tarih, saat, saatDilimi = "Europe/Istanbul", ad = "" }) {
    const [yil, ay, gun] = tarih.split("-").map(Number);
    const [s, d] = /^\d{2}:\d{2}$/.test(saat || "") ? saat.split(":").map(Number) : [12, 0];
    const an = Astro.localToUtc(yil, ay, gun, s, d, saatDilimi);
    const konum = Object.fromEntries(Astro.positions(an).map((k) => [k.body, k.sign]));
    const yasamYolu = Numeroloji.yasamYolu(gun, ay, yil).sayi;
    const kader = ad.trim().split(/\s+/).length > 1 ? Numeroloji.isimSayisi(ad, () => true).sayi : null;
    return { gunes: konum.sun, ay: konum.moon, merkur: konum.mercury, venus: konum.venus, mars: konum.mars, yasamYolu, kader };
  }

  function uyum(a, b) {
    const ort = (...x) => Math.round(x.reduce((t, v) => t + v, 0) / x.length);
    const puanlar = {
      ruh: burcPuani(a.gunes, b.gunes),
      duygusal: ort(burcPuani(a.ay, b.ay), burcPuani(a.gunes, b.ay), burcPuani(b.gunes, a.ay)),
      tutku: ort(burcPuani(a.venus, b.mars), burcPuani(b.venus, a.mars)),
      iletisim: burcPuani(a.merkur, b.merkur),
      numeroloji: sayiPuani(a.yasamYolu, b.yasamYolu),
    };
    const agirlik = { ruh: 0.2, duygusal: 0.25, tutku: 0.25, iletisim: 0.15, numeroloji: 0.15 };
    const toplam = Math.round(Object.entries(puanlar).reduce((t, [k, v]) => t + v * agirlik[k], 0));
    return { puanlar, toplam };
  }

  const KATEGORILER = {
    ruh: { ad: "Ruh uyumu", ikon: "☉", aciklama: "Güneş burçlarınız: kimlikleriniz ve hayata bakışınız." },
    duygusal: { ad: "Duygusal bağ", ikon: "☽", aciklama: "Ay burçlarınız: duygusal ihtiyaçlarınız ve güven." },
    tutku: { ad: "Tutku ve çekim", ikon: "♀♂", aciklama: "Venüs ile Mars: çekim, romantizm ve tutku." },
    iletisim: { ad: "İletişim", ikon: "☿", aciklama: "Merkür burçlarınız: anlaşma ve konuşma biçiminiz." },
    numeroloji: { ad: "Kader uyumu", ikon: "∞", aciklama: "Yaşam yolu sayılarınız: hayat yolunuzun ahengi." },
  };

  const puanYorumu = (p) =>
    p >= 90 ? "Ruh eşi titreşimi" : p >= 80 ? "Çok güçlü uyum" : p >= 70 ? "Güzel bir uyum" : p >= 60 ? "Emekle büyüyen bağ" : p >= 50 ? "Farklılıklar öğretici" : "Zorlayıcı ama dönüştürücü";

  return { burcPuani, sayiPuani, kisiHesapla, uyum, KATEGORILER, puanYorumu, ELEMENT };
});
