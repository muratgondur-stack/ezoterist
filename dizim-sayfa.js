const { TURLER, benMi } = DizimHesap;
const $ = (id) => document.getElementById(id);
const ORAN = 1; // masa yüksekliği / genişliği: kare masa (Murat 2026-10-03; eski kayıtlar 2/3, kendi oranlarıyla gösterilir)
const GORUNUMLER = Array.from({ length: 12 }, (_, i) => `tas-${String(i + 1).padStart(2, "0")}`);
const tasResmi = (g) => `/dizim/${g}.webp?v=1`;
const MAX_TAS = 32; // gedik sayısı kadar

// Masadaki gedikler (Murat 2026-10-03): taşlar serbest durmaz, iç ve dış iki çemberdeki gediklere oturur.
// Kare masada üç tam çember, dıştan içe 16-10-6 gedik (Murat 2026-10-03, 32 taş); yarıçaplar masa kenarı cinsinden.
// Merkezdeki sedef rozet iç çemberin içinde, köşelerdeki sedef işaretler dış çemberin dışında kalır (dizim/masa-kare.webp).
// Rastgele dizimde kişiler dışta, kavramlar ortada, mekânlar içte durur.
const HALKALAR = [
  { ad: "dis", adet: 16, rx: 0.39, ry: 0.39, kayma: 0 },
  { ad: "orta", adet: 10, rx: 0.277, ry: 0.277, kayma: 0.5 },
  { ad: "ic", adet: 6, rx: 0.168, ry: 0.168, kayma: 0 },
];
const HALKA_TURU = { kisi: "dis", ben: "dis", kavram: "orta", mekan: "ic" };
const halkaAcisi = (h, i) => -Math.PI / 2 + ((i + h.kayma) * 2 * Math.PI) / h.adet;
const GEDIKLER = HALKALAR.flatMap((h, hi) => Array.from({ length: h.adet }, (_, i) => {
  const aci = halkaAcisi(h, i);
  return { halka: h.ad, hi, sira: i, x: 0.5 + (h.rx * Math.cos(aci)) * ORAN, y: 0.5 + h.ry * Math.sin(aci) };
}));
const gedikNo = (hi, sira) => GEDIKLER.findIndex((g) => g.hi === hi && g.sira === sira);

// Köşe sembolleri çemberleri döndürür (Murat 2026-10-03): her çember kendi yönüne, sembole göre farklı hızda
// 4 saniye döner, yavaşlayarak gediklere tam oturur; taşlar çemberleri içinde yer değiştirmiş olur.
// tur: dış, orta, iç çemberin kaç tur döneceği (hız); yon: +1 saat yönü, -1 ters.
const KOSELER = [
  { ad: "Güneş", yer: "sol-ust", tur: [2, 3, 4], yon: [1, -1, 1] },
  { ad: "Ay", yer: "sag-ust", tur: [0.5, 1, 1.5], yon: [-1, 1, -1] },
  { ad: "Yıldız", yer: "sol-alt", tur: [1, 2, 3], yon: [1, 1, -1] },
  { ad: "Göz", yer: "sag-alt", tur: [3, 5, 7], yon: [-1, 1, -1] },
];
const DONME_SURESI = 4000;
let doniyor = false;

const HAZIR = {
  "Kişiler": [["Ben", "ben"], ["Anne", "kisi"], ["Baba", "kisi"], ["Eş", "kisi"], ["Sevgili", "kisi"], ["Çocuk", "kisi"], ["Kardeş", "kisi"], ["Anneanne", "kisi"], ["Babaanne", "kisi"], ["Dede", "kisi"], ["Arkadaş", "kisi"], ["Patron", "kisi"], ["Amca", "kisi"], ["Dayı", "kisi"], ["Teyze", "kisi"], ["Hala", "kisi"]],
  "Mekânlar": [["Ev", "mekan"], ["İş", "mekan"], ["Okul", "mekan"], ["İstanbul", "mekan"], ["Memleket", "mekan"], ["Doğa", "mekan"]],
  "Kavramlar": [["Geçmiş", "kavram"], ["Gelecek", "kavram"], ["Para", "kavram"], ["Sağlık", "kavram"], ["Sevgi", "kavram"], ["Korku", "kavram"], ["Hedefim", "kavram"], ["Özgürlük", "kavram"], ["Ruhsallık", "kavram"], ["Kariyer", "kavram"]],
};

let durum = { ses: false, ai: false, kalan: 5, sinir: 5 };
let taslar = []; // { id, ad, tur, gorunum, x, y, gedik } — x null ise kenarda; gedik: GEDIKLER sırası
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

// Masada, bırakılan noktaya en yakın boş gedik (taşın kendi gediği boş sayılır).
function enYakinGedik(nx, ny, t) {
  const dolu = new Set(taslar.filter((s) => s !== t && s.x != null && s.gedik != null).map((s) => s.gedik));
  let en = null;
  GEDIKLER.forEach((g, i) => {
    if (dolu.has(i)) return;
    const d = Math.hypot((g.x - nx) / ORAN, g.y - ny);
    if (!en || d < en.d) en = { i, d };
  });
  return en?.i ?? null;
}

function gediklereBak(e) {
  const tablo = $("table");
  const ustunde = icinde(tablo, e.clientX, e.clientY);
  tablo.classList.toggle("uzerinde", ustunde);
  $("tray").classList.toggle("uzerinde", icinde($("tray"), e.clientX, e.clientY));
  const r = tablo.getBoundingClientRect();
  const hedef = ustunde ? enYakinGedik((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, surukleme.t) : null;
  tablo.querySelectorAll(".gedik").forEach((g) => g.classList.toggle("hedef", Number(g.dataset.i) === hedef));
}

// Sürüklemede olaylar pencereye bağlanır: taş elemanı gizlenince ya da yeniden çizilince imleç takibi kaybolmaz,
// elde tutulan kopya sayfada asılı kalmaz.
function surukleBasla(e, t, el) {
  if (e.button !== undefined && e.button !== 0) return;
  if (doniyor) { e.preventDefault(); return; }
  e.preventDefault();
  surukleTemizle();
  const hayalet = el.cloneNode(true);
  hayalet.classList.add("tasiniyor");
  hayalet.style.left = `${e.clientX}px`;
  hayalet.style.top = `${e.clientY}px`;
  hayalet.querySelector(".sil")?.remove();
  document.body.append(hayalet);
  el.classList.add("kaynak");
  surukleme = { t, el, hayalet, x0: e.clientX, y0: e.clientY, hareket: false, pointerId: e.pointerId };
  window.addEventListener("pointermove", surukleHareket);
  window.addEventListener("pointerup", surukleBitir);
  window.addEventListener("pointercancel", surukleBitir);
  window.addEventListener("blur", surukleTemizle);
}

function surukleTemizle() {
  window.removeEventListener("pointermove", surukleHareket);
  window.removeEventListener("pointerup", surukleBitir);
  window.removeEventListener("pointercancel", surukleBitir);
  window.removeEventListener("blur", surukleTemizle);
  document.querySelectorAll(".stone.tasiniyor").forEach((h) => h.remove());
  document.querySelectorAll(".stone.kaynak").forEach((k) => k.classList.remove("kaynak"));
  $("table").classList.remove("uzerinde");
  $("tray").classList.remove("uzerinde");
  $("table").querySelectorAll(".gedik.hedef").forEach((g) => g.classList.remove("hedef"));
  surukleme = null;
}

function icinde(el, x, y) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function surukleHareket(e) {
  if (!surukleme || (surukleme.pointerId != null && e.pointerId !== surukleme.pointerId)) return;
  if (Math.hypot(e.clientX - surukleme.x0, e.clientY - surukleme.y0) > 5) surukleme.hareket = true;
  surukleme.hayalet.style.left = `${e.clientX}px`;
  surukleme.hayalet.style.top = `${e.clientY}px`;
  gediklereBak(e);
}

function surukleBitir(e) {
  if (!surukleme || (surukleme.pointerId != null && e.pointerId !== surukleme.pointerId)) return;
  const { t, hareket } = surukleme;
  surukleTemizle();
  if (!hareket) {
    // Dokunup bırakma: kenardaki taşın görünümünü değiştir; masadaki taşın kısaltılmış adını tam göster.
    if (t.x == null) {
      t.gorunum = GORUNUMLER[(GORUNUMLER.indexOf(t.gorunum) + 1) % GORUNUMLER.length];
      renderAll();
    } else {
      adiGoster(t.id);
    }
    return;
  }
  const masa = $("table").getBoundingClientRect();
  if (e.type !== "pointercancel" && icinde($("table"), e.clientX, e.clientY)) {
    const i = enYakinGedik((e.clientX - masa.left) / masa.width, (e.clientY - masa.top) / masa.height, t);
    if (i == null) {
      toast("Masadaki bütün gedikler dolu. Önce bir taşı kenara al.");
    } else {
      gedigeKoy(t, i);
    }
  } else if (e.type !== "pointercancel") {
    // Masanın dışına bırakılan taş kenara döner.
    gedigeKoy(t, null);
  }
  renderBench();
}

// Masadaki taşa dokununca adı birkaç saniye tam görünür (telefonda uzun adlar kısaltılmış durur).
let adTimer;
function adiGoster(id) {
  clearTimeout(adTimer);
  $("table").querySelectorAll(".stone.adi-acik").forEach((e) => e.classList.remove("adi-acik"));
  const el = $("table").querySelector(`.stone[data-id="${id}"]`);
  if (!el) return;
  el.classList.add("adi-acik");
  adTimer = setTimeout(() => el.classList.remove("adi-acik"), 2600);
}

function gedigeKoy(t, i) {
  t.gedik = i;
  t.x = i == null ? null : GEDIKLER[i].x;
  t.y = i == null ? null : GEDIKLER[i].y;
}

// Gediğe oturmamış masa taşı (eski serbest yerleşim) en yakın boş gediğe alınır.
function gedikleriDuzelt() {
  taslar.filter((t) => t.x != null && (t.gedik == null || GEDIKLER[t.gedik].x !== t.x)).forEach((t) => {
    const i = enYakinGedik(t.x, t.y, t);
    gedigeKoy(t, i);
  });
}

// Masanın ortasındaki sedef rozet: tıklanınca bütün taşlar gediklere rastgele dizilir (Murat 2026-10-03).
function merkezRozet() {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "merkez-rozet";
  b.title = "Taşları rastgele diz";
  b.setAttribute("aria-label", "Taşları gediklere rastgele diz");
  b.addEventListener("click", rastgeleDiz);
  return b;
}

function koseDugmeleri() {
  return KOSELER.map((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `kose-sembol ${k.yer}`;
    b.title = `${k.ad}: çemberleri döndür`;
    b.setAttribute("aria-label", `${k.ad} sembolü: taş çemberlerini döndür`);
    b.addEventListener("click", () => cemberleriDondur(k));
    return b;
  });
}

// Dönme sesi (Web Audio, dosyasız): hıza göre kısılan taş hışırtısı, gedik geçişlerinde tıkırtı, sonda yumuşak "tak".
let sesBaglami = null;
function tasSesi() {
  try {
    sesBaglami = sesBaglami || new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return null;
  }
  const ctx = sesBaglami;
  ctx.resume?.();
  const gurultu = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const veri = gurultu.getChannelData(0);
  let son = 0;
  for (let i = 0; i < veri.length; i += 1) {
    son = son * 0.86 + (Math.random() * 2 - 1) * 0.14; // kahverengi gürültü: kaba, taşa benzer
    veri[i] = son * 3;
  }
  const kaynak = ctx.createBufferSource();
  kaynak.buffer = gurultu;
  kaynak.loop = true;
  const suzgec = ctx.createBiquadFilter();
  suzgec.type = "bandpass";
  suzgec.frequency.value = 520;
  suzgec.Q.value = 0.9;
  const ses = ctx.createGain();
  ses.gain.value = 0;
  kaynak.connect(suzgec).connect(ses).connect(ctx.destination);
  kaynak.start();
  const vurus = (guc, frekans) => {
    const t0 = ctx.currentTime;
    const b = ctx.createBufferSource();
    b.buffer = gurultu;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = frekans * (0.85 + Math.random() * 0.3);
    f.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(guc, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    b.connect(f).connect(g).connect(ctx.destination);
    b.start(t0, Math.random() * 1.5, 0.08);
  };
  return {
    hiz(v) {
      // v: 0..1 göreli hız
      ses.gain.setTargetAtTime(0.34 * v, ctx.currentTime, 0.05);
      suzgec.frequency.setTargetAtTime(300 + 500 * v, ctx.currentTime, 0.05);
    },
    tik(v) { vurus(0.12 + 0.2 * v, 1700); },
    bitir() {
      ses.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      vurus(0.45, 1100);
      setTimeout(() => vurus(0.3, 1400), 70);
      setTimeout(() => { try { kaynak.stop(); } catch { /* zaten durdu */ } }, 600);
    },
  };
}

function cemberleriDondur(kose) {
  if (doniyor) return;
  const masadakiler = taslar.filter((t) => t.x != null && t.gedik != null);
  if (!masadakiler.length) { toast("Önce masaya taş koy; sonra köşedeki sembole dokun."); return; }
  doniyor = true;
  $("table").classList.add("doniyor");
  // Her çember: toplam adım = tur × gedik sayısı + rastgele 0..n-1 ek adım (taşlar karışsın), yönüyle.
  const adim = HALKALAR.map((h, hi) => kose.yon[hi] * (Math.round(kose.tur[hi] * h.adet) + Math.floor(Math.random() * h.adet)));
  const parcalar = masadakiler.map((t) => {
    const g = GEDIKLER[t.gedik];
    return { t, g, h: HALKALAR[g.hi], el: $("table").querySelector(`.stone[data-id="${t.id}"]`) };
  });
  const yavasla = (u) => 1 - (1 - u) ** 3;
  // Ses yalnız süs: bir hata dönmeyi asla durdurmasın.
  let sesler = null;
  try { sesler = tasSesi(); } catch { sesler = null; }
  const sesle = (fn) => { try { fn(); } catch { /* ses olmadan devam */ } };
  let gecilen = 0; // dış çemberde geçilen gedik sayısı (tıkırtı için)
  const bas = performance.now();
  const kare = (simdi) => {
    const u = Math.min(1, (simdi - bas) / DONME_SURESI);
    const k = yavasla(u);
    const hiz = (1 - u) ** 2; // türev (3(1-u)²) / 3
    if (sesler) {
      sesle(() => sesler.hiz(hiz));
      const adimSayisi = Math.floor(Math.abs(adim[0]) * k);
      if (adimSayisi > gecilen) { gecilen = adimSayisi; sesle(() => sesler.tik(hiz)); }
    }
    parcalar.forEach(({ g, h, el }) => {
      if (!el) return;
      const aci = halkaAcisi(h, g.sira + adim[g.hi] * k);
      el.style.left = `${(0.5 + h.rx * Math.cos(aci) * ORAN) * 100}%`;
      el.style.top = `${(0.5 + h.ry * Math.sin(aci)) * 100}%`;
    });
    if (u < 1) { requestAnimationFrame(kare); return; }
    parcalar.forEach(({ t, g, h }) => {
      const yeniSira = (((g.sira + adim[g.hi]) % h.adet) + h.adet) % h.adet;
      gedigeKoy(t, gedikNo(g.hi, yeniSira));
    });
    if (sesler) sesle(() => sesler.bitir());
    doniyor = false;
    $("table").classList.remove("doniyor");
    renderBench();
  };
  requestAnimationFrame(kare);
}

function karistir(dizi) {
  for (let i = dizi.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
  }
  return dizi;
}

// Her taş türünün çemberine (kişi dış, kavram orta, mekân iç) rastgele bir gediğe; o çember doluysa en yakın çembere.
function rastgeleDiz() {
  if (!taslar.length) { toast("Önce yukarıdan taşlarını seç."); return; }
  const bos = Object.fromEntries(HALKALAR.map((h) => [h.ad, karistir(GEDIKLER.map((g, i) => i).filter((i) => GEDIKLER[i].halka === h.ad))]));
  const sira = HALKALAR.map((h) => h.ad);
  const yedek = (ad) => [...sira].sort((a, b) => Math.abs(sira.indexOf(a) - sira.indexOf(ad)) - Math.abs(sira.indexOf(b) - sira.indexOf(ad)));
  karistir([...taslar]).forEach((t) => {
    const halka = yedek(HALKA_TURU[t.tur] || "dis").find((h) => bos[h].length);
    gedigeKoy(t, halka ? bos[halka].pop() : null);
    t.yeni = true;
  });
  renderBench();
  toast("Taşlar dizildi: kişiler dışta, kavramlar ortada, mekânlar içte.");
}

// Hazır listedeki bütün taşlar tek tuşla masa yanındaki tablaya gelir; hepsi zaten varsa masadakiler tablaya döner.
function hepsiniGetir() {
  const once = taslar.length;
  Object.values(HAZIR).flat().forEach(([ad, tur]) => {
    if (taslar.length < MAX_TAS && !taslar.some((t) => kucuk(t.ad) === kucuk(ad))) tasEkle(ad, tur);
  });
  if (taslar.length === once) taslar.forEach((t) => gedigeKoy(t, null));
  renderAll();
  toast(taslar.length > once ? `${taslar.length - once} taş tablaya geldi.` : "Bütün taşlar tablada.");
}

function gedikElleri() {
  return GEDIKLER.map((g, i) => {
    const d = document.createElement("span");
    d.className = `gedik ${g.halka}`;
    d.dataset.i = String(i);
    d.style.left = `${g.x * 100}%`;
    d.style.top = `${g.y * 100}%`;
    d.setAttribute("aria-hidden", "true");
    return d;
  });
}

function renderBench() {
  $("tray").replaceChildren(...taslar.filter((t) => t.x == null).map((t) => tasEl(t, { kenarda: true })));
  gedikleriDuzelt();
  const masadakiler = taslar.filter((t) => t.x != null);
  $("table").replaceChildren(...gedikElleri(), merkezRozet(), ...koseDugmeleri(), ...masadakiler.map((t) => tasEl(t)));
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

$("bringAll").addEventListener("click", hepsiniGetir);

$("clearTable").addEventListener("click", () => {
  taslar.forEach((t) => gedigeKoy(t, null));
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
  const masa = await resimYukle("/dizim/masa-kare.webp?v=2");
  const olcek = Math.max(W / masa.width, H / masa.height);
  ctx.drawImage(masa, (W - masa.width * olcek) / 2, (H - masa.height * olcek) / 2, masa.width * olcek, masa.height * olcek);
  const kenar = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.78);
  kenar.addColorStop(0, "rgba(0,0,0,0)");
  kenar.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = kenar;
  ctx.fillRect(0, 0, W, H);
  // Gedikler: masaya oyulmuş çukurlar
  for (const g of GEDIKLER) {
    const gx = g.x * W;
    const gy = g.y * H;
    const oyuk = ctx.createRadialGradient(gx, gy - 4, 4, gx, gy, W * 0.036);
    oyuk.addColorStop(0, "rgba(0,0,0,0.55)");
    oyuk.addColorStop(0.8, "rgba(0,0,0,0.35)");
    oyuk.addColorStop(1, "rgba(255,220,170,0.12)");
    ctx.fillStyle = oyuk;
    ctx.beginPath();
    ctx.ellipse(gx, gy, W * 0.036, W * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const TAS = W * 0.068;
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
  // Gedikli yerleşimse (bütün taşlar gediklerde) gedikler de çizilir.
  const oran = Number(kayit.oran) || 2 / 3;
  const kare = Math.abs(oran - 1) < 0.01;
  hedef.style.aspectRatio = String(1 / oran);
  hedef.classList.toggle("kare", kare);
  const gedikli = kare && kayit.taslar.every((t) => GEDIKLER.some((g) => Math.abs(g.x - t.x) < 0.003 && Math.abs(g.y - t.y) < 0.003));
  hedef.replaceChildren(...(gedikli ? gedikElleri() : []), ...kayit.taslar.map((t) => tasEl(t, { sabit: true })));
  if (!olcum) return;
  const SVGNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(SVGNS, "svg");
  const VG = 100 / oran; // görünüm genişliği (yükseklik 100); daireler daire kalsın
  svg.setAttribute("viewBox", `0 0 ${VG} 100`);
  svg.setAttribute("preserveAspectRatio", "none");
  const a = kayit.analiz;
  const konum = Object.fromEntries(kayit.taslar.map((t) => [t.id, [t.x * VG, t.y * 100]]));
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
  window.yorumcuGoster?.(kayit); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
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
  taslar = acikKayit.taslar.map((t) => ({ ...t, x: null, y: null, gedik: null, yeni: true }));
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
    open.querySelector(".thumb").style.backgroundImage = k.gorsel ? `url(/api/dizim/gorsel?id=${k.id})` : "url(/dizim/masa-kare.webp?v=2)";
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
    window.location.replace(`/login?next=${encodeURIComponent("/taslarla-dizim")}`);
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
