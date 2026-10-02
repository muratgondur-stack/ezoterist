const { elTipleri, cizgiler, tepeler, ipuclari } = ElFaliVeri;
const $ = (id) => document.getElementById(id);

let durum = { ses: false, ai: true, kalan: 3, sinir: 3 };
let kayitlar = [];
let acikKayit = null;
let baskinEl = "sağ";
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 4000);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
const TIP_IKON = { toprak: "🌿", hava: "🌬️", ateş: "🔥", su: "🌊" };

// --- Ses ---

const voice = $("voice");
let activeListen = null;

function stopVoice() {
  voice.pause();
  if (activeListen) {
    activeListen.classList.remove("is-playing");
    activeListen.textContent = activeListen.dataset.label;
    activeListen.disabled = false;
  }
  activeListen = null;
}

function bindListen(button, getUrl) {
  button.dataset.label = button.dataset.label || button.textContent;
  button.hidden = !durum.ses;
  button.onclick = () => {
    if (activeListen === button) { stopVoice(); return; }
    stopVoice();
    activeListen = button;
    button.disabled = true;
    button.textContent = "⏳ Ses hazırlanıyor…";
    voice.src = getUrl();
    voice.play().catch(() => { toast("Ses çalınamadı."); stopVoice(); });
  };
}

voice.addEventListener("playing", () => {
  if (!activeListen) return;
  activeListen.disabled = false;
  activeListen.classList.add("is-playing");
  activeListen.textContent = "⏹ Durdur";
});
voice.addEventListener("ended", stopVoice);
voice.addEventListener("error", () => { if (activeListen) toast("Seslendirme şu an hazır değil."); stopVoice(); });

// --- Form ---

function renderHandChips() {
  $("handChips").replaceChildren(...["sağ", "sol"].map((el) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = el === "sağ" ? "Sağ elimle" : "Sol elimle";
    button.setAttribute("aria-pressed", String(baskinEl === el));
    button.addEventListener("click", () => { baskinEl = el; renderHandChips(); renderSlots(); });
    return button;
  }));
}

const fotolar = [null, null];
const yuvalar = () => [
  { ad: `${baskinEl === "sağ" ? "Sağ" : "Sol"} elin (baskın)`, ipucu: "Avuç içi, tam açık", ikon: "✋", zorunlu: true },
  { ad: `${baskinEl === "sağ" ? "Sol" : "Sağ"} elin`, ipucu: "İsteğe bağlı", ikon: "🤚" },
];

function kucult(file) {
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
}

function renderSlots() {
  $("photoSlots").replaceChildren(...yuvalar().map((yuva, i) => {
    const slot = document.createElement("label");
    slot.className = `photo-slot${yuva.zorunlu ? " is-required" : ""}${fotolar[i] ? " has-photo" : ""}`;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.hidden = true;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        fotolar[i] = await kucult(file);
        renderSlots();
      } catch (error) {
        toast(error.message);
      }
    });
    slot.append(input);
    if (fotolar[i]) {
      const img = document.createElement("img");
      img.src = fotolar[i];
      img.alt = yuva.ad;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "slot-remove";
      remove.setAttribute("aria-label", "Fotoğrafı kaldır");
      remove.textContent = "✕";
      remove.addEventListener("click", (e) => { e.preventDefault(); fotolar[i] = null; renderSlots(); });
      slot.append(img, remove);
    } else {
      slot.insertAdjacentHTML("beforeend", `<span class="slot-icon">${yuva.ikon}</span><b></b><span></span>`);
      slot.querySelector("b").textContent = yuva.ad;
      slot.querySelector("span:last-child").textContent = yuva.ipucu;
    }
    return slot;
  }));
}

function renderKota() {
  $("quota").textContent = !durum.ai
    ? "Falcımız şu an müsait değil, biraz sonra tekrar dene."
    : durum.kalan > 0
      ? `Bugün ${durum.kalan} el falı hakkın kaldı (günde ${durum.sinir}).`
      : "Bugünkü 3 el falı hakkını kullandın. Yarın yeniden bekleriz.";
  $("falSubmit").disabled = durum.kalan <= 0 || !durum.ai;
}

const form = $("falForm");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!fotolar[0]) { toast("Önce baskın elinin avuç içi fotoğrafını ekle."); return; }
  const button = $("falSubmit");
  button.disabled = true;
  button.textContent = "✋ Falcımız avucuna bakıyor…";
  try {
    const response = await fetch("/api/el-fali/bak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ fotolar: fotolar.filter(Boolean), baskinEl, soru: form.elements.soru.value }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Falına bakılamadı.");
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    fotolar.fill(null);
    form.reset();
    renderSlots();
    showKayit(data.kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    button.textContent = "Elime bak";
    renderKota();
  }
});

// --- Sonuç ---

function showKayit(kayit, kaydir = false) {
  stopVoice();
  acikKayit = kayit;
  const f = kayit.fal;
  $("sonuc").hidden = false;
  const foto = $("handPhotos");
  foto.classList.toggle("many", kayit.girdi.fotoSayisi > 1);
  foto.replaceChildren(...[...Array(kayit.girdi.fotoSayisi).keys()].map((n) => {
    const img = document.createElement("img");
    img.src = `/api/el-fali/foto?id=${kayit.id}&n=${n}`;
    img.alt = n === 0 ? "Baskın el" : "Diğer el";
    return img;
  }));
  $("resultDate").textContent = `${tarih(kayit.tarih)} · baskın el: ${kayit.girdi.baskinEl}`;
  $("resultTitle").textContent = f.baslik;
  $("handType").hidden = !f.elTipi;
  $("handType").textContent = f.elTipi ? `${TIP_IKON[f.elTipi] || ""} ${f.elTipi[0].toLocaleUpperCase("tr-TR")}${f.elTipi.slice(1)} eli` : "";
  $("resultTypeText").textContent = f.elTipiYorum;
  $("resultLines").replaceChildren(...f.cizgiler.map((c) => {
    const li = document.createElement("li");
    li.innerHTML = '<b></b><span class="gorunum"></span><p></p>';
    li.querySelector("b").textContent = c.cizgi;
    li.querySelector(".gorunum").textContent = c.gorunum || "belirgin değil";
    li.querySelector("p").textContent = c.anlam;
    return li;
  }));
  $("mountsCard").hidden = !f.tepeler.length;
  $("resultMounts").replaceChildren(...f.tepeler.map((t) => {
    const li = document.createElement("li");
    li.textContent = `${t.tepe}: ${t.anlam}`;
    return li;
  }));
  $("resultLove").textContent = f.ask || "—";
  $("resultWork").textContent = f.kariyer || "—";
  $("resultTalents").textContent = f.yetenekler || "—";
  $("wishCard").hidden = !f.soru;
  $("resultWish").textContent = f.soru;
  $("resultAdvice").textContent = f.tavsiye ? `“${f.tavsiye}”` : "";
  bindListen($("resultListen"), () => `/api/el-fali/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".journal-item").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "el-fali", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz baktırdığın bir el falı yok. Avucunun fotoğrafını yukarıda yükle.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} el falı kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.className = `journal-item${acikKayit?.id === k.id ? " is-current" : ""}`;
    li.dataset.id = k.id;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "journal-open";
    open.innerHTML = `<img class="journal-thumb" src="/api/el-fali/foto?id=${k.id}&n=0" alt="" loading="lazy" />
      <span class="journal-meta"><b></b><small></small><p></p></span>`;
    open.querySelector("b").textContent = k.fal.baslik;
    open.querySelector("small").textContent = tarih(k.tarih);
    open.querySelector("p").textContent = k.fal.elTipiYorum || k.girdi.soru;
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "journal-delete";
    sil.title = "Bu falı sil";
    sil.setAttribute("aria-label", "Bu falı sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu fal ve el fotoğrafları silinsin mi?")) return;
      const response = await fetch("/api/el-fali/sil", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id: k.id }),
      });
      if (!response.ok) { toast("Silinemedi."); return; }
      kayitlar = kayitlar.filter((x) => x.id !== k.id);
      if (acikKayit?.id === k.id) { acikKayit = null; $("sonuc").hidden = true; stopVoice(); }
      renderJournal();
    });
    li.append(open, sil);
    return li;
  }));
}

// --- Rehber ---

function rehberKart(baslik, ...satirlar) {
  const li = document.createElement("li");
  const b = document.createElement("b");
  b.textContent = baslik;
  li.append(b, ...satirlar.filter(Boolean).map((t) => {
    const p = document.createElement("p");
    p.textContent = t;
    return p;
  }));
  return li;
}

function renderGuide() {
  $("tips").replaceChildren(...ipuclari.map((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${i + 1}</b><span></span>`;
    li.querySelector("span").textContent = t;
    return li;
  }));
  $("handTypes").replaceChildren(...elTipleri.map(([ad, ikon, sekil, anlam]) => {
    const li = rehberKart(ad, sekil, anlam);
    li.insertAdjacentHTML("afterbegin", `<span class="el-icon">${ikon}</span>`);
    return li;
  }));
  $("lineGuide").replaceChildren(...cizgiler.map(([ad, yer, anlam]) => rehberKart(ad, anlam, yer)));
  $("mountGuide").replaceChildren(...tepeler.map(([ad, yer, anlam]) => rehberKart(ad, anlam, yer)));
}

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/el-fali")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/el-fali/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, ai: data.ai, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

renderHandChips();
renderSlots();
renderGuide();
init();
