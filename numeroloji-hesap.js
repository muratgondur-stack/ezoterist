// Numeroloji hesapları (tarayıcı + sunucu): Pisagor sistemi, Türkçe harfler temel harfe indirgenir
// (Ç→C, Ğ→G, İ/I→I, Ö→O, Ş→S, Ü→U). Üstat sayılar (11, 22, 33) korunur, karmik borçlar (13, 14, 16, 19) işaretlenir.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Numeroloji = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const USTAT = [11, 22, 33];
  const KARMIK = [13, 14, 16, 19];
  const DEGER = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 };
  const TEMEL = { Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U", Â: "A", Î: "I", Û: "U" };
  const SESLI = new Set(["A", "E", "I", "O", "U"]);

  const rakamToplami = (n) => String(n).split("").reduce((t, d) => t + Number(d), 0);

  // Sayıyı tek haneye indirir; ustat=true ise 11/22/33'te durur. Yol boyunca karmik borç sayısı görülürse kaydeder.
  function indirge(n, ustat = true) {
    let karmik = KARMIK.includes(n) ? n : null;
    while (n > 9 && !(ustat && USTAT.includes(n))) {
      n = rakamToplami(n);
      if (KARMIK.includes(n)) karmik = n;
    }
    return { sayi: n, karmik };
  }

  const harfler = (adSoyad) =>
    adSoyad
      .toLocaleUpperCase("tr-TR")
      .split("")
      .map((h) => TEMEL[h] || h)
      .filter((h) => DEGER[h]);

  // Her isim ayrı toplanıp indirgenir, sonra sonuçlar toplanır (geleneksel yöntem).
  function isimSayisi(adSoyad, secici) {
    const kelimeler = adSoyad.trim().split(/\s+/).filter(Boolean);
    let karmik = null;
    let toplam = 0;
    for (const kelime of kelimeler) {
      const degerler = harfler(kelime).filter(secici).map((h) => DEGER[h]);
      if (!degerler.length) continue;
      const parca = indirge(degerler.reduce((a, b) => a + b, 0));
      if (parca.karmik) karmik = parca.karmik;
      toplam += parca.sayi;
    }
    const sonuc = indirge(toplam);
    return { sayi: sonuc.sayi, karmik: sonuc.karmik || karmik };
  }

  function yasamYolu(gun, ay, yil) {
    const parcalar = [indirge(ay).sayi, indirge(gun).sayi, indirge(rakamToplami(yil)).sayi];
    return indirge(parcalar.reduce((a, b) => a + b, 0));
  }

  const kisiselYil = (gun, ay, yil) => indirge(indirge(ay, false).sayi + indirge(gun, false).sayi + indirge(rakamToplami(yil), false).sayi, false).sayi;
  const kisiselAy = (kYil, ay) => indirge(kYil + ay, false).sayi;
  const kisiselGun = (kAy, gun) => indirge(kAy + gun, false).sayi;
  const evrenselGun = (gun, ay, yil) => indirge(rakamToplami(`${gun}${ay}${yil}`), false).sayi;

  // Lo Shu ızgarası: doğum tarihindeki rakamların (0 hariç) sayımı.
  function izgara(gun, ay, yil) {
    const sayim = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, 0]));
    `${gun}${ay}${yil}`.split("").map(Number).filter(Boolean).forEach((d) => { sayim[d] += 1; });
    return sayim;
  }

  // Bugünün tarihi İstanbul saatine göre (gün, ay, yıl).
  function bugun(date = new Date()) {
    const parcalar = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(date).split("-").map(Number);
    return { yil: parcalar[0], ay: parcalar[1], gun: parcalar[2] };
  }

  function profil(adSoyad, tarih, simdi = new Date()) {
    const [yil, ay, gun] = tarih.split("-").map(Number);
    const yy = yasamYolu(gun, ay, yil);
    const kader = isimSayisi(adSoyad, () => true);
    const ruh = isimSayisi(adSoyad, (h) => SESLI.has(h));
    const kisilik = isimSayisi(adSoyad, (h) => !SESLI.has(h));
    const dogumGunu = indirge(gun);
    const olgunluk = indirge(yy.sayi + kader.sayi);
    const b = bugun(simdi);
    const kYil = kisiselYil(gun, ay, b.yil);
    const kAy = kisiselAy(kYil, b.ay);
    const kGun = kisiselGun(kAy, b.gun);
    const isimdeki = new Set(harfler(adSoyad).map((h) => DEGER[h]));
    const eksik = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !isimdeki.has(n));
    const karmikBorclar = [...new Set([yy.karmik, kader.karmik, ruh.karmik, kisilik.karmik, KARMIK.includes(gun) ? gun : null].filter(Boolean))];
    return {
      sayilar: {
        yasamYolu: yy.sayi, kader: kader.sayi, ruh: ruh.sayi, kisilik: kisilik.sayi,
        dogumGunu: dogumGunu.sayi, olgunluk: olgunluk.sayi, kisiselYil: kYil,
      },
      kisiselAy: kAy,
      kisiselGun: kGun,
      izgara: izgara(gun, ay, yil),
      eksik,
      karmikBorclar,
    };
  }

  return { profil, indirge, isimSayisi, yasamYolu, kisiselYil, kisiselAy, kisiselGun, evrenselGun, izgara, bugun, USTAT, KARMIK };
});
