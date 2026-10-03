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


function renderSlots() {
  $("photoSlots").replaceChildren(...yuvalar().map((yuva, i) =>
    fotoYuvasi({
      yuva,
      foto: fotolar[i],
      onSec: (veri) => { fotolar[i] = veri; renderSlots(); },
      onSil: () => { fotolar[i] = null; renderSlots(); },
      onHata: toast,
    }),
  ));
}

function renderKota() {
  $("quota").textContent = !durum.ai
    ? "Falcımız şu an müsait değil, biraz sonra tekrar dene."
    : !durum.sinir
      ? ""
      : durum.kalan > 0
      ? `Bugün ${durum.kalan} el falı hakkın kaldı (günde ${durum.sinir}).`
      : "Bugünkü 3 el falı hakkını kullandın. Yarın yeniden bekleriz.";
  $("falSubmit").disabled = (durum.sinir && durum.kalan <= 0) || !durum.ai;
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

// Çizgi ölçümü (V100: MediaPipe + U-Net): bulunan çizgiler avucun üzerine koyu kırmızıyla çizilir, ölçüleri yazılır.
const cizgiAdi = (ad) => ad.toLocaleLowerCase("tr-TR").split(" ")[0];
const olcumBul = (olcum, ad) => olcum?.cizgiler?.find((c) => cizgiAdi(c.cizgi) === cizgiAdi(ad || ""));
const SVG = "http://www.w3.org/2000/svg";

function olcumluFoto(img, olcum) {
  const kutu = document.createElement("figure");
  kutu.className = "olcum-foto";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("aria-hidden", "true");
  const ciz = () => {
    const W = img.naturalWidth, H = img.naturalHeight;
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const k = Math.max(W, H) / 1000;
    svg.replaceChildren(...olcum.cizgiler.flatMap((c, i) => {
      const p = c.noktalar.map(([x, y]) => [x * W, y * H]);
      const cizgi = document.createElementNS(SVG, "polyline");
      cizgi.setAttribute("points", p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
      cizgi.setAttribute("class", "olcum-cizgi");
      cizgi.style.strokeWidth = String(7 * k);
      // Etiketler çizgi boyunca farklı yerlere konur, üst üste binmesin.
      const [ox, oy] = p[Math.floor((p.length - 1) * [0.25, 0.8, 0.5, 0.35][i % 4])];
      const yazi = document.createElementNS(SVG, "text");
      yazi.setAttribute("x", String(Math.min(W - 10 * k, Math.max(10 * k, ox))));
      yazi.setAttribute("y", String(Math.max(30 * k, oy - 14 * k)));
      yazi.setAttribute("class", "olcum-yazi");
      yazi.style.fontSize = `${24 * k}px`;
      yazi.style.strokeWidth = String(6 * k);
      yazi.textContent = `${c.cizgi.split(" ")[0]} · %${Math.round(c.olcu.oran * 100)}`;
      return [cizgi, yazi];
    }));
  };
  img.addEventListener("load", ciz);
  if (img.complete) ciz();
  const alt = document.createElement("figcaption");
  alt.textContent = "Kırmızı çizgiler ölçüm sistemimizin avucunda bulduğu çizgiler; yüzde, çizginin avuç genişliğine oranı. Işık ve açıya göre yanılabilir.";
  kutu.append(img, svg, alt);
  return kutu;
}

function showKayit(kayit, kaydir = false) {
  stopVoice();
  acikKayit = kayit;
  const f = kayit.fal;
  $("sonuc").hidden = false;
  const foto = $("handPhotos");
  foto.classList.toggle("many", kayit.girdi.fotoSayisi > 1);
  const olcum = kayit.girdi.olcum;
  foto.replaceChildren(...[...Array(kayit.girdi.fotoSayisi).keys()].map((n) => {
    const img = document.createElement("img");
    img.src = `/api/el-fali/foto?id=${kayit.id}&n=${n}`;
    img.alt = n === 0 ? "Baskın el" : "Diğer el";
    return n === 0 && olcum?.cizgiler?.length ? olcumluFoto(img, olcum) : img;
  }));
  $("resultDate").textContent = `${tarih(kayit.tarih)} · baskın el: ${kayit.girdi.baskinEl}`;
  $("resultTitle").textContent = f.baslik;
  $("handType").hidden = !f.elTipi;
  $("handType").textContent = f.elTipi ? `${TIP_IKON[f.elTipi] || ""} ${f.elTipi[0].toLocaleUpperCase("tr-TR")}${f.elTipi.slice(1)} eli` : "";
  // Yorum boş gelirse rehberdeki el tipi açıklaması kullanılır.
  const tipBilgi = elTipleri.find(([ad]) => ad.toLocaleLowerCase("tr-TR").startsWith(f.elTipi));
  $("resultTypeText").textContent = f.elTipiYorum || (tipBilgi ? tipBilgi[3] : "");
  $("resultLines").replaceChildren(...f.cizgiler.map((c) => {
    const li = document.createElement("li");
    li.innerHTML = '<b></b><span class="gorunum"></span><p></p>';
    li.querySelector("b").textContent = c.cizgi;
    li.querySelector(".gorunum").textContent = c.gorunum || "belirgin değil";
    li.querySelector("p").textContent = c.anlam;
    const olculen = olcumBul(olcum, c.cizgi);
    if (olculen) {
      const olcu = document.createElement("span");
      olcu.className = "olcu-etiket";
      olcu.textContent = `📏 Ölçüm: ${olculen.ozet}`;
      li.querySelector(".gorunum").after(olcu);
    }
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
