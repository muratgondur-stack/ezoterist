// Yüz okuma için biyometrik yüz haritası: MediaPipe Face Landmarker tarayıcıda (fotoğraf sunucuya ölçüm için
// gönderilmez) 468 yüz noktasını bulur; tuval üzerinde tarama çizgisi, noktalar, yüz ağı, hatlar ve ölçü çizgileri
// sırayla canlandırılır. Ölçümler (yüz oranı, altın orana yakınlık, alın/çene/elmacık genişlikleri) okumaya da gönderilir.
window.YuzHaritasi = (() => {
  const VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1";
  const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
  const ALTIN = 1.618;
  let hazirlik = null;
  let FL = null;

  function yukle() {
    if (!hazirlik) {
      hazirlik = (async () => {
        const mod = await import(`${VISION}/vision_bundle.mjs`);
        FL = mod.FaceLandmarker;
        const dosyalar = await mod.FilesetResolver.forVisionTasks(`${VISION}/wasm`);
        try {
          return await FL.createFromOptions(dosyalar, { baseOptions: { modelAssetPath: MODEL, delegate: "GPU" }, runningMode: "IMAGE", numFaces: 2 });
        } catch {
          return FL.createFromOptions(dosyalar, { baseOptions: { modelAssetPath: MODEL, delegate: "CPU" }, runningMode: "IMAGE", numFaces: 2 });
        }
      })();
      hazirlik.catch(() => { hazirlik = null; });
    }
    return hazirlik;
  }

  const resimYukle = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Fotoğraf açılamadı."));
    img.src = src;
  });

  const uzaklik = (a, b, w, h) => Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);

  function olc(n, w, h) {
    const yukseklik = uzaklik(n[10], n[152], w, h) * 1.12; // saç çizgisi alın noktasının biraz üstünde
    const elmacik = uzaklik(n[234], n[454], w, h);
    const alin = uzaklik(n[54], n[284], w, h);
    const cene = uzaklik(n[172], n[397], w, h);
    const oran = yukseklik / elmacik;
    const gozAraligi = uzaklik(n[133], n[362], w, h) / uzaklik(n[33], n[133], w, h);
    let sekil = "oval";
    if (oran > 1.55) sekil = "uzun";
    else if (oran < 1.25) sekil = cene / elmacik > 0.88 ? "kare" : "yuvarlak";
    else if (alin / cene > 1.22) sekil = "kalp";
    else if (elmacik / alin > 1.18 && elmacik / cene > 1.18) sekil = "elmas";
    const altinUyum = Math.max(0, Math.round(100 - (Math.abs(oran - ALTIN) / ALTIN) * 100));
    return {
      oran: +oran.toFixed(2),
      altinUyum,
      sekil,
      alinCene: +(alin / cene).toFixed(2),
      elmacikCene: +(elmacik / cene).toFixed(2),
      gozAraligi: +gozAraligi.toFixed(2),
    };
  }

  // Fotoğrafı (dataURL ya da adres) çözümler: { img, yuzSayisi, noktalar, olcumler }.
  async function analiz(src) {
    const [model, img] = await Promise.all([yukle(), resimYukle(src)]);
    const sonuc = model.detect(img);
    const yuzler = sonuc.faceLandmarks || [];
    return {
      img,
      yuzSayisi: yuzler.length,
      noktalar: yuzler[0] || null,
      olcumler: yuzler[0] ? olc(yuzler[0], img.naturalWidth, img.naturalHeight) : null,
    };
  }

  const kolay = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  // Tuvale haritayı çizer. animasyon=true ise ~5,5 sn'lik gösteri, sonra son hâl.
  function ciz(canvas, { img, noktalar }, { animasyon = true } = {}) {
    // Tuval yüze yakınlaştırılır: yüz noktalarının kutusu, her yana pay bırakılarak kırpılır.
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const xs = noktalar.map((n) => n.x * iw);
    const ys = noktalar.map((n) => n.y * ih);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const boy = Math.max(x1 - x0, y1 - y0) * 1.45;
    const kx = Math.max(0, Math.min(iw - Math.min(iw, boy), (x0 + x1) / 2 - boy / 2));
    const ky = Math.max(0, Math.min(ih - Math.min(ih, boy * 1.1), (y0 + y1) / 2 - boy * 0.58));
    const kw = Math.min(iw - kx, boy);
    const kh = Math.min(ih - ky, boy * 1.1);
    const genislik = Math.min(640, Math.max(320, kw));
    canvas.width = Math.round(genislik);
    canvas.height = Math.round(genislik * (kh / kw));
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const p = (i) => [((noktalar[i].x * iw - kx) / kw) * W, ((noktalar[i].y * ih - ky) / kh) * H];
    const sirali = noktalar.map((n, i) => i).sort((a, b) => noktalar[a].y - noktalar[b].y);
    const hatlar = [
      ...FL.FACE_LANDMARKS_FACE_OVAL, ...FL.FACE_LANDMARKS_LEFT_EYEBROW, ...FL.FACE_LANDMARKS_RIGHT_EYEBROW,
      ...FL.FACE_LANDMARKS_LEFT_EYE, ...FL.FACE_LANDMARKS_RIGHT_EYE, ...FL.FACE_LANDMARKS_LIPS,
      ...FL.FACE_LANDMARKS_LEFT_IRIS, ...FL.FACE_LANDMARKS_RIGHT_IRIS,
    ];
    const ag = FL.FACE_LANDMARKS_TESSELATION;
    const SURE = animasyon ? 5600 : 0;

    function cizgi(a, b, renk, kalinlik, alfa = 1) {
      ctx.globalAlpha = alfa;
      ctx.strokeStyle = renk;
      ctx.lineWidth = kalinlik;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function etiket(metin, x, y) {
      ctx.font = `700 ${Math.max(11, Math.round(W / 42))}px Manrope, sans-serif`;
      const w = ctx.measureText(metin).width + 12;
      ctx.fillStyle = "rgba(7, 9, 20, 0.8)";
      ctx.fillRect(x - w / 2, y - 11, w, 22);
      ctx.fillStyle = "#f6dca0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(metin, x, y);
    }

    function kare(gecen) {
      const t = SURE ? gecen / SURE : 1;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#05060f";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.28;
      ctx.drawImage(img, kx, ky, kw, kh, 0, 0, W, H);
      ctx.globalAlpha = 1;
      // Izgara zemin
      ctx.strokeStyle = "rgba(90, 200, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 24) cizgi([x, 0], [x, H], "rgba(90, 200, 255, 0.06)", 1);
      for (let y = 0; y < H; y += 24) cizgi([0, y], [W, y], "rgba(90, 200, 255, 0.06)", 1);

      // 1) Tarama çizgisi (0–0.22)
      const tarama = kolay(t / 0.22);
      if (t < 0.3) {
        const y = tarama * H;
        const grad = ctx.createLinearGradient(0, y - 40, 0, y + 4);
        grad.addColorStop(0, "rgba(90, 220, 255, 0)");
        grad.addColorStop(1, "rgba(90, 220, 255, 0.55)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y - 40, W, 44);
        cizgi([0, y], [W, y], "#7fe3ff", 2);
      }
      // 2) Noktalar (0.2–0.48)
      const noktaSayisi = Math.floor(kolay((t - 0.2) / 0.28) * sirali.length);
      ctx.fillStyle = "#7fe3ff";
      for (let k = 0; k < noktaSayisi; k += 1) {
        const [x, y] = p(sirali[k]);
        ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
      }
      // 3) Yüz ağı (0.45–0.68)
      const agAlfa = kolay((t - 0.45) / 0.23) * 0.32;
      if (agAlfa > 0) {
        ctx.globalAlpha = agAlfa;
        ctx.strokeStyle = "#5fd0ff";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (const c of ag) { ctx.moveTo(...p(c.start)); ctx.lineTo(...p(c.end)); }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // 4) Hatlar altınla (0.66–0.86)
      const hatSayisi = Math.floor(kolay((t - 0.66) / 0.2) * hatlar.length);
      if (hatSayisi > 0) {
        ctx.shadowColor = "rgba(255, 200, 100, 0.9)";
        ctx.shadowBlur = 8;
        ctx.strokeStyle = "#f3c26b";
        ctx.lineWidth = Math.max(1.4, W / 360);
        ctx.beginPath();
        for (let k = 0; k < hatSayisi; k += 1) { ctx.moveTo(...p(hatlar[k].start)); ctx.lineTo(...p(hatlar[k].end)); }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // 5) Ölçü çizgileri ve etiketler (0.84–1)
      const olcuAlfa = kolay((t - 0.84) / 0.16);
      if (olcuAlfa > 0) {
        const [ux, uy] = p(10);
        const [cx, cy] = p(152);
        const [lx, ly] = p(234);
        const [rx, ry] = p(454);
        ctx.setLineDash([6, 5]);
        cizgi([ux, uy - (cy - uy) * 0.12], [cx, cy], "#ff9a3c", 1.6, olcuAlfa);
        cizgi([lx, ly], [rx, ry], "#ff9a3c", 1.6, olcuAlfa);
        cizgi(p(54), p(284), "rgba(255, 154, 60, 0.7)", 1.2, olcuAlfa);
        cizgi(p(172), p(397), "rgba(255, 154, 60, 0.7)", 1.2, olcuAlfa);
        ctx.setLineDash([]);
        ctx.globalAlpha = olcuAlfa;
        etiket("YÜKSEKLİK", ux, uy - (cy - uy) * 0.16);
        etiket("ELMACIK", (lx + rx) / 2, Math.min(ly, ry) - 14);
        ctx.globalAlpha = 1;
      }
      // Köşe çerçeveleri (biyometrik tarayıcı görünümü)
      const k = Math.min(W, H) * 0.08;
      ctx.strokeStyle = "rgba(243, 194, 107, 0.85)";
      ctx.lineWidth = 2;
      for (const [x, y, dx, dy] of [[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]]) {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * k);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * k, y);
        ctx.stroke();
      }
    }

    if (!SURE) { kare(0); return Promise.resolve(); }
    return new Promise((resolve) => {
      const bas = performance.now();
      const adim = (simdi) => {
        const gecen = simdi - bas;
        kare(Math.min(gecen, SURE));
        if (gecen < SURE) requestAnimationFrame(adim);
        else resolve();
      };
      requestAnimationFrame(adim);
    });
  }

  return { yukle, analiz, ciz };
})();
