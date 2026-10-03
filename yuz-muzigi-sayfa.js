// Yüz Müziği sayfası: yüz seçimi/taraması, çalar kontrolleri ve nefesle büyüyüp küçülen ezoterik mandala animasyonu.
const $ = (id) => document.getElementById(id);

let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 4200);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
const SEKIL_AD = { oval: "Oval", yuvarlak: "Yuvarlak", kare: "Kare", kalp: "Kalp", uzun: "Uzun", elmas: "Elmas" };

let yuzler = [];
let secili = null; // { id, ad, tarih, olcumler }
let tarif = null;
let motor = null;
let ayar = { okyanus: false, binaural: false, ses: 0.8, dakika: 0 };

// --- 1. adım: yüzler ---

function renderYuzler() {
  const liste = $("faceList");
  if (!yuzler.length) {
    liste.innerHTML = '<li class="face-empty">Henüz ölçülmüş bir yüzün yok. Aşağıda yüzünü tara ya da <a href="/yuz-okuma">Yüz Okuma</a>\'da baktır.</li>';
    return;
  }
  liste.replaceChildren(...yuzler.map((y) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "face-item";
    b.setAttribute("aria-pressed", String(secili?.id === y.id));
    const t = YuzMuzigi.tarif(y.olcumler);
    b.innerHTML = '<b></b><small></small><span class="face-recipe"></span>';
    b.querySelector("b").textContent = y.ad;
    b.querySelector("small").textContent = `${tarih(y.tarih)} · ${SEKIL_AD[y.olcumler.sekil] || ""} yüz · altın orana uyum %${Math.round(y.olcumler.altinUyum ?? 0)}`;
    b.querySelector(".face-recipe").textContent = `${t.kokAdi} · ${t.makamAdi} · ${t.tiniAdi}`;
    b.addEventListener("click", () => sec(y));
    li.append(b);
    return li;
  }));
}

function sec(y, { kaydir = true } = {}) {
  const calarken = motor?.calisiyor;
  if (motor) { motor.kapat(); motor = null; }
  secili = y;
  tarif = YuzMuzigi.tarif(y.olcumler);
  renderYuzler();
  $("recipe").textContent = `${y.ad}: ${tarif.kokAdi} kökünde ${tarif.makamAdi} makamı, ${tarif.tiniAdi} sesi, çanlar ~${tarif.aralik.toFixed(1)} sn arayla, nefes ritmi ${tarif.nefes.toFixed(0)} sn.`;
  $("playButton").disabled = false;
  $("stageNote").textContent = "Çalmak için dokun.";
  setPlaying(false);
  if (calarken) cal();
  if (kaydir) $("calar").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Bu sayfada yeni yüz tarama (fotoğraf sunucuya gitmez; yalnız ölçümler kaydedilir).
let taramaFoto = null;
function renderTarama() {
  $("scanSlot").replaceChildren(fotoYuvasi({
    yuva: { ad: "Yüzün", ipucu: "Tam karşıdan", ikon: "🙂", zorunlu: true },
    foto: taramaFoto,
    kamera: "user",
    onSec: (veri) => { taramaFoto = veri; renderTarama(); },
    onSil: () => { taramaFoto = null; renderTarama(); },
    onHata: toast,
  }));
  $("scanButton").disabled = !taramaFoto;
}

$("scanButton").addEventListener("click", async () => {
  if (!taramaFoto) return;
  const b = $("scanButton");
  b.disabled = true;
  b.textContent = "Ölçülüyor…";
  $("scanStatus").textContent = "Yüz haritası çıkarılıyor…";
  try {
    const analiz = await YuzHaritasi.analiz(taramaFoto);
    if (!analiz.olcumler) throw new Error("Fotoğrafta bir yüz bulamadım. Yüzün tam karşıdan ve aydınlık görünsün.");
    const r = await fetch("/api/yuz-muzigi/tarama", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ olcumler: analiz.olcumler }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Yüz kaydedilemedi.");
    yuzler = [d.yuz, ...yuzler.filter((y) => y.id !== "tarama")];
    taramaFoto = null;
    renderTarama();
    $("scanStatus").textContent = "Yüzün ölçüldü; müziğin hazır.";
    sec(d.yuz);
  } catch (error) {
    $("scanStatus").textContent = error.message;
    toast(error.message);
  } finally {
    b.textContent = "Yüzümü ölç";
    b.disabled = !taramaFoto;
  }
});

// --- 2. adım: çalar ---

function setPlaying(calar) {
  $("playButton").textContent = calar ? "❚❚" : "▶";
  $("playButton").setAttribute("aria-label", calar ? "Duraklat" : "Çal");
  $("stage").classList.toggle("caliyor", calar);
}

async function cal() {
  if (!tarif) return;
  try {
    if (!motor) {
      motor = YuzMuzigi.motor(tarif, { notaOlunca: parilda });
      motor.okyanus(ayar.okyanus);
      motor.binaural(ayar.binaural);
      motor.sesDuzeyi(ayar.ses);
    }
    await motor.baslat();
    motor.zamanlayici(ayar.dakika, () => { setPlaying(false); toast("Uyku zamanlayıcısı doldu; müzik yavaşça durdu. İyi uykular."); });
    setPlaying(true);
    $("stageNote").textContent = ayar.dakika ? `Çalıyor · ${ayar.dakika} dk sonra yavaşça duracak` : "Çalıyor";
    ekraniUyandirma(true);
  } catch {
    toast("Ses başlatılamadı. Tarayıcının sesi açık mı?");
  }
}

$("playButton").addEventListener("click", () => {
  if (motor?.calisiyor) {
    motor.duraklat();
    setPlaying(false);
    $("stageNote").textContent = "Duraklatıldı.";
    ekraniUyandirma(false);
  } else {
    cal();
  }
});

$("volume").addEventListener("input", (e) => { ayar.ses = Number(e.target.value); motor?.sesDuzeyi(ayar.ses); });
$("oceanToggle").addEventListener("click", (e) => {
  ayar.okyanus = !ayar.okyanus;
  e.currentTarget.setAttribute("aria-pressed", String(ayar.okyanus));
  motor?.okyanus(ayar.okyanus);
});
$("binauralToggle").addEventListener("click", (e) => {
  ayar.binaural = !ayar.binaural;
  e.currentTarget.setAttribute("aria-pressed", String(ayar.binaural));
  motor?.binaural(ayar.binaural);
  if (ayar.binaural) toast("Binaural vuruş için kulaklık tak; hoparlörde etkisi olmaz.");
});
$("timerChips").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-dk]");
  if (!b) return;
  ayar.dakika = Number(b.dataset.dk);
  $("timerChips").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  if (motor?.calisiyor) {
    motor.zamanlayici(ayar.dakika, () => { setPlaying(false); toast("Uyku zamanlayıcısı doldu; müzik yavaşça durdu. İyi uykular."); });
    $("stageNote").textContent = ayar.dakika ? `Çalıyor · ${ayar.dakika} dk sonra yavaşça duracak` : "Çalıyor";
  }
});

// Çalarken ekranın kendiliğinden kapanmasını engelle (destekleyen tarayıcılarda); tam ekranda zamanla kararır.
let uyanikKilit = null;
async function ekraniUyandirma(acik) {
  try {
    if (acik && "wakeLock" in navigator && !uyanikKilit) uyanikKilit = await navigator.wakeLock.request("screen");
    if (!acik && uyanikKilit) { await uyanikKilit.release(); uyanikKilit = null; }
  } catch { uyanikKilit = null; }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && motor?.calisiyor) { uyanikKilit = null; ekraniUyandirma(true); } });

// Tam ekran: sahne büyür, 2 dk sonra parlaklık iyice düşer; dokununca kontroller yeniden görünür.
let karartma = null;
$("fullButton").addEventListener("click", async () => {
  const sahne = $("stage");
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (sahne.requestFullscreen) await sahne.requestFullscreen();
    else sahne.classList.toggle("sahte-tam");
  } catch {
    sahne.classList.toggle("sahte-tam");
  }
});
function uyandir() {
  const sahne = $("stage");
  sahne.classList.remove("karanlik");
  clearTimeout(karartma);
  if (document.fullscreenElement || sahne.classList.contains("sahte-tam")) karartma = setTimeout(() => sahne.classList.add("karanlik"), 120000);
}
document.addEventListener("fullscreenchange", uyandir);
$("stage").addEventListener("pointerdown", uyandir);

// --- Mandala animasyonu ---

const tuval = $("mandala");
const c2 = tuval.getContext("2d");
let yildizlar = [];
const isiklar = []; // çan notalarında parlayan noktalar
function boyutla() {
  const r = tuval.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  tuval.width = Math.round(r.width * dpr);
  tuval.height = Math.round(r.height * dpr);
  yildizlar = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, h: Math.random() * Math.PI * 2 }));
}
new ResizeObserver(boyutla).observe(tuval);

function parilda({ f, guc }) {
  const a = ((Math.log2(f) % 1) + 1) % 1; // perde → açı
  isiklar.push({ a: a * Math.PI * 2, t: performance.now(), guc });
  if (isiklar.length > 24) isiklar.shift();
}

let sonKare = 0;
function ciz(simdi) {
  requestAnimationFrame(ciz);
  if (simdi - sonKare < 33) return; // ~30 kare/sn, pil dostu
  sonKare = simdi;
  const W = tuval.width;
  const H = tuval.height;
  if (!W || !H) return;
  const t = simdi / 1000;
  const renk = tarif?.renk || ["#f3c26b", "#b388eb", "#ffffff"];
  const calar = motor?.calisiyor;
  const nefes = tarif ? 0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / tarif.nefes) : 0.5;
  c2.clearRect(0, 0, W, H);
  const zemin = c2.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  zemin.addColorStop(0, "#140d2e");
  zemin.addColorStop(1, "#04040c");
  c2.fillStyle = zemin;
  c2.fillRect(0, 0, W, H);
  yildizlar.forEach((s) => {
    c2.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.7 + s.h));
    c2.fillStyle = "#fff";
    c2.beginPath();
    c2.arc(s.x * W, ((s.y + t * 0.004) % 1) * H, s.r * (W / 800 + 0.6), 0, Math.PI * 2);
    c2.fill();
  });
  c2.globalAlpha = 1;
  const R = Math.min(W, H) * (0.3 + 0.06 * nefes);
  const yaprak = tarif ? YuzMuzigi.MAKAMLAR[tarif.makam].aralik.length * 2 : 12;
  c2.save();
  c2.translate(W / 2, H / 2);
  c2.globalCompositeOperation = "lighter";
  // Halkalar: biri saat yönünde, biri tersine döner
  for (let k = 0; k < 3; k += 1) {
    c2.save();
    c2.rotate((k % 2 ? -1 : 1) * t * (0.05 + k * 0.025) * (calar ? 1 : 0.35));
    c2.strokeStyle = renk[k % renk.length];
    c2.globalAlpha = 0.18 + 0.12 * nefes;
    c2.lineWidth = Math.max(1, W / 700);
    const rr = R * (0.45 + k * 0.32);
    for (let i = 0; i < yaprak; i += 1) {
      const a = (i / yaprak) * Math.PI * 2;
      c2.beginPath();
      c2.ellipse(Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5, rr * 0.5, rr * 0.2, a, 0, Math.PI * 2);
      c2.stroke();
    }
    c2.beginPath();
    c2.arc(0, 0, rr, 0, Math.PI * 2);
    c2.stroke();
    c2.restore();
  }
  // Merkez ışığı: nefesle büyür
  const ic = c2.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
  ic.addColorStop(0, `${renk[2]}cc`);
  ic.addColorStop(0.4, `${renk[0]}55`);
  ic.addColorStop(1, "#00000000");
  c2.globalAlpha = 0.55 + 0.35 * nefes;
  c2.fillStyle = ic;
  c2.beginPath();
  c2.arc(0, 0, R * 0.55, 0, Math.PI * 2);
  c2.fill();
  // Çan ışıkları: notanın perdesine göre bir açıda parlayıp söner
  isiklar.forEach((p) => {
    const yas = (simdi - p.t) / 1000;
    if (yas > 6) return;
    const s = 1 - yas / 6;
    c2.globalAlpha = s * 0.9 * p.guc;
    const x = Math.cos(p.a) * R * 0.95;
    const y = Math.sin(p.a) * R * 0.95;
    const g = c2.createRadialGradient(x, y, 0, x, y, R * 0.18 * (1 + yas * 0.25));
    g.addColorStop(0, renk[2]);
    g.addColorStop(0.3, renk[0]);
    g.addColorStop(1, "#00000000");
    c2.fillStyle = g;
    c2.beginPath();
    c2.arc(x, y, R * 0.18 * (1 + yas * 0.25), 0, Math.PI * 2);
    c2.fill();
  });
  c2.restore();
}
requestAnimationFrame(ciz);

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/yuz-muzigi")}`);
    return;
  }
  renderTarama();
  const d = await fetch("/api/yuz-muzigi/yuzler", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  yuzler = d?.yuzler || [];
  renderYuzler();
  if (yuzler.length) sec(yuzler[0], { kaydir: false });
  setTimeout(() => YuzHaritasi.yukle().catch(() => {}), 1500);
}
init();
