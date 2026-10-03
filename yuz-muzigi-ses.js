// Yüz Müziği ses motoru (Web Audio, dosyasız). Yüz ölçümlerinden bir "tarif" çıkarılır (ana nota, makam, ses rengi,
// çan aralığı, nefes ritmi) ve tohumlu rastgelelikle o yüze özgü, hep aynı ana motiften türeyen sonsuz bir ambiyans çalınır.
// Katmanlar: drone, yavaş pad akorları, çan/kâse melodisi, isteğe bağlı okyanus ve binaural vuruş.
// Melodi modu: yüzden çıkan tonalite, ölçü, tempo ve akor yürüyüşleriyle gerçek piyano örnekleriyle çalınan ninni. Ses <audio> öğesine
// akış olarak verilir; böylece telefon ekranı kilitlenince de çalmayı sürdürme şansı artar.
window.YuzMuzigi = (() => {
  const MAKAMLAR = {
    huzur: { ad: "Huzur", aralik: [0, 2, 4, 7, 9] },
    ruya: { ad: "Rüya", aralik: [0, 2, 4, 6, 7, 9, 11] },
    derin: { ad: "Derinlik", aralik: [0, 2, 3, 5, 7, 9, 10] },
    gizem: { ad: "Gizem", aralik: [0, 3, 5, 7, 10] },
    hicaz: { ad: "Hicaz", aralik: [0, 1, 4, 5, 7, 8, 10] },
  };
  const TINILER = {
    oval: { ad: "Kristal kâse", renk: ["#9fd8ff", "#c7b6ff", "#ffffff"] },
    yuvarlak: { ad: "Tibet çanağı", renk: ["#ffcf7a", "#ff9f5a", "#fff1cf"] },
    kare: { ad: "Derin gong", renk: ["#8f7cff", "#4f6bff", "#d9d2ff"] },
    kalp: { ad: "Yumuşak arp", renk: ["#ff9fc8", "#ffcf9f", "#fff0f6"] },
    uzun: { ad: "Rüzgâr flütü", renk: ["#8ff0d0", "#7fc8ff", "#effffa"] },
    elmas: { ad: "Cam çanlar", renk: ["#f3c26b", "#9ff0ff", "#ffffff"] },
  };
  // Akor yürüyüşleri: dizinin derecesi (0 = kök). Her biri 4 ölçü, A ve B bölümü için ikişer kez çalınır.
  const MAJOR_YURUYUS = [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 5, 4], [0, 2, 3, 4], [3, 4, 2, 5]];
  const MINOR_YURUYUS = [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [0, 3, 4, 0], [5, 6, 0, 0], [0, 2, 3, 4]];
  // Melodi stilleri (Murat 2026-10-04): enstrüman, ezgi oktavı, eşlik biçimi, tempo çarpanı ve renk.
  const MELODI_STILLERI = {
    ninni: { ad: "Ninni", aciklama: "piyano, yumuşak arpej", ses: "piyano", ezgiOktav: 4, eslik: "arpej", tempo: 1 },
    kutu: { ad: "Müzik kutusu", aciklama: "tarak sesi, dönen arpej", ses: "kutu", ezgiOktav: 5, eslik: "kutu", tempo: 1.12, kesik: true },
    gece: { ad: "Gece piyanosu", aciklama: "yedili akorlar, seyrek ezgi", ses: "piyano", ezgiOktav: 4, eslik: "blok", tempo: 0.82, yedili: true, seyrek: true },
    arp: { ad: "Arp masalı", aciklama: "tel çekme, akor yayılımı", ses: "arp", ezgiOktav: 4, eslik: "strum", tempo: 0.95 },
    yagmur: { ad: "Yağmur damlası", aciklama: "beşli dizi, damla notalar", ses: "piyano", ezgiOktav: 5, eslik: "seyrek", tempo: 0.9, pentatonik: true, damla: true, kesik: true },
  };
  // Meditasyon tipleri: tını (çan/kâse sesi), drone parlaklığı ve çan sıklığı çarpanı.
  const MEDITASYON_TIPLERI = {
    kase: { ad: "Kristal kâse", tini: "oval", drone: 1, aralik: 1 },
    canak: { ad: "Tibet çanağı", tini: "yuvarlak", drone: 0.8, aralik: 1.15 },
    gong: { ad: "Derin gong", tini: "kare", drone: 0.55, aralik: 1.6 },
    flut: { ad: "Rüzgâr flütü", tini: "uzun", drone: 1.2, aralik: 0.85 },
    cam: { ad: "Cam çanlar", tini: "elmas", drone: 1.4, aralik: 0.7 },
  };
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const NOTA_ADLARI = ["Do", "Do♯", "Re", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"];
  const KOKLER = [2, 4, 5, 7, 9, 10, 0]; // Re, Mi, Fa, Sol, La, Si♭, Do
  const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

  // Tohumlu rastgele (mulberry32) ve ölçümlerden tohum.
  function tohumla(metin) {
    let h = 1779033703 ^ metin.length;
    for (let i = 0; i < metin.length; i += 1) { h = Math.imul(h ^ metin.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return h >>> 0;
  }
  function rastgele(tohum) {
    let a = tohum >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const sinirla = (v, a, b) => Math.min(b, Math.max(a, v));

  // Yüzün müzik tarifi: aynı ölçümler her zaman aynı tarifi verir.
  function tarif(o) {
    const tohum = tohumla([o.oran, o.altinUyum, o.sekil, o.alinCene, o.elmacikCene, o.gozAraligi].join("|"));
    const r = rastgele(tohum);
    const kokSinif = KOKLER[sinirla(Math.floor(((o.oran - 1.05) / 0.6) * KOKLER.length), 0, KOKLER.length - 1)];
    const uyum = o.altinUyum ?? 60;
    const makam = uyum >= 85 ? "huzur" : uyum >= 70 ? "ruya" : uyum >= 55 ? "derin" : uyum >= 40 ? "gizem" : "hicaz";
    const tini = TINILER[o.sekil] ? o.sekil : "oval";
    const aralik = sinirla(3.2 + ((o.alinCene ?? 1.05) - 0.85) * 12, 3.2, 9.5); // çanlar arası saniye
    const parlaklik = sinirla(((o.elmacikCene ?? 1.1) - 0.9) * 2.5, 0, 1);
    const nefes = sinirla(8 + ((o.gozAraligi ?? 1) - 0.8) * 10, 8, 13); // görsel nefes ritmi (sn)
    const derece = MAKAMLAR[makam].aralik.length;
    // Yüzün motifi: makam derecelerinde 6 notalık, adım adım ilerleyen kısa bir ezgi.
    let d = Math.floor(r() * derece);
    const motif = Array.from({ length: 6 }, () => { d = sinirla(d + [-2, -1, 1, 2, 0][Math.floor(r() * 5)], 0, derece * 2 - 1); return d; });
    // Melodi modu: tonalite, ölçü, tempo ve iki akor yürüyüşü (A ve B bölümü).
    const r2 = rastgele(tohum ^ 0x51ed27);
    const majör = makam === "huzur" || makam === "ruya" || (makam === "derin" && r2() < 0.3);
    const yuruyusler = majör ? MAJOR_YURUYUS : MINOR_YURUYUS;
    const yA = Math.floor(r2() * yuruyusler.length);
    let yB = Math.floor(r2() * yuruyusler.length);
    if (yB === yA) yB = (yB + 1) % yuruyusler.length;
    return {
      tohum, kokSinif, kokAdi: NOTA_ADLARI[kokSinif], makam, makamAdi: MAKAMLAR[makam].ad, tini, tiniAdi: TINILER[tini].ad,
      renk: TINILER[tini].renk, aralik, parlaklik, nefes, motif, tempo: Math.round(60 / (aralik / 2)),
      melodi: {
        majör,
        olcu: o.sekil === "kalp" || o.sekil === "yuvarlak" ? 3 : 4,
        bpm: Math.round(60 + r2() * 16),
        A: yuruyusler[yA],
        B: yuruyusler[yB],
        adi: `${NOTA_ADLARI[kokSinif]} ${majör ? "majör" : "minör"}`,
      },
    };
  }

  // Piyano örnekleri (Salamander Grand Piano, CC-BY 3.0, Alexander Holm): Do2–Do6 arası her 3 yarım seste bir.
  const PIYANO = [];
  ["C", "Ds", "Fs", "A"].forEach((n, i) => { for (let o = 2; o <= 5; o += 1) PIYANO.push({ ad: `${n}${o}`, midi: 12 * (o + 1) + i * 3 }); });
  PIYANO.push({ ad: "C6", midi: 84 });
  PIYANO.sort((a, b) => a.midi - b.midi);
  let piyanoYukleniyor = null;
  const piyanoTamponlari = new Map();
  function piyanoYukle(ctx) {
    if (!piyanoYukleniyor) {
      piyanoYukleniyor = Promise.all(PIYANO.map(async (p) => {
        const r = await fetch(`/muzik/piyano/${p.ad}.mp3?v=1`);
        const veri = await r.arrayBuffer();
        const tampon = await new Promise((ok, red) => ctx.decodeAudioData(veri, ok, red));
        piyanoTamponlari.set(p.midi, tampon);
      }));
      piyanoYukleniyor.catch(() => { piyanoYukleniyor = null; });
    }
    return piyanoYukleniyor;
  }

  function motor(t, { notaOlunca, mod = "meditasyon", stil = "ninni", medTip = null } = {}) {
    const mt = MEDITASYON_TIPLERI[medTip];
    if (mt) t = { ...t, tini: mt.tini, aralik: t.aralik * mt.aralik, parlaklik: Math.min(1, t.parlaklik * mt.drone) };
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const r = rastgele(t.tohum ^ 0x9e3779b9);
    const olcek = MAKAMLAR[t.makam].aralik;
    const midi = (derece, oktav) => 12 * (oktav + 1) + t.kokSinif + olcek[((derece % olcek.length) + olcek.length) % olcek.length] + 12 * Math.floor(derece / olcek.length);

    // Çıkış: sıkıştırıcı → (akış → <audio>) ya da doğrudan hoparlör.
    const ana = ctx.createGain();
    ana.gain.value = 0;
    const sikistir = ctx.createDynamicsCompressor();
    sikistir.threshold.value = -18;
    sikistir.ratio.value = 3;
    ana.connect(sikistir);
    let audioEl = null;
    if (ctx.createMediaStreamDestination) {
      const akis = ctx.createMediaStreamDestination();
      sikistir.connect(akis);
      audioEl = new Audio();
      audioEl.srcObject = akis.stream;
      audioEl.setAttribute("playsinline", "");
    } else {
      sikistir.connect(ctx.destination);
    }

    // Yankı: sentetik oda (5 sn sönümlenen stereo gürültü).
    const yanki = ctx.createConvolver();
    const ir = ctx.createBuffer(2, ctx.sampleRate * 5, ctx.sampleRate);
    for (let k = 0; k < 2; k += 1) {
      const v = ir.getChannelData(k);
      for (let i = 0; i < v.length; i += 1) v[i] = (Math.random() * 2 - 1) * (1 - i / v.length) ** 3;
    }
    yanki.buffer = ir;
    const islak = ctx.createGain();
    islak.gain.value = 0.55;
    yanki.connect(islak).connect(ana);
    const kuru = ctx.createGain();
    kuru.gain.value = 0.7;
    kuru.connect(ana);
    const gonder = (dugum) => { dugum.connect(kuru); dugum.connect(yanki); };

    const durdurulacak = [];

    // 1) Drone: kök + beşli + oktav, hafif akortsuz; yavaş açılıp kapanan süzgeç.
    const droneSuz = ctx.createBiquadFilter();
    droneSuz.type = "lowpass";
    droneSuz.frequency.value = 380 + 420 * t.parlaklik;
    droneSuz.Q.value = 0.7;
    const droneSes = ctx.createGain();
    droneSes.gain.value = mod === "melodi" ? 0.015 : 0.11; // melodide yalnız çok hafif bir zemin
    droneSuz.connect(droneSes);
    gonder(droneSes);
    const kokHz = hz(12 * 3 + t.kokSinif);
    [[kokHz, "sine", 0], [kokHz * 1.5, "sine", 3], [kokHz * 2, "triangle", -4], [kokHz, "triangle", 5]].forEach(([f, tip, det]) => {
      const o = ctx.createOscillator();
      o.type = tip;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(droneSuz);
      o.start();
      durdurulacak.push(o);
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / (t.nefes * 2.3);
    const lfoGuc = ctx.createGain();
    lfoGuc.gain.value = 260;
    lfo.connect(lfoGuc).connect(droneSuz.frequency);
    lfo.start();
    durdurulacak.push(lfo);

    // 2) Pad akorları ve 3) çanlar: önceden (90 sn ileriye) planlanır.
    const padSes = ctx.createGain();
    padSes.gain.value = 0.9;
    gonder(padSes);
    function pad(zaman, derece) {
      [0, 2, 4].forEach((ek, i) => {
        const f = hz(midi(derece + ek, 3));
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, zaman);
        g.gain.linearRampToValueAtTime(0.028, zaman + 6);
        g.gain.setValueAtTime(0.028, zaman + 14);
        g.gain.linearRampToValueAtTime(0, zaman + 21);
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (p) p.pan.value = (i - 1) * 0.5;
        [0, 7].forEach((det) => {
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.value = f;
          o.detune.value = det;
          o.connect(g);
          o.start(zaman);
          o.stop(zaman + 21.5);
        });
        (p ? g.connect(p) : g).connect(padSes);
      });
    }

    const canSes = ctx.createGain();
    canSes.gain.value = 0.85;
    gonder(canSes);
    function can(zaman, f, guc) {
      const tini = t.tini;
      const cikis = ctx.createGain();
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.value = r() * 1.2 - 0.6; cikis.connect(p).connect(canSes); } else cikis.connect(canSes);
      const kismi = (oran, genlik, sure, tip = "sine", det = 0) => {
        const o = ctx.createOscillator();
        o.type = tip;
        o.frequency.value = f * oran;
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, zaman);
        g.gain.exponentialRampToValueAtTime(genlik * guc, zaman + (tini === "uzun" ? 0.8 : 0.015));
        g.gain.exponentialRampToValueAtTime(0.0001, zaman + sure);
        o.connect(g).connect(cikis);
        o.start(zaman);
        o.stop(zaman + sure + 0.1);
      };
      if (tini === "oval") { kismi(1, 0.09, 7); kismi(1, 0.05, 7, "sine", 4); kismi(2.32, 0.03, 4); kismi(4.25, 0.012, 2.5); }
      else if (tini === "yuvarlak") { kismi(1, 0.1, 9); kismi(1, 0.06, 9, "sine", 5); kismi(2.76, 0.035, 6); kismi(5.4, 0.015, 3.5); kismi(8.93, 0.006, 2); }
      else if (tini === "kare") { kismi(0.5, 0.12, 12); kismi(1, 0.05, 9); kismi(1.47, 0.03, 7, "sine", 6); kismi(2.09, 0.015, 5); }
      else if (tini === "kalp") { kismi(1, 0.08, 2.2, "triangle"); kismi(2, 0.025, 1.4); kismi(3, 0.01, 0.9); }
      else if (tini === "uzun") { kismi(1, 0.07, 3.2); kismi(2, 0.012, 2.4); kismi(1, 0.03, 3.2, "sine", 9); }
      else { kismi(1, 0.07, 4.5); kismi(3.5, 0.03, 2); kismi(6.1, 0.012, 1.2); kismi(1, 0.04, 4.5, "sine", -6); }
      if (notaOlunca) {
        const gecikme = Math.max(0, (zaman - ctx.currentTime) * 1000);
        setTimeout(() => notaOlunca({ f, guc }), gecikme);
      }
    }

    // --- Melodi modu: 5 stil; yüz tonaliteyi, tempoyu, akorları ve imza ezgisini belirler ---
    const m = t.melodi;
    const st = MELODI_STILLERI[stil] || MELODI_STILLERI.ninni;
    const dizi = m.majör ? MAJOR : MINOR;
    const pentaton = m.majör ? [0, 1, 2, 4, 5] : [0, 2, 3, 4, 6]; // yağmur damlası: beşli dizi dereceleri
    const piyanoSes = ctx.createGain();
    piyanoSes.gain.value = 4.4; // piyano örnekleri kısık kayıtlı; sıkıştırıcı tepeleri tutar
    gonder(piyanoSes);
    const sentezSes = ctx.createGain();
    sentezSes.gain.value = 1.6;
    gonder(sentezSes);
    // Derece → MIDI (dizi içinde, oktav aşımıyla).
    const dmidi = (derece, oktav) => 12 * (oktav + 1) + t.kokSinif + dizi[((derece % 7) + 7) % 7] + 12 * Math.floor(derece / 7);
    const bildir = (zaman, midiNo, guc) => {
      if (!notaOlunca || guc < 0.25) return;
      const gecikme = Math.max(0, (zaman - ctx.currentTime) * 1000);
      setTimeout(() => notaOlunca({ f: hz(midiNo), guc: Math.min(1, guc * 1.6) }), gecikme);
    };
    function piyanoNota(zaman, midiNo, guc, sure) {
      let en = PIYANO[0];
      PIYANO.forEach((p) => { if (Math.abs(p.midi - midiNo) < Math.abs(en.midi - midiNo)) en = p; });
      const tampon = piyanoTamponlari.get(en.midi);
      if (!tampon) return;
      const k = ctx.createBufferSource();
      k.buffer = tampon;
      k.playbackRate.value = 2 ** ((midiNo - en.midi) / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(guc, zaman);
      g.gain.setTargetAtTime(0, zaman + sure, 0.35); // pedal bırakılınca sönüm
      k.connect(g).connect(piyanoSes);
      k.start(zaman);
      k.stop(zaman + sure + 2.5);
      bildir(zaman, midiNo, guc);
    }
    // Müzik kutusu: kısa, metalik tarak sesi (temel + uyumsuz üst kısmiler, hızlı sönüm).
    function kutuNota(zaman, midiNo, guc) {
      const f = hz(midiNo);
      [[1, 0.16, 1.6], [3.01, 0.05, 0.7], [5.03, 0.025, 0.4], [2, 0.04, 1.1]].forEach(([oran, gen, sure]) => {
        const o = ctx.createOscillator();
        o.frequency.value = f * oran;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, zaman);
        g.gain.exponentialRampToValueAtTime(gen * guc * 2, zaman + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, zaman + sure);
        o.connect(g).connect(sentezSes);
        o.start(zaman);
        o.stop(zaman + sure + 0.05);
      });
      bildir(zaman, midiNo, guc);
    }
    // Arp: tel çekme sesi (üçgen + sinüs, parlak başlayıp kararan süzgeç).
    function arpNota(zaman, midiNo, guc, sure = 2.6) {
      const f = hz(midiNo);
      const suz = ctx.createBiquadFilter();
      suz.type = "lowpass";
      suz.frequency.setValueAtTime(f * 8, zaman);
      suz.frequency.exponentialRampToValueAtTime(f * 1.5, zaman + 0.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, zaman);
      g.gain.exponentialRampToValueAtTime(0.22 * guc, zaman + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, zaman + sure);
      [["triangle", 1, 0], ["sine", 2, 0.5], ["sine", 1, 4]].forEach(([tip, oran, det]) => {
        const o = ctx.createOscillator();
        o.type = tip;
        o.frequency.value = f * oran;
        o.detune.value = det;
        o.connect(suz);
        o.start(zaman);
        o.stop(zaman + sure + 0.05);
      });
      suz.connect(g).connect(sentezSes);
      bildir(zaman, midiNo, guc);
    }
    const cal = (zaman, midiNo, guc, sure, ses = st.ses) => {
      if (ses === "kutu") kutuNota(zaman, midiNo, guc);
      else if (ses === "arp") arpNota(zaman, midiNo, guc);
      else piyanoNota(zaman, midiNo, guc, sure);
    };

    const vurus = 60 / (m.bpm * st.tempo);
    const RITIM = st.seyrek
      ? (m.olcu === 3 ? [[3], [2, 1], [1, 2]] : [[4], [3, 1], [2, 2], [1, 3]])
      : m.olcu === 3
        ? [[2, 1], [1, 1, 1], [3], [1.5, 0.5, 1], [1, 2]]
        : [[2, 1, 1], [1, 1, 2], [1, 1, 1, 1], [3, 1], [1.5, 0.5, 2], [2, 2], [4]];
    const akorNotalari = (kokDerece) => (st.yedili ? [kokDerece, kokDerece + 2, kokDerece + 4, kokDerece + 6] : [kokDerece, kokDerece + 2, kokDerece + 4]);
    const pentatonaOturt = (d) => {
      if (!st.pentatonik) return d;
      const ic = ((d % 7) + 7) % 7;
      const en = pentaton.reduce((a, b) => (Math.abs(b - ic) < Math.abs(a - ic) ? b : a));
      return d - ic + en;
    };
    let onceki = 2 + 7; // ezgi oktav 5 civarında başlar (derece, 7 = bir oktav)
    function ezgiOlcusu(zaman, kokDerece, rr, son) {
      const ritim = son ? (m.olcu === 3 ? [3] : [4]) : RITIM[Math.floor(rr() * RITIM.length)];
      let z = zaman;
      ritim.forEach((sure, i) => {
        let hedef;
        const akor = akorNotalari(kokDerece).slice(0, 3).map((d) => d + 7);
        if (i === 0 || son) {
          // Kuvvetli vuruş: önceki notaya en yakın akor notası
          hedef = [...akor, ...akor.map((d) => d + 7), ...akor.map((d) => d - 7)].reduce((a, b) => (Math.abs(b - onceki) < Math.abs(a - onceki) ? b : a));
          if (son) hedef = kokDerece + 7 + (onceki > kokDerece + 10 ? 7 : 0);
        } else {
          // Zayıf vuruş: adım adım (±1, bazen ±2)
          const adim = [-1, 1, 1, -1, 2, -2][Math.floor(rr() * 6)];
          hedef = onceki + adim;
        }
        hedef = pentatonaOturt(Math.min(13, Math.max(4, hedef))); // ezgi aralığı ~ bir buçuk oktav
        onceki = hedef;
        const insan = (rr() - 0.5) * 0.02;
        const guc = (i === 0 ? 0.5 : 0.38) * (0.9 + rr() * 0.2);
        if (!(st.seyrek && i > 0 && rr() < 0.25)) cal(z + insan, dmidi(hedef, st.ezgiOktav), guc, sure * vurus * (st.kesik ? 0.5 : 0.95));
        // Yağmur damlası: ara sıra yüksekten tek, kısa damlalar
        if (st.damla && rr() < 0.35) cal(z + vurus * (0.5 + rr() * 0.4), dmidi(pentatonaOturt(hedef + 7 + Math.floor(rr() * 3)), st.ezgiOktav), 0.22, vurus * 0.3);
        z += sure * vurus;
      });
    }
    function eslikOlcusu(zaman, kokDerece, rr) {
      const olcuSure = m.olcu * vurus;
      const akor = akorNotalari(kokDerece);
      if (st.eslik === "arpej") {
        // Sol el: kökte bas, ardından akor arpeji (sekizlikler), yumuşak.
        cal(zaman, dmidi(kokDerece, 2), 0.32, olcuSure);
        const arpej = [kokDerece, kokDerece + 4, kokDerece + 7, kokDerece + 9, kokDerece + 7, kokDerece + 4];
        for (let i = 1; i < m.olcu * 2; i += 1) cal(zaman + i * vurus * 0.5 + (rr() - 0.5) * 0.015, dmidi(arpej[i % arpej.length], 3), 0.17 + rr() * 0.05, vurus * 0.9);
      } else if (st.eslik === "kutu") {
        // Müzik kutusu: bas yok; ince, sürekli dönen arpej (ezgiyle aynı tını).
        const arpej = [kokDerece, kokDerece + 2, kokDerece + 4, kokDerece + 7];
        for (let i = 0; i < m.olcu * 2; i += 1) cal(zaman + i * vurus * 0.5, dmidi(arpej[i % arpej.length], 4), 0.13 + rr() * 0.04, vurus * 0.5);
      } else if (st.eslik === "blok") {
        // Gece piyanosu: derin bas + yedili akor bloğu, ölçü ortasında yumuşak tekrar.
        cal(zaman, dmidi(kokDerece, 2), 0.3, olcuSure);
        akor.forEach((d, i) => cal(zaman + i * 0.025, dmidi(d, 3), 0.15, olcuSure * 0.95));
        akor.slice(1).forEach((d, i) => cal(zaman + olcuSure * (m.olcu === 3 ? 2 / 3 : 0.5) + i * 0.02, dmidi(d, 3), 0.1, olcuSure * 0.45));
      } else if (st.eslik === "strum") {
        // Arp: iki oktava yayılan, aşağıdan yukarı tellerin üzerinden geçen akor (ölçüde iki kez).
        [0, m.olcu === 3 ? 2 : 2].forEach((vurusNo, k) => {
          [0, 2, 4, 7, 9, 11].forEach((ek, i) => cal(zaman + vurusNo * vurus + i * 0.065 + k * 0.01, dmidi(kokDerece + ek, 3), 0.2 - i * 0.015, vurus * 2));
        });
      } else {
        // Seyrek (yağmur): ölçü başında derin bas, ara sıra yüksekte bir akor notası.
        cal(zaman, dmidi(kokDerece, 2), 0.28, olcuSure);
        if (rr() < 0.6) cal(zaman + vurus * (m.olcu - 1), dmidi(pentatonaOturt(akor[1 + Math.floor(rr() * 2)]), 4), 0.16, vurus);
      }
    }
    // Şarkı: A A′ B A, her döngüde biraz farklı (döngü numarası tohuma katılır).
    let siradakiOlcu = 0;
    let olcuNo = 0;
    function melodiPlanla() {
      const ufuk = ctx.currentTime + 90;
      const olcuSure = m.olcu * vurus;
      while (siradakiOlcu < ufuk) {
        const dongu = Math.floor(olcuNo / 32);
        const yerel = olcuNo % 32; // 4 bölüm × 8 ölçü
        const bolum = Math.floor(yerel / 8); // 0:A 1:A′ 2:B 3:A
        const ici = yerel % 8;
        const yuruyus = bolum === 2 ? m.B : m.A;
        const kok = yuruyus[ici % 4];
        // Ana motif: A bölümlerinin ilk iki ölçüsü hep aynı tohumla (yüzün imzası); geri kalanı döngüyle değişir.
        const imza = bolum !== 2 && ici < 2;
        const rr = rastgele(t.tohum ^ (imza ? ici * 7919 : (dongu * 104729 + yerel * 7919 + 13)));
        if (imza && ici === 0) onceki = 2 + 7;
        ezgiOlcusu(siradakiOlcu, kok, rr, ici === 7);
        eslikOlcusu(siradakiOlcu, kok, rr);
        siradakiOlcu += olcuSure;
        olcuNo += 1;
        // Bölüm sonlarında kısa bir nefes
        if (ici === 7 && bolum === 3) siradakiOlcu += vurus;
      }
    }

    let siradakiPad = 0;
    let siradakiCan = 0;
    let motifSira = 0;
    let padDerece = 0;
    function planla() {
      if (mod === "melodi") { melodiPlanla(); return; }
      const ufuk = ctx.currentTime + 90;
      while (siradakiPad < ufuk) {
        pad(siradakiPad, padDerece);
        padDerece = [0, 3, 4, 2, 5, 1][Math.floor(r() * 6)];
        siradakiPad += 15 + r() * 6;
      }
      while (siradakiCan < ufuk) {
        // Motif notaları çoğunlukla sırayla, ara sıra bir derece kayarak; ara sıra iki notalık küçük bir yanıt.
        const derece = t.motif[motifSira % t.motif.length] + (r() < 0.2 ? (r() < 0.5 ? -1 : 1) : 0);
        motifSira += 1;
        const oktav = t.tini === "kare" ? 3 : 4;
        can(siradakiCan, hz(midi(derece, oktav)), 0.6 + r() * 0.4);
        if (r() < 0.22) can(siradakiCan + t.aralik * 0.38, hz(midi(derece + 2, oktav)), 0.45);
        siradakiCan += t.aralik * (0.75 + r() * 0.6);
      }
    }

    // 4) Okyanus: pembe gürültü, dalga gibi kabarıp inen.
    const okyanusSes = ctx.createGain();
    okyanusSes.gain.value = 0;
    okyanusSes.connect(ana);
    {
      const uzunluk = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(2, uzunluk, ctx.sampleRate);
      for (let k = 0; k < 2; k += 1) {
        const v = buf.getChannelData(k);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < uzunluk; i += 1) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + w * 0.099;
          b1 = 0.963 * b1 + w * 0.2965;
          b2 = 0.57 * b2 + w * 1.0526;
          v[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
        }
      }
      const kaynak = ctx.createBufferSource();
      kaynak.buffer = buf;
      kaynak.loop = true;
      const suz = ctx.createBiquadFilter();
      suz.type = "lowpass";
      suz.frequency.value = 850;
      const dalga = ctx.createGain();
      dalga.gain.value = 0.55;
      const dalgaLfo = ctx.createOscillator();
      dalgaLfo.frequency.value = 1 / 9.5;
      const dalgaGuc = ctx.createGain();
      dalgaGuc.gain.value = 0.42;
      dalgaLfo.connect(dalgaGuc).connect(dalga.gain);
      kaynak.connect(suz).connect(dalga).connect(okyanusSes);
      kaynak.start();
      dalgaLfo.start();
      durdurulacak.push(kaynak, dalgaLfo);
    }

    // 5) Binaural (kulaklıkla): sol ve sağ kulağa 2,5 Hz farklı iki ton → delta bandı.
    const binauralSes = ctx.createGain();
    binauralSes.gain.value = 0;
    binauralSes.connect(ana);
    if (ctx.createChannelMerger) {
      const birlestir = ctx.createChannelMerger(2);
      const taban = hz(12 * 3 + t.kokSinif) * 2;
      [[taban, 0], [taban + 2.5, 1]].forEach(([f, kanal]) => {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.05;
        o.connect(g).connect(birlestir, 0, kanal);
        o.start();
        durdurulacak.push(o);
      });
      birlestir.connect(binauralSes);
    }

    let planlayici = null;
    let ses = 0.8;
    let calisiyor = false;
    let bitis = null;
    return {
      ctx,
      async baslat() {
        await ctx.resume();
        if (audioEl) {
          try { await audioEl.play(); } catch { sikistir.disconnect(); sikistir.connect(ctx.destination); audioEl = null; }
        }
        if (mod === "melodi") await piyanoYukle(ctx);
        if (!siradakiPad) { siradakiPad = ctx.currentTime + 0.5; siradakiCan = ctx.currentTime + 2; }
        if (!siradakiOlcu) siradakiOlcu = ctx.currentTime + 0.8;
        planla();
        clearInterval(planlayici);
        planlayici = setInterval(planla, 5000);
        ana.gain.cancelScheduledValues(ctx.currentTime);
        ana.gain.setValueAtTime(ana.gain.value, ctx.currentTime);
        ana.gain.linearRampToValueAtTime(ses, ctx.currentTime + 4);
        calisiyor = true;
      },
      duraklat() {
        calisiyor = false;
        ana.gain.cancelScheduledValues(ctx.currentTime);
        ana.gain.setValueAtTime(ana.gain.value, ctx.currentTime);
        ana.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        clearTimeout(bitis);
        setTimeout(() => { if (!calisiyor) { ctx.suspend(); audioEl?.pause(); } }, 1700);
      },
      sesDuzeyi(v) {
        ses = v;
        if (calisiyor) ana.gain.setTargetAtTime(v, ctx.currentTime, 0.3);
      },
      okyanus(acik) { okyanusSes.gain.setTargetAtTime(acik ? 0.9 : 0, ctx.currentTime, 1.2); },
      binaural(acik) { binauralSes.gain.setTargetAtTime(acik ? 1 : 0, ctx.currentTime, 1.5); },
      // Uyku zamanlayıcısı: süre dolunca 60 sn'de yavaşça kısılıp durur.
      zamanlayici(dakika, bitince) {
        clearTimeout(bitis);
        if (!dakika) return;
        bitis = setTimeout(() => {
          ana.gain.cancelScheduledValues(ctx.currentTime);
          ana.gain.setValueAtTime(ana.gain.value, ctx.currentTime);
          ana.gain.linearRampToValueAtTime(0, ctx.currentTime + 60);
          setTimeout(() => { calisiyor = false; ctx.suspend(); audioEl?.pause(); bitince?.(); }, 61000);
        }, Math.max(0, dakika * 60000 - 60000));
      },
      kapat() {
        clearInterval(planlayici);
        clearTimeout(bitis);
        durdurulacak.forEach((o) => { try { o.stop(); } catch { /* zaten durdu */ } });
        audioEl?.pause();
        ctx.close();
      },
      get calisiyor() { return calisiyor; },
    };
  }

  // Yüzün kendi meditasyon tipi (şekline göre); listede yoksa kristal kâse.
  const yuzunMeditasyonu = (t) => Object.keys(MEDITASYON_TIPLERI).find((k) => MEDITASYON_TIPLERI[k].tini === t.tini) || "kase";
  return { tarif, motor, MAKAMLAR, TINILER, MELODI_STILLERI, MEDITASYON_TIPLERI, yuzunMeditasyonu };
})();
