// Hediye kupon görseli (Murat 2026-10-04): üç şablondan biri (kupon/sablon-a|b|c.jpg, yazısız) üzerine logo, tutar,
// kimden-kime, not ve kod tuvalde çizilir. Aynı çizim hem önizlemede hem de e-postaya giden JPEG'de kullanılır.
(() => {
  const G = 1536;
  const Y = 1024;
  const ALTIN = "#f3c26b";

  // Şablon başına yerleşim (genişlik/yükseklik oranı): yazı paneli, kod yeri ve yazı boyları (genişliğin %'si).
  const SABLONLAR = {
    a: { ad: "Göz ve tarot", panel: { x: 0.37, y: 0.15, g: 0.40, y2: 0.77 }, kod: { x: 0.505, y: 0.875, etiket: false, boy: 2.5 }, logo: 19, tutar: 8.5 },
    b: { ad: "Altın bilet", panel: { x: 0.27, y: 0.22, g: 0.50, y2: 0.78 }, kod: { x: 0.52, y: 0.83, etiket: true, boy: 2.2 }, logo: 19, tutar: 8.5 },
    c: { ad: "Ay ve kahve", panel: { x: 0.15, y: 0.33, g: 0.70, y2: 0.72 }, kod: { x: 0.50, y: 0.80, etiket: true, boy: 2.2 }, logo: 15, tutar: 7, alt: "EZOTER.IST" },
  };

  // Türkçe ek: "Ayşe" → "Ayşe'den", "Zeynep" → "Zeynep'e", "Murat" → "Murat'tan", "Ali" → "Ali'ye".
  const SERT = "fstkçşhp";
  function ek(ad, tur) {
    const isim = String(ad || "").trim();
    if (!isim) return "";
    const kucuk = isim.toLocaleLowerCase("tr-TR");
    const unluler = kucuk.match(/[aeıioöuü]/g);
    const sonUnlu = unluler ? unluler[unluler.length - 1] : "e";
    const ince = "eiöü".includes(sonUnlu);
    const son = kucuk.slice(-1);
    const unluyleBiter = "aeıioöuü".includes(son);
    if (tur === "den") return `${isim}'${SERT.includes(son) ? "t" : "d"}${ince ? "en" : "an"}`;
    return `${isim}'${unluyleBiter ? "y" : ""}${ince ? "e" : "a"}`;
  }

  const resimler = {};
  const resimYukle = (src) => (resimler[src] ||= new Promise((tamam, hata) => {
    const r = new Image();
    r.onload = () => tamam(r);
    r.onerror = () => hata(new Error(`${src} yüklenemedi`));
    r.src = src;
  }));

  let fontlar = null;
  const fontlariYukle = () => (fontlar ||= Promise.all([
    "700 80px Cinzel", "700 80px 'Cormorant Garamond'", "italic 600 40px 'Cormorant Garamond'", "800 30px Manrope",
  ].map((f) => document.fonts.load(f).catch(() => null))));

  // Harf aralıklı, ortalanmış yazı (tuvalin letterSpacing desteği her tarayıcıda yok).
  function aralikliYaz(ctx, metin, x, y, aralik) {
    const harfler = [...metin];
    const genislik = harfler.reduce((t, h) => t + ctx.measureText(h).width, 0) + aralik * (harfler.length - 1);
    let cx = x - genislik / 2;
    ctx.textAlign = "left";
    harfler.forEach((h) => { ctx.fillText(h, cx, y); cx += ctx.measureText(h).width + aralik; });
    ctx.textAlign = "center";
  }

  function satirlaraBol(ctx, metin, enCok, enFazlaSatir) {
    const kelimeler = metin.split(/\s+/).filter(Boolean);
    const satirlar = [];
    let satir = "";
    for (const k of kelimeler) {
      const dene = satir ? `${satir} ${k}` : k;
      if (ctx.measureText(dene).width <= enCok || !satir) satir = dene;
      else { satirlar.push(satir); satir = k; }
    }
    if (satir) satirlar.push(satir);
    if (satirlar.length > enFazlaSatir) {
      satirlar.length = enFazlaSatir;
      satirlar[enFazlaSatir - 1] = `${satirlar[enFazlaSatir - 1].replace(/\s*\S*$/, "")}…`;
    }
    return satirlar;
  }

  // tuval: <canvas>, v: { sablon, kontor, kimden, kime, not, kod }
  async function ciz(tuval, v) {
    const s = SABLONLAR[v.sablon] || SABLONLAR.a;
    const [arka, logo] = await Promise.all([resimYukle(`/kupon/sablon-${v.sablon in SABLONLAR ? v.sablon : "a"}.jpg?v=1`), resimYukle("/kupon/logo.png?v=1"), fontlariYukle()]);
    tuval.width = G;
    tuval.height = Y;
    const ctx = tuval.getContext("2d");
    const u = G / 100; // 1 birim = genişliğin %1'i
    ctx.drawImage(arka, 0, 0, G, Y);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const cx = (s.panel.x + s.panel.g / 2) * G;
    const enCok = s.panel.g * G * 0.86;
    const kimMetni = v.kimden && v.kime ? `${ek(v.kimden, "den")} ${ek(v.kime, "e")}` : v.kimden ? `${ek(v.kimden, "den")} sevgiyle` : "";
    ctx.font = `italic 600 ${1.55 * u}px 'Cormorant Garamond', serif`;
    const notSatirlari = v.not ? satirlaraBol(ctx, `“${v.not}”`, enCok, 2) : [];

    // Dikey yığın: her öğe yüksekliği + boşluk; panelin ortasına hizalanır.
    const logoG = s.logo * u;
    const logoY = logoG * (logo.height / logo.width);
    const ogeler = [
      { y: logoY, bosluk: 1.4 * u, ciz: (ust) => ctx.drawImage(logo, cx - logoG / 2, ust, logoG, logoY) },
      { y: 1.25 * u, bosluk: 1.3 * u, ciz: (ust) => { ctx.font = `800 ${1.25 * u}px Manrope, sans-serif`; ctx.fillStyle = ALTIN; aralikliYaz(ctx, "HEDİYE KUPON", cx, ust + 1.25 * u * 0.9, 0.45 * 1.25 * u); } },
      { y: s.tutar * u * 0.78, bosluk: 1.3 * u, ciz: (ust) => {
        // Cinzel: rakamlar düz (Cormorant'ın eski usul rakamları "100"ü "IOO" gibi gösteriyordu).
        const boy = s.tutar * u * 0.82;
        ctx.font = `700 ${boy}px Cinzel, 'Cormorant Garamond', serif`;
        const taban = ust + boy * 0.9;
        const gr = ctx.createLinearGradient(0, ust, 0, taban);
        gr.addColorStop(0, "#fff3c9"); gr.addColorStop(0.45, ALTIN); gr.addColorStop(1, "#a8742a");
        ctx.save();
        ctx.shadowColor = "rgba(243, 194, 107, 0.45)";
        ctx.shadowBlur = 1.4 * u;
        ctx.fillStyle = gr;
        ctx.fillText(new Intl.NumberFormat("tr-TR").format(v.kontor || 0), cx, taban);
        ctx.restore();
      } },
      { y: 1.9 * u, bosluk: kimMetni || notSatirlari.length ? 1.6 * u : 0, ciz: (ust) => { ctx.font = `800 ${1.9 * u}px Manrope, sans-serif`; ctx.fillStyle = "#f3d58a"; aralikliYaz(ctx, "KONTÖR", cx, ust + 1.9 * u * 0.9, 0.35 * 1.9 * u); } },
    ];
    if (kimMetni) ogeler.push({ y: 2.2 * u, bosluk: 0.8 * u, ciz: (ust) => { ctx.font = `italic 600 ${2.2 * u}px 'Cormorant Garamond', serif`; ctx.fillStyle = "#fff"; ctx.fillText(kimMetni, cx, ust + 2.2 * u * 0.8, enCok); } });
    notSatirlari.forEach((satir) => ogeler.push({ y: 1.55 * u, bosluk: 0.5 * u, ciz: (ust) => { ctx.font = `italic 600 ${1.55 * u}px 'Cormorant Garamond', serif`; ctx.fillStyle = "rgba(255,255,255,0.84)"; ctx.fillText(satir, cx, ust + 1.55 * u * 0.8); } }));
    const toplam = ogeler.reduce((t, o, i) => t + o.y + (i < ogeler.length - 1 ? o.bosluk : 0), 0);
    let ust = (s.panel.y * Y + s.panel.y2 * Y) / 2 - toplam / 2;
    ogeler.forEach((o) => { o.ciz(ust); ust += o.y + o.bosluk; });

    // Kod
    const kx = s.kod.x * G;
    const ky = s.kod.y * Y;
    if (s.kod.etiket) { ctx.font = `800 ${0.85 * u}px Manrope, sans-serif`; ctx.fillStyle = ALTIN; aralikliYaz(ctx, "KUPON KODU", kx, ky - s.kod.boy * u * 0.75, 0.4 * 0.85 * u); }
    ctx.save();
    ctx.font = `800 ${s.kod.boy * u}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(243, 194, 107, 0.6)";
    ctx.shadowBlur = u;
    aralikliYaz(ctx, v.kod || "XXXX-XXXX-XXXX", kx, ky + s.kod.boy * u * 0.36, 0.14 * s.kod.boy * u);
    ctx.restore();
    if (s.alt) { ctx.font = `700 ${1.1 * u}px Manrope, sans-serif`; ctx.fillStyle = ALTIN; aralikliYaz(ctx, s.alt, G / 2, Y * 0.975, 0.25 * 1.1 * u); }
    return tuval;
  }

  const jpeg = (tuval) => new Promise((tamam) => tuval.toBlob(tamam, "image/jpeg", 0.86));

  window.KuponCizim = { SABLONLAR, ciz, jpeg, ek };
})();
