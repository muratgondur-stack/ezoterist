// Yüz Müziği ses motoru (Web Audio, dosyasız). Yüz ölçümlerinden bir "tarif" çıkarılır (ana nota, makam, ses rengi,
// çan aralığı, nefes ritmi) ve tohumlu rastgelelikle o yüze özgü, hep aynı ana motiften türeyen sonsuz bir ambiyans çalınır.
// Katmanlar: drone, yavaş pad akorları, çan/kâse melodisi, isteğe bağlı okyanus ve binaural vuruş. Ses <audio> öğesine
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
    return {
      tohum, kokSinif, kokAdi: NOTA_ADLARI[kokSinif], makam, makamAdi: MAKAMLAR[makam].ad, tini, tiniAdi: TINILER[tini].ad,
      renk: TINILER[tini].renk, aralik, parlaklik, nefes, motif, tempo: Math.round(60 / (aralik / 2)),
    };
  }

  function motor(t, { notaOlunca } = {}) {
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
    droneSes.gain.value = 0.11;
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

    let siradakiPad = 0;
    let siradakiCan = 0;
    let motifSira = 0;
    let padDerece = 0;
    function planla() {
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
        if (!siradakiPad) { siradakiPad = ctx.currentTime + 0.5; siradakiCan = ctx.currentTime + 2; }
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

  return { tarif, motor, MAKAMLAR, TINILER };
})();
