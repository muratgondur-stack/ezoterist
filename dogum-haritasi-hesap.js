// Ayrıntılı doğum haritası hesabı (tarayıcı + sunucu): gezegen boylamları, yükselen ve MC, Placidus evleri,
// derece tabanlı açılar, element ve nitelik dengesi. Astro (astro.js) ve AstrolojiVeri (astroloji-veri.js) gerekir.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./astro"), require("./astroloji-veri"));
  else root.DogumHaritasi = factory(root.Astro, root.AstrolojiVeri);
})(typeof self !== "undefined" ? self : this, (Astro, Veri) => {
  const RAD = Math.PI / 180;
  const { norm } = Astro;
  const sin = (d) => Math.sin(d * RAD);
  const cos = (d) => Math.cos(d * RAD);
  const tan = (d) => Math.tan(d * RAD);
  const asin = (x) => Math.asin(Math.max(-1, Math.min(1, x))) / RAD;
  const acos = (x) => Math.acos(Math.max(-1, Math.min(1, x))) / RAD;

  function sidereal(jd, boylam) {
    const T = (jd - 2451545) / 36525;
    return norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - (T * T * T) / 38710000 + boylam);
  }

  // Placidus ev başlangıçları (12 değer, 1. ev = yükselen). Kutup yakınında Placidus tanımsızdır; 66°'nin
  // üstünde eşit ev sistemine düşülür.
  function placidus(jd, enlem, boylam, asc, mc) {
    const eps = 23.439291 - (0.0130042 * (jd - 2451545)) / 36525;
    const ramc = sidereal(jd, boylam);
    if (Math.abs(enlem) > 66) return Array.from({ length: 12 }, (_, i) => norm(asc + i * 30));
    const raToLon = (ra) => norm(Math.atan2(sin(ra), cos(ra) * cos(eps)) / RAD);
    const cusp = (oran, gunduz) => {
      let lon = norm(mc + (gunduz ? oran : 1 + oran) * 90);
      for (let i = 0; i < 30; i += 1) {
        const dek = asin(sin(eps) * sin(lon));
        const yay = acos(-tan(enlem) * tan(dek)); // gündüz yayı
        const ra = gunduz ? ramc + yay * oran : ramc + 180 - (180 - yay) * (1 - oran);
        const yeni = raToLon(ra);
        if (Math.abs(norm(yeni - lon + 180) - 180) < 1e-7) { lon = yeni; break; }
        lon = yeni;
      }
      return lon;
    };
    const c11 = cusp(1 / 3, true);
    const c12 = cusp(2 / 3, true);
    const c2 = cusp(1 / 3, false);
    const c3 = cusp(2 / 3, false);
    const ic = norm(mc + 180);
    return [asc, c2, c3, ic, norm(c11 + 180), norm(c12 + 180), norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
  }

  // Bir boylamın hangi evde olduğu (1-12).
  function evBul(lon, evler) {
    for (let i = 0; i < 12; i += 1) {
      const bas = evler[i];
      const son = evler[(i + 1) % 12];
      const genislik = norm(son - bas);
      if (norm(lon - bas) < genislik) return i + 1;
    }
    return 1;
  }

  const ACILAR = [
    { tur: "kavusum", aci: 0, orb: 8 },
    { tur: "altmislik", aci: 60, orb: 5 },
    { tur: "kare", aci: 90, orb: 7 },
    { tur: "ucgen", aci: 120, orb: 7 },
    { tur: "karsit", aci: 180, orb: 8 },
  ];
  const KUSAK = new Set(["uranus", "neptune", "pluto"]);

  function acilariBul(noktalar) {
    const sonuc = [];
    for (let i = 0; i < noktalar.length; i += 1) {
      for (let j = i + 1; j < noktalar.length; j += 1) {
        const a = noktalar[i];
        const b = noktalar[j];
        if (KUSAK.has(a.body) && KUSAK.has(b.body)) continue; // kuşak açıları kişisel değil
        const fark = Math.abs(norm(a.lon - b.lon + 180) - 180);
        const isik = ["sun", "moon"].includes(a.body) || ["sun", "moon"].includes(b.body) ? 2 : 0;
        const bulunan = ACILAR.find((x) => Math.abs(fark - x.aci) <= x.orb + isik);
        if (bulunan) sonuc.push({ a: a.body, b: b.body, tur: bulunan.tur, orb: Math.round(Math.abs(fark - bulunan.aci) * 10) / 10 });
      }
    }
    return sonuc.sort((x, y) => x.orb - y.orb);
  }

  const NITELIK = { koc: "Öncü", yengec: "Öncü", terazi: "Öncü", oglak: "Öncü", boga: "Sabit", aslan: "Sabit", akrep: "Sabit", kova: "Sabit", ikizler: "Değişken", basak: "Değişken", yay: "Değişken", balik: "Değişken" };
  const ELEMENT = Object.fromEntries(Object.entries(Veri.elementler).flatMap(([e, v]) => v.burclar.map((b) => [b, e])));

  // Güneş, Ay ve yükselen 2, diğerleri 1 puan.
  function denge(konumlar, yukselen) {
    const element = { ates: 0, toprak: 0, hava: 0, su: 0 };
    const nitelik = { "Öncü": 0, "Sabit": 0, "Değişken": 0 };
    const ekle = (burc, p) => { element[ELEMENT[burc]] += p; nitelik[NITELIK[burc]] += p; };
    konumlar.forEach((k) => ekle(k.sign, ["sun", "moon"].includes(k.body) ? 2 : 1));
    if (yukselen) ekle(yukselen, 2);
    const baskin = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0][0];
    return { element, nitelik, baskinElement: baskin(element), baskinNitelik: baskin(nitelik) };
  }

  // girdi: { tarih: "YYYY-AA-GG", saat: "SS:DD" | "", saatYok, sehir }
  function hesapla(girdi) {
    const [yil, ay, gun] = girdi.tarih.split("-").map(Number);
    const sehir = Veri.sehirler.find((s) => s.ad === girdi.sehir) || Veri.sehirler.find((s) => s.ad === "İstanbul");
    const saatBilinir = !girdi.saatYok && /^\d{2}:\d{2}$/.test(girdi.saat || "");
    const [s, d] = saatBilinir ? girdi.saat.split(":").map(Number) : [12, 0];
    const an = Astro.localToUtc(yil, ay, gun, s, d, sehir.saatDilimi);
    const jd = Astro.julianDay(an);
    const konumlar = Astro.positions(an);
    const sonuc = { saatBilinir, sehir: sehir.ad, konumlar, asc: null, mc: null, yukselen: "", evler: null };
    if (saatBilinir) {
      const { asc, mc } = Astro.angles(an, sehir.enlem, sehir.boylam);
      sonuc.asc = asc;
      sonuc.mc = mc;
      sonuc.yukselen = Astro.signOf(asc);
      sonuc.evler = placidus(jd, sehir.enlem, sehir.boylam, asc, mc);
      konumlar.forEach((k) => { k.ev = evBul(k.lon, sonuc.evler); });
    }
    sonuc.acilar = acilariBul(konumlar);
    sonuc.denge = denge(konumlar, sonuc.yukselen);
    return sonuc;
  }

  return { hesapla, placidus, evBul, acilariBul, ELEMENT, NITELIK };
});
