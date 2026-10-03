const { rakamlar, sayilar, sozluk, yorumla, kisiselSayi } = MelekVeri;
const $ = (id) => document.getElementById(id);

let durum = { ses: false, kalan: 5, sinir: 5 };
let kayitlar = [];
let acikKayit = null;
let seciliSayi = "";
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3400);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
// Resim, sayıda tekrar eden rakamdan (555 → 5); tekrar yoksa sayının kökünden seçilir.
function resim(sayi) {
  const sayim = {};
  String(sayi).split("").forEach((d) => { sayim[d] = (sayim[d] || 0) + 1; });
  const [rakam, adet] = Object.entries(sayim).sort((a, b) => b[1] - a[1])[0];
  return `/melek/r${adet > 1 ? rakam : yorumla(sayi).kok}.webp?v=1`;
}

// Rakamları tek tek ışıyarak beliren bir sayı.
function isikliSayi(sayi, gecikme = 0.12) {
  const span = document.createElement("span");
  span.className = "glow-digits";
  span.setAttribute("aria-label", sayi);
  String(sayi).split("").forEach((d, i) => {
    const s = document.createElement("span");
    s.textContent = d;
    s.style.animationDelay = `${i * gecikme}s`;
    span.append(s);
  });
  return span;
}

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

// --- Giriş: süzülen sayılar ---

function renderFloating() {
  const kutu = $("floatingNumbers");
  const secim = ["111", "222", "333", "444", "555", "777", "888", "999", "1111", "1212"];
  kutu.replaceChildren(...secim.map((s, i) => {
    const span = document.createElement("span");
    span.textContent = s;
    const aci = (i / secim.length) * Math.PI * 2;
    span.style.left = `${50 + Math.cos(aci) * 44}%`;
    span.style.top = `${50 + Math.sin(aci) * 40}%`;
    span.style.fontSize = `${1 + (i % 3) * 0.35}rem`;
    span.style.animationDelay = `${i * 0.9}s`;
    return span;
  }));
}

// --- Günün sayısı ---

function renderToday() {
  const gun = Math.floor((Date.now() + 3 * 3600000) / 86400000);
  const s = sayilar[(gun * 7) % sayilar.length];
  $("todayDate").textContent = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const kart = $("todayCard");
  kart.innerHTML = `<div class="visual"><img src="${resim(s.sayi)}" alt="" width="220" height="220" loading="lazy" /></div>
    <div><h3></h3><p></p><p class="affirmation"></p><button type="button" class="btn btn-ghost">Ayrıntısını aç</button></div>`;
  kart.querySelector(".visual").append(isikliSayi(s.sayi, 0.25));
  kart.querySelector("h3").textContent = s.baslik;
  kart.querySelector("p").textContent = s.mesaj;
  kart.querySelector(".affirmation").textContent = s.olumlama;
  kart.querySelector("button").addEventListener("click", () => sorgula(s.sayi, true));
}

// --- Sorgu ---

const form = $("numberForm");
const sayiInput = form.elements.sayi;
sayiInput.addEventListener("input", () => { sayiInput.value = sayiInput.value.replace(/\D/g, "").slice(0, 6); });

function renderChips() {
  const populer = ["111", "222", "333", "444", "555", "777", "888", "1010", "1111", "1212", "1234", "2222"];
  $("numberChips").replaceChildren(...populer.map((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = s;
    b.addEventListener("click", () => sorgula(s, true));
    return b;
  }));
}

function sorgula(sayi, kaydir = false) {
  const temiz = String(sayi).replace(/\D/g, "");
  if (temiz.length < 2 || temiz.length > 6) { toast("2 ile 6 basamaklı bir sayı yaz (ör. 111, 1212)."); return; }
  seciliSayi = temiz;
  sayiInput.value = temiz;
  const a = yorumla(temiz);
  $("meaning").hidden = false;
  $("meaningImage").src = resim(temiz);
  $("meaningNumber").replaceChildren(isikliSayi(temiz));
  $("meaningRoot").textContent = `Kökü ${a.kok} · ${rakamlar[a.kok].ad}${a.kaynak === "rakam" ? " · rakamlarından yorum" : ""}`;
  $("meaningTitle").textContent = a.baslik;
  $("meaningMessage").textContent = a.mesaj;
  const alanlar = [["Aşk", a.ask], ["İş ve para", a.is], ["Ruhsal yol", a.ruhsal]].filter(([, t]) => t);
  $("meaningAreas").replaceChildren(...alanlar.map(([b, t]) => {
    const li = document.createElement("li");
    li.innerHTML = "<b></b>";
    li.firstChild.textContent = b;
    li.append(t);
    return li;
  }));
  const rakamListesi = a.kaynak === "rakam" ? [...new Set(temiz.split(""))] : [];
  $("digitList").replaceChildren(...rakamListesi.map((d) => {
    const li = document.createElement("li");
    li.innerHTML = "<b></b><span></span>";
    li.querySelector("b").textContent = d;
    li.querySelector("span").textContent = `${rakamlar[d].ad}: ${rakamlar[d].anlam}`;
    return li;
  }));
  $("meaningAffirmation").textContent = a.olumlama;
  // Yeni sayı seçilince kart animasyonu baştan oynasın.
  const kart = document.querySelector(".meaning-card");
  kart.style.animation = "none";
  void kart.offsetWidth;
  kart.style.animation = "";
  if (kaydir) $("sorgula").scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (e) => { e.preventDefault(); sorgula(sayiInput.value); });

// --- Kişisel mesaj ---

const personal = $("personalForm");
const YERLER = ["Saatte", "Plakada", "Telefonda", "Fişte / faturada", "Rüyamda", "Adreste"];
const ALANLAR = [["genel", "Genel"], ["ask", "Aşk"], ["kariyer", "İş ve para"], ["ruhsal", "Ruhsal yol"], ["aile", "Aile"]];
let seciliAlan = "genel";

function renderPersonalChips() {
  $("whereChips").replaceChildren(...YERLER.map((y) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = y;
    b.addEventListener("click", () => {
      personal.elements.nerede.value = personal.elements.nerede.value === y ? "" : y;
      $("whereChips").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.textContent === personal.elements.nerede.value)));
    });
    return b;
  }));
  $("areaChips").replaceChildren(...ALANLAR.map(([k, ad]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ad;
    b.setAttribute("aria-pressed", String(k === seciliAlan));
    b.addEventListener("click", () => { seciliAlan = k; renderPersonalChips(); });
    return b;
  }));
  $("whereChips").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.textContent === personal.elements.nerede.value)));
}
personal.elements.nerede.addEventListener("input", () => {
  $("whereChips").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.textContent === personal.elements.nerede.value)));
});

function renderKota() {
  $("quota").textContent = durum.kalan > 0
    ? `Bugün ${durum.kalan} kişisel mesaj hakkın kaldı (günde ${durum.sinir}).`
    : `Bugünkü ${durum.sinir} kişisel mesaj hakkını kullandın. Sözlük her zaman açık; yarın yeniden bekleriz.`;
  $("personalSubmit").disabled = durum.kalan <= 0;
}

personal.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!seciliSayi) { toast("Önce gördüğün sayıyı yaz."); return; }
  const button = $("personalSubmit");
  button.disabled = true;
  button.textContent = "Melekler dinleniyor…";
  try {
    const response = await fetch("/api/melek/yorum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ sayi: seciliSayi, nerede: personal.elements.nerede.value.trim(), an: personal.elements.an.value.trim(), alan: seciliAlan }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Mesaj alınamadı.");
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    personal.elements.an.value = "";
    showKayit(data.kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    button.textContent = "Mesajımı al";
    renderKota();
  }
});

// --- Sonuç ---

const ALAN_BASLIK = { genel: "☼ Hayatına dair", ask: "♡ Aşk ve ilişkiler", kariyer: "✦ İş ve para", ruhsal: "✧ Ruhsal yolun", aile: "⌂ Aile ve ev" };

function showKayit(kayit, kaydir = false) {
  stopVoice();
  acikKayit = kayit;
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  $("resultNumber").replaceChildren(isikliSayi(kayit.sayi, 0.18));
  $("resultMeta").textContent = [tarih(kayit.tarih), kayit.nerede].filter(Boolean).join(" · ");
  $("resultTitle").textContent = y.baslik;
  $("resultBadge").textContent = kayit.kaynak === "ai" ? "✨ Sana özel mesaj" : "📖 Sözlük anlamı";
  $("resultMessage").textContent = y.mesaj;
  $("areaTitle").textContent = ALAN_BASLIK[kayit.alan] || ALAN_BASLIK.genel;
  $("areaText").textContent = y.alanYorumu;
  $("areaCard").hidden = !y.alanYorumu;
  $("whyText").textContent = y.neden;
  $("whyCard").hidden = !y.neden;
  $("areaCard").parentElement.hidden = !y.alanYorumu && !y.neden;
  $("stepsList").replaceChildren(...y.adimlar.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  $("stepsCard").hidden = !y.adimlar.length;
  $("resultAffirmation").textContent = y.olumlama;
  bindListen($("resultListen"), () => `/api/melek/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  const kart = document.querySelector(".result-card");
  kart.style.animation = "none";
  void kart.offsetWidth;
  kart.style.animation = "";
  document.querySelectorAll(".angel-journal li").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "melek-sayilari", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Kişisel melek sayısı ---

$("birthForm").addEventListener("submit", (e) => {
  e.preventDefault();
  kisiselGoster($("birthForm").elements.tarih.value, true);
});

function kisiselGoster(tarihStr, kaydir = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarihStr || "")) return;
  const [y, m, d] = tarihStr.split("-").map(Number);
  const yy = Numeroloji.yasamYolu(d, m, y).sayi;
  const sayi = kisiselSayi(yy);
  const a = yorumla(sayi);
  const kutu = $("personalResult");
  kutu.hidden = false;
  kutu.innerHTML = `<div class="visual"><img src="${resim(sayi)}" alt="" width="160" height="160" loading="lazy" /></div>
    <div><p class="sky-label"></p><h3></h3><p></p><button type="button" class="btn btn-ghost">Anlamını aç</button></div>`;
  kutu.querySelector(".visual").append(isikliSayi(sayi, 0.2));
  kutu.querySelector(".sky-label").textContent = `Yaşam yolu ${yy} · kişisel melek sayın`;
  kutu.querySelector("h3").textContent = a.baslik;
  kutu.querySelector("p:not(.sky-label)").textContent = `${a.mesaj} Bu sayıyı sık görmen, kendi yolunda olduğunun işaretidir.`;
  kutu.querySelector("button").addEventListener("click", () => sorgula(sayi, true));
  if (kaydir) kutu.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// --- Sözlük ---

function renderGrid() {
  $("angelGrid").replaceChildren(...sayilar.map((s) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    const small = document.createElement("small");
    small.textContent = s.baslik;
    b.append(isikliSayi(s.sayi, 0), small);
    b.addEventListener("click", () => sorgula(s.sayi, true));
    li.append(b);
    return li;
  }));
}

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz kişisel bir mesaj almadın. Gördüğün sayıyı yukarıda yaz.</li>';
    $("frequent").hidden = true;
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} mesaj kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.dataset.id = k.id;
    li.className = acikKayit?.id === k.id ? "is-current" : "";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open";
    const b = document.createElement("b");
    b.textContent = k.yorum.baslik;
    const small = document.createElement("small");
    small.textContent = [tarih(k.tarih), k.nerede].filter(Boolean).join(" · ");
    open.append(isikliSayi(k.sayi, 0), b, small);
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.title = "Bu mesajı sil";
    sil.setAttribute("aria-label", "Bu mesajı sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu mesaj günlüğünden silinsin mi?")) return;
      const response = await fetch("/api/melek/sil", {
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

  const sayim = new Map();
  kayitlar.forEach((k) => sayim.set(k.sayi, (sayim.get(k.sayi) || 0) + 1));
  const sik = [...sayim].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $("frequent").hidden = !sik.length;
  $("frequent").replaceChildren("En sık gördüğün sayılar:", ...sik.flatMap(([s, n]) => {
    const b = document.createElement("b");
    b.textContent = s;
    return [b, `×${n}`];
  }));
}

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/melek-sayilari")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const [data, harita] = await Promise.all([
    fetch("/api/melek/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch("/api/astroloji/harita", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  if (data) {
    durum = { ...durum, ses: data.ses, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  const dogum = harita?.girdi?.tarih || me.user.profil?.dogumTarihi;
  if (dogum) {
    $("birthForm").elements.tarih.value = dogum;
    kisiselGoster(dogum);
  }
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

renderFloating();
renderToday();
renderChips();
renderPersonalChips();
renderGrid();
init();
