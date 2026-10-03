// Fotoğraf yuvası (kahve falı, el falı, yüz okuma, fotoğraf analizi): boşken "Kamerayla çek" ve "Galeriden seç"
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
  const dugme = (yazi, capture) => {
    const label = document.createElement("label");
    label.className = "slot-btn";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.setAttribute("capture", capture);
    input.hidden = true;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try { onSec(await window.fotoKucult(file)); } catch (error) { onHata(error.message); }
    });
    label.append(input, yazi);
    return label;
  };
  slot.querySelector(".slot-actions").append(dugme("📷 Kamerayla çek", kamera), dugme("🖼️ Galeriden seç", ""));
  return slot;
};
