// Taşlarla dizim: yerleşimin matematiksel çözümlemesi (tarayıcı + sunucu aynı kodu kullanır; sunucu sonucu kendisi hesaplar).
// Girdi: taşlar [{ id, ad, tur, x, y }] — x, y masaya göre 0..1 (sol üst köşe 0,0); oran = masa yüksekliği / genişliği.
// Uzaklıklar masa köşegenine bölünür ve 0..100 arası "puan" olarak verilir (100 = köşeden köşeye).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DizimHesap = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const TURLER = { ben: "Ben", kisi: "Kişi", mekan: "Mekân", kavram: "Kavram" };
  const kucuk = (s) => String(s || "").toLocaleLowerCase("tr-TR").trim();
  const benMi = (t) => t.tur === "ben" || ["ben", "kendim", "ben (kendim)"].includes(kucuk(t.ad));
  const yuvarla = (n, b = 1) => Math.round(n * 10 ** b) / 10 ** b;
  const medyan = (dizi) => {
    if (!dizi.length) return 0;
    const s = [...dizi].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  // Ekran yönü (y aşağı doğru artar; kullanıcı masanın alt kenarında oturur).
  function yon(dx, dy) {
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return "üst üste";
    const yatay = dx > 0 ? "sağında" : "solunda";
    const dikey = dy > 0 ? "önünde (sana yakın tarafta)" : "arkasında (masanın uzak tarafında)";
    const oran = Math.abs(dx) / (Math.abs(dy) || 1e-9);
    if (oran > 2) return yatay;
    if (oran < 0.5) return dikey;
    return `${dy > 0 ? "önünde" : "arkasında"}, ${yatay}`;
  }

  function analiz(girdi, { oran = 2 / 3 } = {}) {
    const D = Math.hypot(1, oran);
    const taslar = girdi.map((t) => ({ ...t, X: t.x, Y: t.y * oran }));
    const n = taslar.length;
    const mesafe = (a, b) => Math.hypot(a.X - b.X, a.Y - b.Y) / D;

    // İkili uzaklıklar.
    const ikili = [];
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) ikili.push({ a: taslar[i].id, b: taslar[j].id, mesafe: mesafe(taslar[i], taslar[j]) });
    }
    const m = (a, b) => (a === b ? 0 : ikili.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)).mesafe);

    // Ağırlık merkezi ve masa merkezi.
    const agirlik = n ? { X: taslar.reduce((t, s) => t + s.X, 0) / n, Y: taslar.reduce((t, s) => t + s.Y, 0) / n } : { X: 0.5, Y: oran / 2 };
    const masa = { X: 0.5, Y: oran / 2 };
    const agUz = taslar.map((t) => Math.hypot(t.X - agirlik.X, t.Y - agirlik.Y) / D);
    const maxAg = Math.max(...agUz, 1e-9);

    // En yakın komşu uzaklıklarından kümeleme eşiği (tek bağlantılı kümeleme).
    const enYakinlar = taslar.map((t) => Math.min(...taslar.filter((s) => s !== t).map((s) => m(t.id, s.id)), Infinity));
    const nnMedyan = medyan(enYakinlar.filter(Number.isFinite));
    const esik = Math.min(0.2, Math.max(0.06, nnMedyan * 1.45));
    const kume = taslar.map((_, i) => i);
    const kok = (i) => (kume[i] === i ? i : (kume[i] = kok(kume[i])));
    ikili.forEach((p) => {
      if (p.mesafe <= esik) {
        const a = kok(taslar.findIndex((t) => t.id === p.a));
        const b = kok(taslar.findIndex((t) => t.id === p.b));
        if (a !== b) kume[a] = b;
      }
    });
    const kumeHaritasi = new Map();
    taslar.forEach((t, i) => { const k = kok(i); if (!kumeHaritasi.has(k)) kumeHaritasi.set(k, []); kumeHaritasi.get(k).push(t.id); });
    const kumeler = [...kumeHaritasi.values()].sort((a, b) => b.length - a.length).map((uyeler, i) => ({ no: i + 1, uyeler }));
    const kumeNo = (id) => kumeler.find((k) => k.uyeler.includes(id)).no;

    const sonuc = taslar.map((t, i) => {
      const digerleri = taslar.filter((s) => s !== t).map((s) => ({ id: s.id, ad: s.ad, mesafe: m(t.id, s.id) })).sort((a, b) => a.mesafe - b.mesafe);
      const r = agUz[i] / maxAg;
      const k = kumeler.find((x) => x.uyeler.includes(t.id));
      const kenar = Math.min(t.x, 1 - t.x, t.y, 1 - t.y) < 0.1;
      return {
        id: t.id, ad: t.ad, tur: t.tur,
        x: yuvarla(t.x, 4), y: yuvarla(t.y, 4),
        masaMerkezine: yuvarla((Math.hypot(t.X - masa.X, t.Y - masa.Y) / D) * 100),
        dizimMerkezine: yuvarla(agUz[i] * 100),
        konum: n < 3 ? "—" : r < 0.34 ? "merkez" : r > 0.74 ? "çevre" : "ara",
        masaKenarinda: kenar,
        enYakin: digerleri[0] ? { id: digerleri[0].id, ad: digerleri[0].ad, mesafe: yuvarla(digerleri[0].mesafe * 100) } : null,
        enUzak: digerleri.length ? { id: digerleri.at(-1).id, ad: digerleri.at(-1).ad, mesafe: yuvarla(digerleri.at(-1).mesafe * 100) } : null,
        kume: kumeNo(t.id),
        grupta: k.uyeler.length > 1,
        yalniz: n >= 3 && k.uyeler.length === 1 && enYakinlar[i] > nnMedyan * 1.6,
      };
    });

    // Dizilimin genel şekli: temel bileşenler (sıra), yarıçap tutarlılığı (halka), küme sayısı.
    let sekil = { tur: "serbest", ad: "Serbest yerleşim" };
    if (n >= 3) {
      const cx = agirlik.X;
      const cy = agirlik.Y;
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      taslar.forEach((t) => { sxx += (t.X - cx) ** 2; syy += (t.Y - cy) ** 2; sxy += (t.X - cx) * (t.Y - cy); });
      const iz = sxx + syy;
      const fark = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2);
      const l1 = iz / 2 + fark;
      const l2 = iz / 2 - fark;
      const ortR = agUz.reduce((t, v) => t + v, 0) / n;
      const sapma = Math.sqrt(agUz.reduce((t, v) => t + (v - ortR) ** 2, 0) / n);
      if (l1 > 0 && l2 / l1 < 0.05) sekil = { tur: "sira", ad: "Sıra / çizgi" };
      else if (n >= 4 && ortR > 0.08 && sapma / ortR < 0.22) sekil = { tur: "halka", ad: "Halka / daire" };
      else if (kumeler.filter((k) => k.uyeler.length > 1).length >= 2) sekil = { tur: "gruplar", ad: "Birden çok grup" };
      else if (ortR < 0.1) sekil = { tur: "siki", ad: "Sıkı bir küme" };
      else if (kumeler.length === n) sekil = { tur: "dagink", ad: "Dağınık, birbirinden ayrı" };
      sekil.yayilim = yuvarla(ortR * 100);
    }

    // "Ben" taşına göre diğerleri.
    const benTas = taslar.find(benMi);
    const ben = benTas ? {
      id: benTas.id,
      ad: benTas.ad,
      siralama: taslar.filter((t) => t !== benTas)
        .map((t) => ({ id: t.id, ad: t.ad, mesafe: yuvarla(m(benTas.id, t.id) * 100), yon: yon(t.X - benTas.X, t.Y - benTas.Y) }))
        .sort((a, b) => a.mesafe - b.mesafe),
    } : null;

    return {
      sayi: n,
      oran,
      agirlikMerkezi: { x: yuvarla(agirlik.X, 4), y: yuvarla(agirlik.Y / oran, 4) },
      kumeEsigi: yuvarla(esik * 100),
      taslar: sonuc,
      mesafeler: ikili.map((p) => ({ a: p.a, b: p.b, mesafe: yuvarla(p.mesafe * 100) })).sort((a, b) => a.mesafe - b.mesafe),
      kumeler,
      sekil,
      ben,
    };
  }

  // Aynı adı taşıyan taşlar üzerinden iki dizimin farkı (karşılaştırma için).
  function karsilastir(eski, yeni) {
    const adHaritasi = (a) => new Map(a.taslar.map((t) => [kucuk(t.ad), t]));
    const ea = adHaritasi(eski);
    const ya = adHaritasi(yeni);
    const ortak = [...ea.keys()].filter((k) => ya.has(k));
    const ciftMesafe = (an, a, b) => an.mesafeler.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))?.mesafe;
    const ciftler = [];
    for (let i = 0; i < ortak.length; i += 1) {
      for (let j = i + 1; j < ortak.length; j += 1) {
        const once = ciftMesafe(eski, ea.get(ortak[i]).id, ea.get(ortak[j]).id);
        const sonra = ciftMesafe(yeni, ya.get(ortak[i]).id, ya.get(ortak[j]).id);
        if (once != null && sonra != null) ciftler.push({ a: ea.get(ortak[i]).ad, b: ea.get(ortak[j]).ad, once, sonra, degisim: yuvarla(sonra - once) });
      }
    }
    ciftler.sort((p, q) => Math.abs(q.degisim) - Math.abs(p.degisim));
    return {
      ortak: ortak.map((k) => ea.get(k).ad),
      yalnizEskide: [...ea.keys()].filter((k) => !ya.has(k)).map((k) => ea.get(k).ad),
      yalnizYenide: [...ya.keys()].filter((k) => !ea.has(k)).map((k) => ya.get(k).ad),
      ciftler,
      konumDegisimi: ortak.map((k) => ({ ad: ea.get(k).ad, once: ea.get(k).konum, sonra: ya.get(k).konum })).filter((x) => x.once !== x.sonra),
    };
  }

  return { analiz, karsilastir, TURLER, benMi };
});
