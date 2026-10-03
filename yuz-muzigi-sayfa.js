// Yüz Müziği sayfası: yüz seçimi/taraması, çalar kontrolleri (5 melodi stili, 5 meditasyon tipi) ve 5 ezoterik animasyon.
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
let ayar = { okyanus: false, binaural: false, ses: 0.8, dakika: 0, mod: "melodi", stil: "ninni", medTip: null, anim: "mandala" };
// Stil, meditasyon tipi ve animasyon seçimi bu tarayıcıda hatırlanır.
try { Object.assign(ayar, JSON.parse(localStorage.getItem("yuz-muzigi-ayar") || "{}")); } catch { /* depolama kapalı */ }
const ayarSakla = () => { try { localStorage.setItem("yuz-muzigi-ayar", JSON.stringify({ mod: ayar.mod, stil: ayar.stil, medTip: ayar.medTip, anim: ayar.anim })); } catch { /* depolama kapalı */ } };

const ANIMASYONLAR = {
  mandala: "🪷 Mandala",
  galaksi: "🌌 Galaksi",
  nefes: "🫧 Nefes küresi",
  aurora: "🌠 Kuzey ışıkları",
  su: "🌙 Ay ışığında su",
};

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
  tarifYaz();
  $("playButton").disabled = false;
  $("stageNote").textContent = "Çalmak için dokun.";
  setPlaying(false);
  if (calarken) cal();
  if (kaydir) $("calar").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Akor adları: büyük harf majör, küçük harf minör akor (dizinin kendi akorları).
const MAJOR_AKOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const MINOR_AKOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"];
function tarifYaz() {
  renderSecimler();
  if (!secili || !tarif) return;
  const m = tarif.melodi;
  const yuruyus = (y) => y.map((d) => (m.majör ? MAJOR_AKOR : MINOR_AKOR)[d]).join("–");
  const st = YuzMuzigi.MELODI_STILLERI[ayar.stil];
  const mt = YuzMuzigi.MEDITASYON_TIPLERI[medTipi()];
  $("recipe").textContent = ayar.mod === "melodi"
    ? `${secili.ad}: ${st.ad} · ${m.adi}, ${m.olcu}/4 ölçü, ${Math.round(m.bpm * st.tempo)} vuruş/dk; akorlar ${yuruyus(m.A)} ve ${yuruyus(m.B)}. Ana ezgi yüzünün oranlarından doğar.`
    : `${secili.ad}: ${mt.ad} · ${tarif.kokAdi} kökünde ${tarif.makamAdi} makamı, nefes ritmi ${tarif.nefes.toFixed(0)} sn.`;
}
const medTipi = () => ayar.medTip || (tarif ? YuzMuzigi.yuzunMeditasyonu(tarif) : "kase");

function chipler(kutu, liste, secilen, tikla) {
  kutu.replaceChildren(...liste.map(([id, ad, alt]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("aria-pressed", String(id === secilen));
    b.innerHTML = alt ? "<span></span><small></small>" : "<span></span>";
    b.querySelector("span").textContent = ad;
    if (alt) b.querySelector("small").textContent = alt;
    b.addEventListener("click", () => tikla(id));
    return b;
  }));
}
function renderSecimler() {
  $("modeChips").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.mod === ayar.mod)));
  $("styleRow").hidden = ayar.mod !== "melodi";
  $("medRow").hidden = ayar.mod !== "meditasyon";
  chipler($("styleChips"), Object.entries(YuzMuzigi.MELODI_STILLERI).map(([id, s]) => [id, s.ad, s.aciklama]), ayar.stil, (id) => { ayar.stil = id; degisti(); });
  chipler($("medChips"), Object.entries(YuzMuzigi.MEDITASYON_TIPLERI).map(([id, s]) => [id, s.ad, tarif && id === YuzMuzigi.yuzunMeditasyonu(tarif) ? "yüzüne göre" : ""]), medTipi(), (id) => { ayar.medTip = id; degisti(); });
  chipler($("animChips"), Object.entries(ANIMASYONLAR).map(([id, ad]) => [id, ad]), ayar.anim, (id) => { ayar.anim = id; ayarSakla(); renderSecimler(); });
}
// Müziği etkileyen bir seçim değişince: kaydet, tarifi yaz, çalıyorsa yeni ayarla yeniden başlat.
function degisti() {
  ayarSakla();
  tarifYaz();
  const calarken = motor?.calisiyor;
  if (motor) { motor.kapat(); motor = null; }
  setPlaying(false);
  if (calarken) cal();
}

$("modeChips").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-mod]");
  if (!b || b.dataset.mod === ayar.mod) return;
  ayar.mod = b.dataset.mod;
  degisti();
});

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
      if (ayar.mod === "melodi") $("stageNote").textContent = "Piyano hazırlanıyor…";
      motor = YuzMuzigi.motor(tarif, { notaOlunca: parilda, mod: ayar.mod, stil: ayar.stil, medTip: medTipi() });
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

// --- Animasyonlar (5 tip) ---

const tuval = $("mandala");
const c2 = tuval.getContext("2d");
let yildizlar = [];
let galaksi = [];
const isiklar = []; // çalan notalar: perdeye göre açı, zaman ve güç
function boyutla() {
  const r = tuval.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  tuval.width = Math.round(r.width * dpr);
  tuval.height = Math.round(r.height * dpr);
  yildizlar = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, h: Math.random() * Math.PI * 2 }));
  galaksi = Array.from({ length: 520 }, (_, i) => {
    const kol = i % 3;
    const u = Math.random();
    return { u, a: kol * ((Math.PI * 2) / 3) + u * 5.2 + (Math.random() - 0.5) * 0.5, s: Math.random() * 1.6 + 0.4, k: Math.floor(Math.random() * 3) };
  });
}
new ResizeObserver(boyutla).observe(tuval);

function parilda({ f, guc }) {
  const a = ((Math.log2(f) % 1) + 1) % 1; // perde → açı
  isiklar.push({ a: a * Math.PI * 2, t: performance.now(), guc, x: Math.random(), y: 0.55 + Math.random() * 0.35 });
  if (isiklar.length > 30) isiklar.shift();
}

function zemin(W, H, ic = "#140d2e", dis = "#04040c") {
  const g = c2.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, ic);
  g.addColorStop(1, dis);
  c2.fillStyle = g;
  c2.fillRect(0, 0, W, H);
}
function yildizCiz(W, H, t, alt = 1) {
  yildizlar.forEach((s) => {
    if (s.y > alt) return;
    c2.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.7 + s.h));
    c2.fillStyle = "#fff";
    c2.beginPath();
    c2.arc(s.x * W, ((s.y + t * 0.004) % alt) * H, s.r * (W / 800 + 0.6), 0, Math.PI * 2);
    c2.fill();
  });
  c2.globalAlpha = 1;
}
function parilti(x, y, r, renk1, renk2, alfa) {
  c2.globalAlpha = alfa;
  const g = c2.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, renk1);
  g.addColorStop(0.3, renk2);
  g.addColorStop(1, "#00000000");
  c2.fillStyle = g;
  c2.beginPath();
  c2.arc(x, y, r, 0, Math.PI * 2);
  c2.fill();
}

const CIZIMLER = {
  // Dönen yaprak halkaları ve nefesle büyüyen merkez ışığı
  mandala(W, H, t, nefes, renk, calar, simdi) {
    zemin(W, H);
    yildizCiz(W, H, t);
    const R = Math.min(W, H) * (0.3 + 0.06 * nefes);
    const yaprak = tarif ? YuzMuzigi.MAKAMLAR[tarif.makam].aralik.length * 2 : 12;
    c2.save();
    c2.translate(W / 2, H / 2);
    c2.globalCompositeOperation = "lighter";
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
    parilti(0, 0, R * 0.55, `${renk[2]}cc`, `${renk[0]}55`, 0.55 + 0.35 * nefes);
    isiklar.forEach((p) => {
      const yas = (simdi - p.t) / 1000;
      if (yas > 6) return;
      const r = R * 0.18 * (1 + yas * 0.25);
      parilti(Math.cos(p.a) * R * 0.95, Math.sin(p.a) * R * 0.95, r, renk[2], renk[0], (1 - yas / 6) * 0.9 * p.guc);
    });
    c2.restore();
  },
  // Üç kollu sarmal galaksi; notalar kollarda yıldız patlaması
  galaksi(W, H, t, nefes, renk, calar, simdi) {
    zemin(W, H, "#0d0b24", "#020208");
    yildizCiz(W, H, t);
    const R = Math.min(W, H) * (0.44 + 0.03 * nefes);
    c2.save();
    c2.translate(W / 2, H / 2);
    c2.globalCompositeOperation = "lighter";
    const don = t * (calar ? 0.06 : 0.02);
    galaksi.forEach((p) => {
      const a = p.a + don * (1.6 - p.u);
      const r = p.u * R;
      c2.globalAlpha = (0.25 + 0.6 * (1 - p.u)) * (0.7 + 0.3 * nefes);
      c2.fillStyle = renk[p.k];
      c2.beginPath();
      c2.arc(Math.cos(a) * r, Math.sin(a) * r * 0.62, p.s * (W / 900 + 0.5), 0, Math.PI * 2);
      c2.fill();
    });
    parilti(0, 0, R * 0.28, `${renk[2]}ee`, `${renk[0]}66`, 0.6 + 0.3 * nefes);
    isiklar.forEach((p) => {
      const yas = (simdi - p.t) / 1000;
      if (yas > 5) return;
      const r = R * (0.3 + 0.6 * ((p.a / (Math.PI * 2)) % 1));
      const a = p.a + don;
      parilti(Math.cos(a) * r, Math.sin(a) * r * 0.62, R * 0.09 * (1 + yas * 0.6), "#ffffff", renk[0], (1 - yas / 5) * p.guc);
    });
    c2.restore();
  },
  // Nefes rehberi: büyüyüp küçülen küre, "nefes al / nefes ver", notalarda dışa yayılan halkalar
  nefes(W, H, t, nefes, renk, calar, simdi) {
    zemin(W, H, "#0e1530", "#03040c");
    yildizCiz(W, H, t);
    const R = Math.min(W, H) * (0.16 + 0.14 * nefes);
    c2.save();
    c2.translate(W / 2, H / 2);
    isiklar.forEach((p) => {
      const yas = (simdi - p.t) / 1000;
      if (yas > 7) return;
      c2.globalAlpha = (1 - yas / 7) * 0.5 * p.guc;
      c2.strokeStyle = renk[1];
      c2.lineWidth = Math.max(1, W / 600);
      c2.beginPath();
      c2.arc(0, 0, R + yas * Math.min(W, H) * 0.06, 0, Math.PI * 2);
      c2.stroke();
    });
    c2.globalCompositeOperation = "lighter";
    parilti(0, 0, R * 1.9, `${renk[0]}55`, `${renk[1]}22`, 0.9);
    parilti(0, 0, R, `${renk[2]}ff`, `${renk[0]}aa`, 0.85);
    c2.globalCompositeOperation = "source-over";
    if (tarif) {
      const evre = ((t / tarif.nefes) % 1 + 1) % 1;
      c2.globalAlpha = 0.75;
      c2.fillStyle = "#fff6e0";
      c2.font = `600 ${Math.round(Math.min(W, H) * 0.045)}px Manrope, sans-serif`;
      c2.textAlign = "center";
      c2.textBaseline = "middle";
      c2.fillText(evre < 0.5 ? "nefes al" : "nefes ver", 0, R + Math.min(W, H) * 0.12);
    }
    c2.restore();
  },
  // Kuzey ışıkları: gökyüzünde dalgalanan, aşağıdan yukarı sönen ışık perdeleri; notalarda parlar
  aurora(W, H, t, nefes, renk, calar, simdi) {
    zemin(W, H, "#06122a", "#010308");
    yildizCiz(W, H, t);
    const parlama = isiklar.reduce((s, p) => { const yas = (simdi - p.t) / 1000; return yas < 3 ? s + (1 - yas / 3) * p.guc * 0.25 : s; }, 0);
    const AURORA = ["#3dffb0", "#2fd5ff", "#b58cff", "#7dffcf"];
    const hiz = calar ? 1 : 0.4;
    c2.save();
    c2.globalCompositeOperation = "lighter";
    const adim = Math.max(2, Math.round(W / 140));
    for (let k = 0; k < 4; k += 1) {
      const taban = H * (0.42 + k * 0.07);
      const boy = H * (0.22 + 0.06 * Math.sin(t * 0.2 + k));
      c2.lineWidth = adim * 1.15;
      for (let x = 0; x <= W; x += adim) {
        const u = x / W;
        const y = taban + Math.sin(u * 5 + t * (0.22 + k * 0.07) * hiz + k * 1.7) * H * 0.07 + Math.sin(u * 14 - t * 0.15 * hiz + k) * H * 0.02;
        // Perdedeki dikey ışık çizgileri: yer yer parlak, yer yer soluk
        const isik = 0.5 + 0.5 * Math.sin(u * 40 + t * 0.6 * hiz + k * 3);
        const g = c2.createLinearGradient(0, y, 0, y - boy);
        g.addColorStop(0, `${AURORA[k]}00`);
        g.addColorStop(0.08, `${AURORA[k]}cc`);
        g.addColorStop(0.45, `${AURORA[(k + 1) % 4]}55`);
        g.addColorStop(1, `${AURORA[(k + 2) % 4]}00`);
        c2.globalAlpha = Math.min(1, (0.16 + 0.22 * isik) * (0.75 + 0.35 * nefes) + parlama * 0.3);
        c2.strokeStyle = g;
        c2.beginPath();
        c2.moveTo(x, y);
        c2.lineTo(x, y - boy);
        c2.stroke();
      }
    }
    c2.restore();
    c2.globalAlpha = 1;
    // Ufukta karanlık dağ silueti ve sudaki hafif yansıma
    c2.fillStyle = "#02030a";
    c2.beginPath();
    c2.moveTo(0, H);
    for (let x = 0; x <= W; x += W / 24) c2.lineTo(x, H * (0.84 + 0.05 * Math.sin(x / W * 9) + 0.03 * Math.sin(x / W * 23)));
    c2.lineTo(W, H);
    c2.fill();
  },
  // Ay ışığında su: ayın yansıması, her notada suyun üstünde açılan halkalar
  su(W, H, t, nefes, renk, calar, simdi) {
    const ufuk = H * 0.5;
    const gok = c2.createLinearGradient(0, 0, 0, ufuk);
    gok.addColorStop(0, "#05061a");
    gok.addColorStop(1, "#1a1640");
    c2.fillStyle = gok;
    c2.fillRect(0, 0, W, ufuk);
    yildizCiz(W, H, t, 0.5);
    const ay = { x: W * 0.68, y: H * 0.22, r: Math.min(W, H) * 0.075 };
    parilti(ay.x, ay.y, ay.r * 3.2, `${renk[2]}55`, `${renk[0]}22`, 0.8 + 0.2 * nefes);
    c2.globalAlpha = 1;
    c2.fillStyle = "#fff6e6";
    c2.beginPath();
    c2.arc(ay.x, ay.y, ay.r, 0, Math.PI * 2);
    c2.fill();
    const deniz = c2.createLinearGradient(0, ufuk, 0, H);
    deniz.addColorStop(0, "#0d1032");
    deniz.addColorStop(1, "#02030a");
    c2.fillStyle = deniz;
    c2.fillRect(0, ufuk, W, H - ufuk);
    // Yansıma şeridi: titreyen ışık çizgileri
    for (let i = 0; i < 26; i += 1) {
      const y = ufuk + (i / 26) * (H - ufuk);
      const gen = ay.r * (0.6 + i * 0.12) * (0.7 + 0.3 * Math.sin(t * 1.3 + i));
      c2.globalAlpha = (1 - i / 26) * 0.55 * (0.7 + 0.3 * nefes);
      c2.fillStyle = renk[2];
      c2.fillRect(ay.x - gen + Math.sin(t * 0.9 + i * 1.7) * ay.r * 0.3, y, gen * 2, Math.max(1, H / 300));
    }
    // Nota halkaları
    c2.lineWidth = Math.max(1, W / 700);
    isiklar.forEach((p) => {
      const yas = (simdi - p.t) / 1000;
      if (yas > 6) return;
      const x = p.x * W;
      const y = ufuk + (p.y - 0.5) * 2 * (H - ufuk) * 0.9;
      for (let k = 0; k < 3; k += 1) {
        const r = (yas - k * 0.5) * Math.min(W, H) * 0.07;
        if (r <= 0) continue;
        c2.globalAlpha = (1 - yas / 6) * 0.6 * p.guc;
        c2.strokeStyle = renk[k % 3];
        c2.beginPath();
        c2.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
        c2.stroke();
      }
    });
    c2.globalAlpha = 1;
  },
};

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
  const nefes = tarif ? 0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / tarif.nefes) : 0.5;
  c2.save();
  c2.clearRect(0, 0, W, H);
  (CIZIMLER[ayar.anim] || CIZIMLER.mandala)(W, H, t, nefes, renk, motor?.calisiyor, simdi);
  c2.restore();
  c2.globalAlpha = 1;
  c2.globalCompositeOperation = "source-over";
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
  renderSecimler();
  const d = await fetch("/api/yuz-muzigi/yuzler", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  yuzler = d?.yuzler || [];
  renderYuzler();
  if (yuzler.length) sec(yuzler[0], { kaydir: false });
  setTimeout(() => YuzHaritasi.yukle().catch(() => {}), 1500);
}
init();
