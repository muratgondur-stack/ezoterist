const { semboller, kurallar } = FalVeri;
const $ = (id) => document.getElementById(id);

let durum = { ses: false, ai: true, kalan: 3, sinir: 3 };
let kayitlar = [];
let acikKayit = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 4000);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));

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

// --- Fotoğraflar: tarayıcıda küçültülüp JPEG'e çevrilir ---

const YUVALAR = [
  { ad: "Fincanın içi", ipucu: "Yukarıdan, aydınlık", ikon: "☕", zorunlu: true },
  { ad: "Farklı açı", ipucu: "İsteğe bağlı", ikon: "🔄" },
  { ad: "Tabak", ipucu: "Niyetin cevabı", ikon: "🍽️", tabak: true },
];
const fotolar = [null, null, null];


function renderSlots() {
  $("photoSlots").replaceChildren(...YUVALAR.map((yuva, i) =>
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
      ? `Bugün ${durum.kalan} fal hakkın kaldı (günde ${durum.sinir}).`
      : "Bugünkü 3 fal hakkını kullandın. Yarın yeni fincanını bekleriz.";
  $("falSubmit").disabled = (durum.sinir && durum.kalan <= 0) || !durum.ai;
}

const form = $("falForm");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!fotolar[0]) { toast("Önce fincanının içinin fotoğrafını ekle."); return; }
  const gonderilen = fotolar.filter(Boolean);
  const button = $("falSubmit");
  button.disabled = true;
  button.textContent = "☕ Falcımız fincanına bakıyor…";
  try {
    const response = await fetch("/api/fal/bak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ fotolar: gonderilen, tabakVar: Boolean(fotolar[2]), niyet: form.elements.niyet.value }),
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
    button.textContent = "Falıma bak";
    renderKota();
  }
});

// --- Sonuç ---

function showKayit(kayit, kaydir = false) {
  stopVoice();
  acikKayit = kayit;
  const f = kayit.fal;
  $("sonuc").hidden = false;
  const foto = $("cupPhotos");
  foto.classList.toggle("many", kayit.girdi.fotoSayisi > 1);
  foto.replaceChildren(...[...Array(kayit.girdi.fotoSayisi).keys()].map((n) => {
    const img = document.createElement("img");
    img.src = `/api/fal/foto?id=${kayit.id}&n=${n}`;
    img.alt = n === 0 ? "Fincanın içi" : "Fincan fotoğrafı";
    return img;
  }));
  $("resultDate").textContent = `${tarih(kayit.tarih)} falı`;
  $("resultTitle").textContent = f.baslik;
  $("resultGeneral").textContent = f.genel;
  $("resultSymbols").replaceChildren(...f.semboller.map((s) => {
    const li = document.createElement("li");
    li.innerHTML = "<b></b><span class=\"yer\"></span><p></p>";
    li.querySelector("b").textContent = s.sembol;
    li.querySelector(".yer").textContent = s.yer || "fincanda";
    li.querySelector("p").textContent = s.anlam;
    return li;
  }));
  $("resultLove").textContent = f.ask || "—";
  $("resultWork").textContent = f.is || "—";
  $("resultFuture").textContent = f.yakinGelecek || "—";
  $("wishCard").hidden = !f.niyet;
  $("resultWish").textContent = f.niyet;
  $("resultAdvice").textContent = f.tavsiye ? `“${f.tavsiye}”` : "";
  bindListen($("resultListen"), () => `/api/fal/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".journal-item").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "kahve-fali", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz baktırdığın bir fal yok. İlk fincanını yukarıda yükle.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} fal kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.className = `journal-item${acikKayit?.id === k.id ? " is-current" : ""}`;
    li.dataset.id = k.id;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "journal-open";
    open.innerHTML = `<img class="journal-thumb" src="/api/fal/foto?id=${k.id}&n=0" alt="" loading="lazy" />
      <span class="journal-meta"><b></b><small></small><p></p></span>`;
    open.querySelector("b").textContent = k.fal.baslik;
    open.querySelector("small").textContent = tarih(k.tarih);
    open.querySelector("p").textContent = k.girdi.niyet ? `Niyet: ${k.girdi.niyet}` : k.fal.genel;
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "journal-delete";
    sil.title = "Bu falı sil";
    sil.setAttribute("aria-label", "Bu falı sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu fal ve fincan fotoğrafları silinsin mi?")) return;
      const response = await fetch("/api/fal/sil", {
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

function renderGuide() {
  $("rules").replaceChildren(...kurallar.map(([ad, metin]) => {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = ad;
    const p = document.createElement("p");
    p.textContent = metin;
    li.append(b, p);
    return li;
  }));
}

function renderDict(filtre = "") {
  const f = filtre.toLocaleLowerCase("tr-TR").trim();
  const liste = semboller.filter((s) => !f || s.ad.toLocaleLowerCase("tr-TR").includes(f));
  $("dictGrid").replaceChildren(...(liste.length ? liste : [{ ad: "Bulunamadı", anlam: "Bu şekil rehberimizde yok; fincanında görürsen falcımız özel olarak yorumlar." }]).map((s) => {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = s.ad;
    const p = document.createElement("p");
    p.textContent = s.anlam;
    li.append(b, p);
    return li;
  }));
}

$("dictSearch").addEventListener("input", (e) => renderDict(e.target.value));

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/kahve-fali")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/fal/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, ai: data.ai, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

renderSlots();
renderGuide();
renderDict();
init();
