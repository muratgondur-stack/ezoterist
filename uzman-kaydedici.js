// Uzman paneli kayıt aracı (Murat 2026-10-04): sesli ve videolu cevap tarayıcıda kaydedilir.
// Videoda arka plan MediaPipe "selfie segmenter" ile silinir; uzman seçtiği Ezoter.ist logolu mekâna
// (uzman/mekan-1..3.jpg) yerleştirilir. Birleşik görüntü tuvalden, ses mikrofondan alınıp MediaRecorder ile kaydedilir.
(() => {
  const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  const MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
  const EN_UZUN_SN = 10 * 60;
  const MEKANLAR = [
    { id: 1, ad: "Mumlu çalışma odası", src: "/uzman/mekan-1.jpg?v=1" },
    { id: 2, ad: "Yıldız gözlemevi", src: "/uzman/mekan-2.jpg?v=1" },
    { id: 3, ad: "Kristal salon", src: "/uzman/mekan-3.jpg?v=1" },
  ];

  const mimeSec = (adaylar) => adaylar.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
  const sure = (sn) => `${String(Math.floor(sn / 60)).padStart(2, "0")}:${String(Math.floor(sn % 60)).padStart(2, "0")}`;
  const resim = (src) => new Promise((tamam, red) => { const r = new Image(); r.onload = () => tamam(r); r.onerror = red; r.src = src; });

  let bolucu = null;
  async function bolucuYukle() {
    if (bolucu) return bolucu;
    const vision = await import(`${MP}/vision_bundle.mjs`);
    const dosyalar = await vision.FilesetResolver.forVisionTasks(`${MP}/wasm`);
    const ayar = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "VIDEO", outputCategoryMask: false, outputConfidenceMasks: true });
    try { bolucu = await vision.ImageSegmenter.createFromOptions(dosyalar, ayar("GPU")); }
    catch { bolucu = await vision.ImageSegmenter.createFromOptions(dosyalar, ayar("CPU")); }
    return bolucu;
  }

  // kutu: içine kaydedici arayüzü kurulacak öğe. tur: "ses" | "video". bitince(blob, mime) kayıt onaylanınca çağrılır.
  function kur(kutu, { tur, bitince, toast }) {
    kutu.replaceChildren();
    kutu.className = `kaydedici kaydedici-${tur}`;
    let akis = null;
    let kaydedici = null;
    let parcalar = [];
    let zamanlayici = null;
    let cizim = null;
    let mekan = MEKANLAR[0];
    let mekanResmi = null;
    let arkaPlanSil = true;
    let sonBlob = null;

    const el = (etiket, ozellik = {}, ...cocuk) => { const e = Object.assign(document.createElement(etiket), ozellik); e.append(...cocuk); return e; };
    const durum = el("p", { className: "kaydedici-durum" });
    const dugmeler = el("div", { className: "kaydedici-dugmeler" });
    const baslat = el("button", { type: "button", className: "btn btn-primary", textContent: tur === "video" ? "🎥 Kamerayı aç" : "🎙️ Mikrofonu aç" });
    const kaydet = el("button", { type: "button", className: "btn btn-primary", textContent: "⏺ Kaydı başlat", hidden: true });
    const durdur = el("button", { type: "button", className: "btn btn-ghost kayit-durdur", textContent: "⏹ Bitir", hidden: true });
    const tekrar = el("button", { type: "button", className: "btn btn-ghost", textContent: "↺ Yeniden kaydet", hidden: true });
    const kullan = el("button", { type: "button", className: "btn btn-primary", textContent: "✓ Bu kaydı kullan", hidden: true });
    dugmeler.append(baslat, kaydet, durdur, tekrar, kullan);

    // Video: mekân seçimi + canlı birleşik önizleme (tuval).
    const tuval = el("canvas", { className: "kaydedici-tuval", width: 1280, height: 720, hidden: true });
    const izle = el(tur === "video" ? "video" : "audio", { className: "kaydedici-izle", controls: true, hidden: true, playsInline: true });
    const kamera = el("video", { muted: true, playsInline: true });
    const secim = el("div", { className: "mekan-secim", hidden: tur !== "video" });
    if (tur === "video") {
      secim.append(...MEKANLAR.map((m) => {
        const b = el("button", { type: "button", className: "mekan" }, el("img", { src: m.src, alt: "", loading: "lazy" }), el("span", { textContent: m.ad }));
        b.setAttribute("aria-pressed", String(m === mekan));
        b.addEventListener("click", async () => {
          mekan = m;
          secim.querySelectorAll(".mekan").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          mekanResmi = await resim(m.src).catch(() => null);
        });
        return b;
      }));
      const sil = el("label", { className: "mekan-sil" }, el("input", { type: "checkbox", checked: true }), " Arka planımı sil, mekâna yerleştir");
      sil.querySelector("input").addEventListener("change", (e) => { arkaPlanSil = e.target.checked; });
      secim.append(sil);
    }
    kutu.append(secim, tuval, izle, durum, dugmeler);
    durum.textContent = tur === "video"
      ? "Bir mekân seç, kamerayı aç. Işığın önden gelsin, düz bir duvarın önünde otur; en çok 10 dakika."
      : "Mikrofonu aç, hazır olunca kaydı başlat. En çok 10 dakika.";

    function akisiKapat() {
      cancelAnimationFrame(cizim);
      akis?.getTracks().forEach((t) => t.stop());
      akis = null;
    }

    // Birleşik kare: mekân (kaplayacak şekilde) + maskeyle kesilmiş kişi (ortada, alta oturur).
    const kisiTuvali = document.createElement("canvas");
    const maskeTuvali = document.createElement("canvas");
    let maskeVeri = null;
    function kareCiz(ctx) {
      const W = tuval.width;
      const H = tuval.height;
      const vw = kamera.videoWidth;
      const vh = kamera.videoHeight;
      if (!vw) return;
      if (!arkaPlanSil || !bolucu) {
        const o = Math.max(W / vw, H / vh);
        ctx.drawImage(kamera, (W - vw * o) / 2, (H - vh * o) / 2, vw * o, vh * o);
        return;
      }
      if (mekanResmi) {
        const o = Math.max(W / mekanResmi.width, H / mekanResmi.height);
        ctx.drawImage(mekanResmi, (W - mekanResmi.width * o) / 2, (H - mekanResmi.height * o) / 2, mekanResmi.width * o, mekanResmi.height * o);
      } else { ctx.fillStyle = "#0b0d1c"; ctx.fillRect(0, 0, W, H); }
      bolucu.segmentForVideo(kamera, performance.now(), (sonuc) => {
        const maske = sonuc.confidenceMasks?.[0];
        if (!maske) return;
        const mw = maske.width;
        const mh = maske.height;
        const f = maske.getAsFloat32Array();
        if (maskeTuvali.width !== mw || maskeTuvali.height !== mh) {
          maskeTuvali.width = mw; maskeTuvali.height = mh;
          maskeVeri = maskeTuvali.getContext("2d").createImageData(mw, mh);
        }
        const d = maskeVeri.data;
        for (let i = 0; i < f.length; i++) {
          // Yumuşak kenar: 0.35–0.75 arası geçiş.
          const a = Math.min(1, Math.max(0, (f[i] - 0.35) / 0.4));
          d[i * 4 + 3] = a * 255;
        }
        maskeTuvali.getContext("2d").putImageData(maskeVeri, 0, 0);
        if (kisiTuvali.width !== vw) { kisiTuvali.width = vw; kisiTuvali.height = vh; }
        const k = kisiTuvali.getContext("2d");
        k.globalCompositeOperation = "copy";
        k.drawImage(kamera, 0, 0, vw, vh);
        k.globalCompositeOperation = "destination-in";
        k.filter = "blur(2px)";
        k.drawImage(maskeTuvali, 0, 0, vw, vh);
        k.filter = "none";
        k.globalCompositeOperation = "source-over";
        // Kişi görüntünün yüksekliğini doldurur, ortada durur.
        const o = H / vh;
        ctx.drawImage(kisiTuvali, (W - vw * o) / 2, 0, vw * o, H);
        maske.close?.();
      });
    }

    baslat.addEventListener("click", async () => {
      baslat.disabled = true;
      try {
        if (tur === "video") {
          durum.textContent = "Kamera ve arka plan silici hazırlanıyor…";
          [akis, mekanResmi] = await Promise.all([
            navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true } }),
            resim(mekan.src).catch(() => null),
          ]);
          kamera.srcObject = akis;
          await kamera.play();
          try { await bolucuYukle(); } catch (e) {
            arkaPlanSil = false;
            secim.querySelector(".mekan-sil input").checked = false;
            toast?.("Arka plan silici yüklenemedi; kendi arka planınla kaydedebilirsin.");
          }
          tuval.hidden = false;
          const ctx = tuval.getContext("2d");
          const dongu = () => { kareCiz(ctx); cizim = requestAnimationFrame(dongu); };
          dongu();
          durum.textContent = "Görüntün hazır. Kaydı başlatabilirsin.";
        } else {
          akis = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          durum.textContent = "Mikrofon hazır. Kaydı başlatabilirsin.";
        }
        baslat.hidden = true;
        kaydet.hidden = false;
      } catch (e) {
        durum.textContent = "Kameraya/mikrofona izin verilmedi ya da cihaz bulunamadı. Tarayıcı ayarlarından izin ver.";
        baslat.disabled = false;
      }
    });

    kaydet.addEventListener("click", () => {
      parcalar = [];
      let kayitAkisi;
      let mime;
      if (tur === "video") {
        kayitAkisi = tuval.captureStream(30);
        akis.getAudioTracks().forEach((t) => kayitAkisi.addTrack(t));
        mime = mimeSec(["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]);
      } else {
        kayitAkisi = akis;
        mime = mimeSec(["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"]);
      }
      kaydedici = new MediaRecorder(kayitAkisi, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 96_000 });
      kaydedici.ondataavailable = (e) => { if (e.data.size) parcalar.push(e.data); };
      kaydedici.onstop = () => {
        clearInterval(zamanlayici);
        const tip = (kaydedici.mimeType || mime || (tur === "video" ? "video/webm" : "audio/webm")).split(";")[0];
        sonBlob = new Blob(parcalar, { type: tip });
        akisiKapat();
        tuval.hidden = true;
        secim.hidden = true;
        izle.src = URL.createObjectURL(sonBlob);
        izle.hidden = false;
        durum.textContent = `Kayıt hazır (${sure(gecen)} · ${(sonBlob.size / 1048576).toFixed(1)} MB). Dinle/izle; beğendiysen kullan.`;
        durdur.hidden = true;
        tekrar.hidden = false;
        kullan.hidden = false;
      };
      const basla = Date.now();
      let gecen = 0;
      kaydedici.start(1000);
      zamanlayici = setInterval(() => {
        gecen = (Date.now() - basla) / 1000;
        durum.textContent = `● Kaydediliyor ${sure(gecen)} / ${sure(EN_UZUN_SN)}`;
        if (gecen >= EN_UZUN_SN) kaydedici.stop();
      }, 250);
      durum.classList.add("kayitta");
      kaydet.hidden = true;
      durdur.hidden = false;
      secim.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    });
    durdur.addEventListener("click", () => { durum.classList.remove("kayitta"); kaydedici?.stop(); });
    tekrar.addEventListener("click", () => kur(kutu, { tur, bitince, toast }));
    kullan.addEventListener("click", () => bitince(sonBlob, sonBlob.type));

    // Sekme/talep değişince kamera kapansın.
    return { kapat: () => { try { kaydedici?.state === "recording" && kaydedici.stop(); } catch {} akisiKapat(); } };
  }

  window.UzmanKaydedici = { kur, MEKANLAR };
})();
