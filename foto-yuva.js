// Fotoğraf yuvası (kahve falı, el falı, yüz okuma, fotoğraf analizi): boşken "Kamerayla çek" (canlı kamera penceresi) ve "Galeriden seç"
// düğmeleri, doluyken önizleme ve kaldır düğmesi. Seçilen dosya tarayıcıda küçültülüp JPEG'e çevrilir.
window.fotoKucult = function fotoKucult(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const olcek = Math.min(1, 1280 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * olcek);
      canvas.height = Math.round(image.height * olcek);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Fotoğraf açılamadı.")); };
    image.src = url;
  });
};

// Gerçek kamera penceresi: canlı görüntü, "Çek", "Kamerayı çevir", "Vazgeç". <input capture> bilgisayarda ve
// birçok tarayıcıda yok sayılıp dosya seçiciyi açtığı için kamera getUserMedia ile doğrudan açılır.
window.kameraIleCek = function kameraIleCek(yon = "environment") {
  return new Promise((resolve, reject) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      reject(new Error("Bu tarayıcı kamerayı açmayı desteklemiyor; Galeriden seç ile devam edebilirsin."));
      return;
    }
    let akim = null;
    let aktifYon = yon;
    const pencere = document.createElement("div");
    pencere.className = "camera-modal";
    pencere.setAttribute("role", "dialog");
    pencere.setAttribute("aria-label", "Kamera");
    pencere.innerHTML = `<div class="camera-box">
      <video class="camera-video" playsinline webkit-playsinline autoplay muted></video>
      <p class="camera-status">Kamera açılıyor…</p>
      <div class="camera-actions">
        <button type="button" class="camera-btn" data-k="vazgec">✕ Vazgeç</button>
        <button type="button" class="camera-shutter" data-k="cek" aria-label="Fotoğrafı çek" disabled></button>
        <button type="button" class="camera-btn" data-k="cevir">🔄 Çevir</button>
      </div></div>`;
    document.body.append(pencere);
    const video = pencere.querySelector("video");
    const durum = pencere.querySelector(".camera-status");
    const cekBtn = pencere.querySelector('[data-k="cek"]');

    const durdur = () => akim?.getTracks().forEach((t) => t.stop());
    const kapat = () => { durdur(); pencere.remove(); };

    async function ac() {
      durdur();
      cekBtn.disabled = true;
      durum.hidden = false;
      durum.textContent = "Kamera açılıyor…";
      try {
        try {
          akim = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: aktifYon }, width: { ideal: 1920 }, height: { ideal: 1440 } },
            audio: false,
          });
        } catch (error) {
          if (error?.name === "NotAllowedError") throw error;
          // Yüksek çözünürlük isteği bazı kameralarda reddedilir ya da siyah görüntü verir: sade istekle tekrar.
          akim = await navigator.mediaDevices.getUserMedia({ video: { facingMode: aktifYon }, audio: false });
        }
        video.muted = true;
        video.setAttribute("playsinline", "");
        video.srcObject = akim;
        video.classList.toggle("is-mirrored", aktifYon === "user");
        await video.play();
        // Görüntü 3 sn içinde gelmezse kullanıcı boş pencerede kalmasın.
        await new Promise((ok, hata) => {
          if (video.videoWidth) return ok();
          const t = setTimeout(() => hata(Object.assign(new Error(""), { name: "GoruntuYok" })), 3000);
          video.addEventListener("loadeddata", () => { clearTimeout(t); ok(); }, { once: true });
        });
        durum.hidden = true;
        cekBtn.disabled = false;
      } catch (error) {
        const mesaj = error?.name === "NotAllowedError"
          ? "Kamera izni verilmedi. Tarayıcının adres çubuğundan kamera iznini açıp tekrar dene."
          : error?.name === "NotFoundError" || error?.name === "OverconstrainedError"
            ? "Bu cihazda kullanılabilir bir kamera bulunamadı."
            : error?.name === "GoruntuYok"
              ? "Kameradan görüntü gelmedi. Galeriden seç ile fotoğraf yükleyebilirsin."
              : "Kamera açılamadı.";
        kapat();
        reject(new Error(mesaj));
      }
    }

    pencere.addEventListener("click", (event) => {
      const k = event.target.closest("[data-k]")?.dataset.k;
      if (k === "vazgec") { kapat(); reject(Object.assign(new Error(""), { iptal: true })); }
      if (k === "cevir") { aktifYon = aktifYon === "user" ? "environment" : "user"; ac(); }
      if (k === "cek" && video.videoWidth) {
        const olcek = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * olcek);
        canvas.height = Math.round(video.videoHeight * olcek);
        const ctx = canvas.getContext("2d");
        // Ön kamerada önizleme ayna gibi gösterilir; çekilen fotoğraf da aynı görünsün.
        if (aktifYon === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        kapat();
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      }
    });
    ac();
  });
};

/** yuva: { ad, ipucu, ikon, zorunlu }, foto: dataURL ya da null, kamera: "environment" | "user", onSec(dataUrl), onSil(), onHata(mesaj) */
window.fotoYuvasi = function fotoYuvasi({ yuva, foto, kamera = "environment", onSec, onSil, onHata }) {
  const slot = document.createElement("div");
  slot.className = `photo-slot${yuva.zorunlu ? " is-required" : ""}${foto ? " has-photo" : ""}`;

  if (foto) {
    const img = document.createElement("img");
    img.src = foto;
    img.alt = yuva.ad;
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "slot-remove";
    sil.setAttribute("aria-label", `${yuva.ad} fotoğrafını kaldır`);
    sil.textContent = "✕";
    sil.addEventListener("click", onSil);
    slot.append(img, sil);
    return slot;
  }

  slot.insertAdjacentHTML("beforeend", `<span class="slot-icon">${yuva.ikon}</span><b></b><span class="slot-hint"></span><span class="slot-actions"></span>`);
  slot.querySelector("b").textContent = yuva.ad;
  slot.querySelector(".slot-hint").textContent = yuva.ipucu;
  const dugme = (yazi) => {
    const label = document.createElement("label");
    label.className = "slot-btn";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try { onSec(await window.fotoKucult(file)); } catch (error) { onHata(error.message); }
    });
    label.append(input, yazi);
    return label;
  };
  // Telefonda (Murat 2026-10-04: iPhone Safari'de kamera penceresi açılıyor ama görüntü siyah) cihazın kendi kamera
  // uygulaması açılır: <input capture> telefonlarda güvenilir. Bilgisayarda capture yok sayıldığı için canlı pencere kalır.
  const telefon = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  let kameraBtn;
  if (telefon) {
    kameraBtn = dugme("📷 Kamerayla çek");
    kameraBtn.querySelector("input").setAttribute("capture", kamera);
  } else {
    kameraBtn = document.createElement("button");
    kameraBtn.type = "button";
    kameraBtn.className = "slot-btn";
    kameraBtn.textContent = "📷 Kamerayla çek";
    kameraBtn.addEventListener("click", async () => {
      try {
        onSec(await window.kameraIleCek(kamera));
      } catch (error) {
        if (!error.iptal) onHata(error.message);
      }
    });
  }
  slot.querySelector(".slot-actions").append(kameraBtn, dugme("🖼️ Galeriden seç"));
  return slot;
};
