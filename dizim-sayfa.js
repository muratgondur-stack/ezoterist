const { TURLER, benMi } = DizimHesap;
const $ = (id) => document.getElementById(id);
const ORAN = 2 / 3; // masa yüksekliği / genişliği (CSS aspect-ratio 3/2 ile aynı)
const GORUNUMLER = Array.from({ length: 12 }, (_, i) => `tas-${String(i + 1).padStart(2, "0")}`);
const tasResmi = (g) => `/dizim/${g}.webp?v=1`;
const MAX_TAS = 24;

const HAZIR = {
  "Kişiler": [["Ben", "ben"], ["Anne", "kisi"], ["Baba", "kisi"], ["Eş", "kisi"], ["Sevgili", "kisi"], ["Çocuk", "kisi"], ["Kardeş", "kisi"], ["Anneanne", "kisi"], ["Babaanne", "kisi"], ["Dede", "kisi"], ["Arkadaş", "kisi"], ["Patron", "kisi"]],
  "Mekânlar": [["Ev", "mekan"], ["İş", "mekan"], ["Okul", "mekan"], ["İstanbul", "mekan"], ["Memleket", "mekan"]],
  "Kavramlar": [["Geçmiş", "kavram"], ["Gelecek", "kavram"], ["Para", "kavram"], ["Sağlık", "kavram"], ["Sevgi", "kavram"], ["Korku", "kavram"], ["Hedefim", "kavram"]],
};

let durum = { ses: false, ai: false, kalan: 5, sinir: 5 };
let taslar = []; // { id, ad, tur, gorunum, x, y } — x null ise kenarda
let kayitlar = [];
let acikKayit = null;
let secilenler = [];
let sayac = 0;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3600);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
const kucuk = (s) => String(s).toLocaleLowerCase("tr-TR").trim();

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

// --- 1. adım: taş tanımlama ---

function siradakiGorunum() {
  const kullanilan = new Set(taslar.map((t) => t.gorunum));
  return GORUNUMLER.find((g) => !kullanilan.has(g)) || GORUNUMLER[taslar.length % GORUNUMLER.length];
}

function tasEkle(ad, tur) {
  ad = String(ad).replace(/\s+/g, " ").trim().slice(0, 30);
  if (!ad) return false;
  if (taslar.length >= MAX_TAS) { toast(`En fazla ${MAX_TAS} taş kullanabilirsin.`); return false; }
  if (taslar.some((t) => kucuk(t.ad) === kucuk(ad))) { toast(`"${ad}" zaten masada ya da kenarda.`); return false; }
  if (tur === "ben" && taslar.some((t) => t.tur === "ben")) tur = "kisi";
  sayac += 1;
  taslar.push({ id: `t${sayac}`, ad, tur, gorunum: siradakiGorunum(), x: null, y: null, yeni: true });
  return true;
}

function tasCikar(id) {
  taslar = taslar.filter((t) => t.id !== id);
  renderAll();
}

function renderPresets() {
  $("presets").replaceChildren(...Object.entries(HAZIR).map(([grup, liste]) => {
    const div = document.createElement("div");
    div.className = "preset-group";
    const b = document.createElement("b");
    b.textContent = grup;
    const chips = document.createElement("div");
    chips.className = "chips";
    liste.forEach(([ad, tur]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = ad;
      const var_ = taslar.find((t) => kucuk(t.ad) === kucuk(ad));
      btn.setAttribute("aria-pressed", String(Boolean(var_)));
      btn.addEventListener("click", () => {
        const t = taslar.find((x) => kucuk(x.ad) === kucuk(ad));
        if (t) tasCikar(t.id);
        else if (tasEkle(ad, tur)) renderAll();
      });
      chips.append(btn);
    });
    div.append(b, chips);
    return div;
  }));
}

$("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = $("addForm");
  if (tasEkle(f.elements.ad.value, f.elements.tur.value)) {
    f.elements.ad.value = "";
    renderAll();
  }
});

// --- Taş öğesi ---

function tasEl(t, { kenarda = false, sabit = false } = {}) {
  const div = document.createElement("div");
  div.className = `stone${benMi(t) ? " ben" : ""}${t.yeni ? " yeni" : ""}`;
  div.dataset.id = t.id;
  div.title = `${t.ad} · ${TURLER[t.tur] || ""}`;
  const img = document.createElement("img");
  img.src = tasResmi(t.gorunum);
  img.alt = "";
  img.draggable = false;
  const etiket = document.createElement("span");
  etiket.className = "etiket";
  etiket.textContent = t.ad;
  div.append(img, etiket);
  if (kenarda) {
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "sil";
    sil.textContent = "✕";
    sil.title = "Taşı kaldır";
    sil.setAttribute("aria-label", `${t.ad} taşını kaldır`);
    sil.addEventListener("pointerdown", (e) => e.stopPropagation());
    sil.addEventListener("click", (e) => { e.stopPropagation(); tasCikar(t.id); });
    div.append(sil);
  }
  if (t.x != null) {
    div.style.left = `${t.x * 100}%`;
    div.style.top = `${t.y * 100}%`;
  }
  if (!sabit) div.addEventListener("pointerdown", (e) => surukleBasla(e, t, div));
  t.yeni = false;
  return div;
}

// --- 2. adım: sürükle bırak (fare + dokunmatik, Pointer Events) ---

let surukleme = null;

function surukleBasla(e, t, el) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  const hayalet = el.cloneNode(true);
  hayalet.classList.add("tasiniyor");
  hayalet.style.left = `${e.clientX}px`;
  hayalet.style.top = `${e.clientY}px`;
  hayalet.querySelector(".sil")?.remove();
  document.body.append(hayalet);
  el.style.visibility = "hidden";
  surukleme = { t, el, hayalet, x0: e.clientX, y0: e.clientY, hareket: false };
  try { el.setPointerCapture(e.pointerId); } catch { /* sentetik olaylarda yakalama olmayabilir */ }
  el.addEventListener("pointermove", surukleHareket);
  el.addEventListener("pointerup", surukleBitir, { once: true });
  el.addEventListener("pointercancel", surukleBitir, { once: true });
}

function icinde(el, x, y) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function surukleHareket(e) {
  if (!surukleme) return;
  if (Math.hypot(e.clientX - surukleme.x0, e.clientY - surukleme.y0) > 5) surukleme.hareket = true;
  surukleme.hayalet.style.left = `${e.clientX}px`;
  surukleme.hayalet.style.top = `${e.clientY}px`;
  $("table").classList.toggle("uzerinde", icinde($("table"), e.clientX, e.clientY));
  $("tray").classList.toggle("uzerinde", icinde($("tray"), e.clientX, e.clientY));
}

function surukleBitir(e) {
  if (!surukleme) return;
  const { t, el, hayalet, hareket } = surukleme;
  el.removeEventListener("pointermove", surukleHareket);
  hayalet.remove();
  el.style.visibility = "";
  $("table").classList.remove("uzerinde");
  $("tray").classList.remove("uzerinde");
  surukleme = null;
  if (!hareket) {
    // Dokunup bırakma: kenardaki taşın görünümünü değiştir.
    if (t.x == null) {
      t.gorunum = GORUNUMLER[(GORUNUMLER.indexOf(t.gorunum) + 1) % GORUNUMLER.length];
      renderAll();
    }
    return;
  }
  const masa = $("table").getBoundingClientRect();
  if (e.type !== "pointercancel" && icinde($("table"), e.clientX, e.clientY)) {
    t.x = Math.min(0.97, Math.max(0.03, (e.clientX - masa.left) / masa.width));
    t.y = Math.min(0.94, Math.max(0.05, (e.clientY - masa.top) / masa.height));
  } else if (icinde($("tray"), e.clientX, e.clientY) || e.type === "pointercancel" || t.x == null) {
    if (e.type !== "pointercancel") { t.x = null; t.y = null; }
  } else {
    // Masanın dışına bırakılan masa taşı kenara döner.
    t.x = null;
    t.y = null;
  }
  renderBench();
}

function renderBench() {
  $("tray").replaceChildren(...taslar.filter((t) => t.x == null).map((t) => tasEl(t, { kenarda: true })));
  const masadakiler = taslar.filter((t) => t.x != null);
  $("table").replaceChildren(...masadakiler.map((t) => tasEl(t)));
  $("tableHint").hidden = masadakiler.length > 0;
  const kenarda = taslar.length - masadakiler.length;
  $("placedCount").textContent = taslar.length
    ? `Masada ${masadakiler.length} taş${kenarda ? ` · kenarda ${kenarda} taş (analize katılmaz)` : ""}`
    : "Önce yukarıdan taşlarını seç.";
  $("analyzeButton").disabled = masadakiler.length < 2 || (durum.kalan != null && durum.kalan <= 0);
}

function renderAll() {
  renderPresets();
  renderBench();
}

$("clearTable").addEventListener("click", () => {
  taslar.forEach((t) => { t.x = null; t.y = null; });
  renderBench();
});

function renderKota() {
  $("quota").textContent = durum.kalan == null ? "" : durum.kalan > 0
    ? `Bugün ${durum.kalan} dizim yansıması hakkın var (günde ${durum.sinir}).`
    : "Bugünkü dizim hakkını kullandın; masada yerleşim yapmaya yine devam edebilirsin, yansımayı yarın alabilirsin.";
  renderBench();
}

// --- Görüntü (snapshot): masa ve taşlar tuvale çizilir, JPEG olarak kaydedilir ---

const resimOnbellek = new Map();
const resimYukle = (src) => {
  if (!resimOnbellek.has(src)) {
    resimOnbellek.set(src, new Promise((ok, red) => { const i = new Image(); i.onload = () => ok(i); i.onerror = red; i.src = src; }));
  }
  return resimOnbellek.get(src);
};

async function goruntuCiz(liste) {
  const W = 1200;
  const H = Math.round(W * ORAN);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const masa = await resimYukle("/dizim/masa.webp?v=1");
  const olcek = Math.max(W / masa.width, H / masa.height);
  ctx.drawImage(masa, (W - masa.width * olcek) / 2, (H - masa.height * olcek) / 2, masa.width * olcek, masa.height * olcek);
  const kenar = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.75);
  kenar.addColorStop(0, "rgba(0,0,0,0)");
  kenar.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = kenar;
  ctx.fillRect(0, 0, W, H);
  const TAS = W * 0.075;
  for (const t of liste) {
    const img = await resimYukle(tasResmi(t.gorunum));
    const s = Math.min(TAS / img.width, (TAS * 0.82) / img.height);
    const w = img.width * s;
    const h = img.height * s;
    const cx = t.x * W;
    const cy = t.y * H;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 7;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
    ctx.font = "700 17px Manrope, sans-serif";
    const tw = Math.min(ctx.measureText(t.ad).width, 160);
    const ly = cy + h / 2 + 6;
    ctx.fillStyle = benMi(t) ? "#f3c26b" : "rgba(12,8,4,0.75)";
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2 - 10, ly, tw + 20, 26, 13);
    ctx.fill();
    ctx.fillStyle = benMi(t) ? "#1a1205" : "#fff8e8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.ad, cx, ly + 13, 160);
  }
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.86));
}

// --- Analiz ---

$("analyzeButton").addEventListener("click", async () => {
  const masadakiler = taslar.filter((t) => t.x != null);
  if (masadakiler.length < 2) return;
  const b = $("analyzeButton");
  b.disabled = true;
  b.textContent = "Yerleşimin okunuyor…";
  try {
    const response = await fetch("/api/dizim/analiz", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({
        niyet: $("niyet").value.trim(), oran: ORAN,
        taslar: masadakiler.map(({ id, ad, tur, gorunum, x, y }) => ({ id, ad, tur, gorunum, x, y })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Yansıma alınamadı.");
    durum.kalan = data.kalan;
    const kayit = data.kayit;
    // Görüntü ayrı yüklenir; olmazsa dizim yine kayıtlıdır.
    try {
      const jpeg = await goruntuCiz(kayit.taslar);
      const r = await fetch(`/api/dizim/gorsel?id=${kayit.id}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, credentials: "same-origin", body: jpeg });
      if (r.ok) kayit.gorsel = true;
    } catch (error) {
      console.warn("Dizim görüntüsü kaydedilemedi:", error);
    }
    kayitlar.unshift(kayit);
    showKayit(kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    b.textContent = "Yerleşimim tamam · Yansıt";
    renderKota();
  }
});

// --- Sonuç gösterimi ---

// Kayıttaki koordinatlardan masanın donmuş hâli + ölçüm katmanı (gruplar ve Ben'den çizgiler).
function donmusMasa(kayit, hedef, { olcum = true } = {}) {
  hedef.replaceChildren(...kayit.taslar.map((t) => tasEl(t, { sabit: true })));
  if (!olcum) return;
  const SVGNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 150 100");
  svg.setAttribute("preserveAspectRatio", "none");
  const a = kayit.analiz;
  const konum = Object.fromEntries(kayit.taslar.map((t) => [t.id, [t.x * 150, t.y * 100]]));
  const renkler = ["#f3c26b", "#7fd1b9", "#b388eb", "#ff9f7f", "#7fb8ff", "#e0e070"];
  a.kumeler.filter((k) => k.uyeler.length > 1).forEach((k, i) => {
    const noktalar = k.uyeler.map((id) => konum[id]);
    const cx = noktalar.reduce((s, p) => s + p[0], 0) / noktalar.length;
    const cy = noktalar.reduce((s, p) => s + p[1], 0) / noktalar.length;
    const r = Math.max(...noktalar.map((p) => Math.hypot(p[0] - cx, p[1] - cy))) + 9;
    const c = document.createElementNS(SVGNS, "ellipse");
    Object.entries({ cx, cy, rx: r, ry: r, fill: `${renkler[i % renkler.length]}22`, stroke: renkler[i % renkler.length], "stroke-width": 0.5, "stroke-dasharray": "2 1.5" })
      .forEach(([k2, v]) => c.setAttribute(k2, v));
    svg.append(c);
  });
  if (a.ben) {
    const [bx, by] = konum[a.ben.id];
    a.ben.siralama.forEach((s) => {
      const [x, y] = konum[s.id];
      const l = document.createElementNS(SVGNS, "line");
      const yakinlik = 1 - Math.min(1, s.mesafe / 60);
      Object.entries({ x1: bx, y1: by, x2: x, y2: y, stroke: `rgba(255,236,190,${0.25 + yakinlik * 0.6})`, "stroke-width": 0.3 + yakinlik * 0.7 })
        .forEach(([k2, v]) => l.setAttribute(k2, v));
      svg.append(l);
    });
  }
  hedef.prepend(svg);
}

function liste(id, items) {
  $(id).replaceChildren(...items.map((x) => { const li = document.createElement("li"); li.textContent = x; return li; }));
}

function olcumTablosu(a, tablo) {
  tablo.innerHTML = "<thead><tr><th>Taş</th><th>Tür</th><th>Konum</th><th class=\"num\">Merkeze</th><th>En yakın</th><th>En uzak</th><th>Grup</th><th>Not</th></tr></thead><tbody></tbody>";
  tablo.querySelector("tbody").replaceChildren(...a.taslar.map((t) => {
    const tr = document.createElement("tr");
    const hucre = (metin, cls = "") => { const td = document.createElement("td"); td.textContent = metin; if (cls) td.className = cls; tr.append(td); };
    hucre(t.ad);
    hucre(TURLER[t.tur] || t.tur);
    hucre(t.konum);
    hucre(String(t.dizimMerkezine), "num");
    hucre(t.enYakin ? `${t.enYakin.ad} (${t.enYakin.mesafe})` : "—", "yakin");
    hucre(t.enUzak ? `${t.enUzak.ad} (${t.enUzak.mesafe})` : "—", "uzak");
    hucre(t.grupta ? String(t.kume) : "tek");
    hucre([t.yalniz ? "diğerlerinden uzak" : "", t.masaKenarinda ? "masa kenarında" : ""].filter(Boolean).join(", ") || "—");
    return tr;
  }));
}

function showKayit(kayit, kaydir = false) {
  stopVoice();
  acikKayit = kayit;
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  $("resultMeta").textContent = [tarih(kayit.tarih), `${kayit.taslar.length} taş`, kayit.niyet ? `“${kayit.niyet}”` : ""].filter(Boolean).join(" · ");
  $("resultTitle").textContent = y.baslik;
  $("resultBadge").textContent = kayit.kaynak === "ai" ? "✨ Yansıma" : "📐 Ölçümlerden";
  donmusMasa(kayit, $("frozen"));
  $("frozen").classList.toggle("olcum", $("showMeasures").checked);
  $("resultOverview").textContent = y.genelBakis;
  $("observations").replaceChildren(...y.gozlemler.map((g, i) => {
    const div = document.createElement("div");
    div.style.animationDelay = `${i * 0.08}s`;
    div.innerHTML = "<b></b><p></p>";
    div.querySelector("b").textContent = g.baslik;
    div.querySelector("p").textContent = g.metin;
    return div;
  }));
  $("benText").textContent = y.benVeCevresi;
  $("benBox").hidden = !y.benVeCevresi;
  $("groupText").textContent = y.gruplar;
  $("groupBox").hidden = !y.gruplar;
  liste("questions", y.sorular);
  $("questionsBox").hidden = !y.sorular.length;
  $("releaseText").textContent = y.arinma?.metin || "";
  liste("releaseSteps", y.arinma?.adimlar || []);
  $("releaseBox").hidden = !y.arinma?.metin;
  $("affirmation").textContent = y.olumlama;
  olcumTablosu(kayit.analiz, $("measureTable"));
  const s = kayit.analiz.sekil;
  $("shapeText").textContent = `Genel şekil: ${s.ad}${s.yayilim != null ? ` · ortalama yayılım ${s.yayilim}` : ""} · ${kayit.analiz.kumeler.filter((k) => k.uyeler.length > 1).length} grup.`;
  bindListen($("resultListen"), () => `/api/dizim/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".dizim-journal li").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("showMeasures").addEventListener("change", (e) => $("frozen").classList.toggle("olcum", e.target.checked));

$("reuseButton").addEventListener("click", () => {
  if (!acikKayit) return;
  taslar = acikKayit.taslar.map((t) => ({ ...t, x: null, y: null, yeni: true }));
  sayac = taslar.length + 1;
  taslar.forEach((t, i) => { t.id = `t${i + 1}`; });
  $("niyet").value = acikKayit.niyet || "";
  renderAll();
  $("masa-bolumu").scrollIntoView({ behavior: "smooth", block: "start" });
  toast("Taşların kenarda; yeniden yerleştirebilirsin.");
});

const uzmanKarti = UzmanKarti({ bolum: "dizim", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Dizimlerim ---

function renderJournal() {
  const list = $("journal");
  secilenler = secilenler.filter((id) => kayitlar.some((k) => k.id === id));
  renderCompareBar();
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz bir dizimin yok. Yukarıda taşlarını seçip masaya yerleştirerek başla.</li>';
    return;
  }
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.dataset.id = k.id;
    li.className = `${acikKayit?.id === k.id ? "is-current" : ""}${secilenler.includes(k.id) ? " secili" : ""}`;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open";
    open.innerHTML = "<div class=\"thumb\"></div><div class=\"meta\"><b></b><small></small><p></p></div>";
    open.querySelector(".thumb").style.backgroundImage = k.gorsel ? `url(/api/dizim/gorsel?id=${k.id})` : "url(/dizim/masa.webp?v=1)";
    open.querySelector("b").textContent = k.yorum.baslik;
    open.querySelector("small").textContent = tarih(k.tarih);
    open.querySelector("p").textContent = k.taslar.map((t) => t.ad).join(", ");
    open.addEventListener("click", () => showKayit(k, true));
    const pick = document.createElement("label");
    pick.className = "pick";
    pick.innerHTML = "<input type=\"checkbox\" /> <span>Karşılaştır</span>";
    pick.querySelector("input").checked = secilenler.includes(k.id);
    pick.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) {
        secilenler.push(k.id);
        if (secilenler.length > 2) secilenler.shift();
      } else secilenler = secilenler.filter((x) => x !== k.id);
      renderJournal();
    });
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.textContent = "✕";
    sil.title = "Bu dizimi sil";
    sil.setAttribute("aria-label", "Bu dizimi sil");
    sil.addEventListener("click", async () => {
      if (!confirm("Bu dizim ve görüntüsü silinsin mi?")) return;
      const r = await fetch("/api/dizim/sil", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id: k.id }) });
      if (!r.ok) { toast("Silinemedi."); return; }
      kayitlar = kayitlar.filter((x) => x.id !== k.id);
      if (acikKayit?.id === k.id) { acikKayit = null; $("sonuc").hidden = true; stopVoice(); }
      renderJournal();
    });
    li.append(open, pick, sil);
    return li;
  }));
}

function renderCompareBar() {
  $("compareBar").hidden = !secilenler.length;
  $("compareInfo").textContent = secilenler.length === 2 ? "İki dizim seçildi." : "Karşılaştırmak için bir dizim daha seç.";
  $("compareButton").disabled = secilenler.length !== 2;
}

$("compareButton").addEventListener("click", async () => {
  const b = $("compareButton");
  b.disabled = true;
  b.textContent = "Karşılaştırılıyor…";
  try {
    const r = await fetch("/api/dizim/karsilastir", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ a: secilenler[0], b: secilenler[1] }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Karşılaştırılamadı.");
    karsilastirmaGoster(data);
  } catch (error) {
    toast(error.message);
  } finally {
    b.textContent = "Karşılaştır";
    renderCompareBar();
  }
});

function karsilastirmaGoster({ fark, yorum }) {
  const [eski, yeni] = secilenler.map((id) => kayitlar.find((k) => k.id === id)).sort((p, q) => p.tarih - q.tarih);
  $("karsilastirma").hidden = false;
  $("comparePair").replaceChildren(...[eski, yeni].map((k, i) => {
    const fig = document.createElement("figure");
    const kutu = document.createElement("div");
    kutu.className = "frozen";
    donmusMasa(k, kutu, { olcum: false });
    const cap = document.createElement("figcaption");
    cap.textContent = `${i ? "Sonra" : "Önce"} · ${tarih(k.tarih)}`;
    fig.append(kutu, cap);
    return fig;
  }));
  $("compareSummary").textContent = yorum?.ozet
    || (fark.ortak.length < 2 ? "İki dizimde ortak taş çok az; karşılaştırma için aynı adları kullanan dizimler seçebilirsin." : "Ortak taşların arasındaki uzaklık değişimleri aşağıda.");
  liste("compareChanges", [
    ...(yorum?.degisimler || []),
    ...(fark.yalnizEskide.length ? [`Yalnız ilk dizimde: ${fark.yalnizEskide.join(", ")}`] : []),
    ...(fark.yalnizYenide.length ? [`Yalnız sonraki dizimde: ${fark.yalnizYenide.join(", ")}`] : []),
    ...fark.konumDegisimi.map((d) => `${d.ad}: ${d.once} → ${d.sonra}`),
  ]);
  const tablo = $("compareTable");
  tablo.innerHTML = "<thead><tr><th>Çift</th><th class=\"num\">Önce</th><th class=\"num\">Sonra</th><th>Değişim</th></tr></thead><tbody></tbody>";
  tablo.querySelector("tbody").replaceChildren(...fark.ciftler.slice(0, 12).map((c) => {
    const tr = document.createElement("tr");
    [`${c.a} – ${c.b}`, c.once, c.sonra].forEach((v, i) => { const td = document.createElement("td"); td.textContent = v; if (i) td.className = "num"; tr.append(td); });
    const td = document.createElement("td");
    td.className = c.degisim < 0 ? "yakin" : c.degisim > 0 ? "uzak" : "";
    td.textContent = Math.abs(c.degisim) < 2 ? "≈ aynı" : c.degisim < 0 ? `yakınlaştı (${c.degisim})` : `uzaklaştı (+${c.degisim})`;
    tr.append(td);
    return tr;
  }));
  liste("compareQuestions", yorum?.sorular || []);
  $("compareQuestionsBox").hidden = !yorum?.sorular?.length;
  $("karsilastirma").scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/tas")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/dizim/liste", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ses: data.ses, ai: data.ai, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  if (!taslar.length) tasEkle("Ben", "ben");
  renderAll();
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

init();
