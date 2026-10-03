const { kategoriler, semboller, sembolBul } = SembolVeri;
const $ = (id) => document.getElementById(id);
const resim = (id) => `/sembol/${id}.webp?v=1`;

let durum = { ses: false, ai: false, kalan: 5, sinir: 5 };
let kayitlar = [];
let acikKayit = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3600);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
const img = (id) => Object.assign(document.createElement("img"), { src: resim(id), alt: sembolBul(id).ad, className: "symbol-img", loading: "lazy", width: 420, height: 420 });
const kucuk = (s) => s.toLocaleLowerCase("tr-TR");

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

// --- Sembol ayrıntısı ---

function sembolAc(id) {
  const s = sembolBul(id);
  if (!s) return;
  const govde = $("symbolDialogBody");
  govde.innerHTML = `<div class="symbol-detail"><div></div><div><p class="sky-label"></p><h2></h2><p class="kw"></p><p class="anlam"></p>
    <dl><div><dt>Kökeni</dt><dd class="koken"></dd></div><div><dt>Günümüzde</dt><dd class="kullanim"></dd></div></dl></div></div>`;
  govde.querySelector(".symbol-detail > div").replaceWith(img(id));
  govde.querySelector(".sky-label").textContent = kategoriler[s.kategori];
  govde.querySelector("h2").textContent = s.ad;
  govde.querySelector(".kw").textContent = s.anahtar.join(" · ");
  govde.querySelector(".anlam").textContent = s.anlam;
  govde.querySelector(".koken").textContent = s.koken;
  govde.querySelector(".kullanim").textContent = s.kullanim;
  $("symbolDialog").showModal();
}

$("symbolDialog").addEventListener("click", (e) => { if (e.target === $("symbolDialog")) $("symbolDialog").close(); });

// --- Günün sembolü ---

function renderDaily() {
  const gun = Math.floor((Date.now() + 3 * 3600000) / 86400000);
  const s = semboller[(gun * 11) % semboller.length];
  $("dailyDate").textContent = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const kutu = $("dailySymbol");
  kutu.innerHTML = "<div></div><div><p class=\"sky-label\"></p><h3></h3><p class=\"kw\"></p><p class=\"anlam\"></p><button type=\"button\" class=\"btn btn-ghost\">Kökeni ve ayrıntısı</button></div>";
  kutu.firstElementChild.replaceWith(img(s.id));
  kutu.querySelector(".sky-label").textContent = kategoriler[s.kategori];
  kutu.querySelector("h3").textContent = s.ad;
  kutu.querySelector(".kw").textContent = s.anahtar.join(" · ");
  kutu.querySelector(".anlam").textContent = s.anlam;
  kutu.querySelector("button").addEventListener("click", () => sembolAc(s.id));
}

// --- Ansiklopedi ---

let kategori = "";

function renderCats() {
  $("catChips").replaceChildren(...[["", "Hepsi"], ...Object.entries(kategoriler)].map(([k, ad]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ad;
    b.setAttribute("aria-pressed", String(k === kategori));
    b.addEventListener("click", () => { kategori = k; renderCats(); renderGrid(); });
    return b;
  }));
}

function renderGrid() {
  const q = kucuk($("search").value.trim());
  const liste = semboller.filter((s) => (!kategori || s.kategori === kategori)
    && (!q || kucuk(s.ad).includes(q) || s.anahtar.some((a) => kucuk(a).includes(q)) || kucuk(s.anlam).includes(q)));
  $("encNote").textContent = liste.length === semboller.length ? "32 sembol. Ara ya da bir kategori seç; bir sembole dokun." : `${liste.length} sembol bulundu.`;
  $("symbolGrid").replaceChildren(...(liste.length ? liste : [null]).map((s, i) => {
    const li = document.createElement("li");
    if (!s) { li.className = "journal-empty"; li.textContent = "Bulunamadı. Bu sembolü yukarıdaki kutudan bize sorabilirsin."; return li; }
    li.style.animationDelay = `${Math.min(i, 12) * 0.03}s`;
    const b = document.createElement("button");
    b.type = "button";
    b.id = s.id;
    const ad = document.createElement("b");
    ad.textContent = s.ad;
    const small = document.createElement("small");
    small.textContent = s.anahtar.join(" · ");
    b.append(img(s.id), ad, small);
    b.addEventListener("click", () => sembolAc(s.id));
    li.append(b);
    return li;
  }));
}

$("search").addEventListener("input", renderGrid);

// --- Sor ---

function renderKota() {
  $("quota").textContent = durum.kalan > 0
    ? `Ansiklopedide olmasa da olur: sembolü adıyla ya da tarif ederek yaz. Bugün ${durum.kalan} sorma hakkın var.`
    : `Bugünkü ${durum.sinir} sorma hakkını kullandın. Ansiklopedi her zaman açık.`;
  $("askSubmit").disabled = durum.kalan <= 0 || !durum.ai;
}

$("askForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = $("askForm");
  const b = $("askSubmit");
  b.disabled = true;
  b.textContent = "Sembolün izi sürülüyor…";
  try {
    const response = await fetch("/api/sembol/sor", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ sembol: f.elements.sembol.value.trim(), nerede: f.elements.nerede.value.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Yorum alınamadı.");
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    f.reset();
    showKayit(data.kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    b.textContent = "Anlamını anlat";
    renderKota();
  }
});

function showKayit(kayit, kaydir = false) {
  stopVoice();
  acikKayit = kayit;
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  $("resultMeta").textContent = [tarih(kayit.tarih), kayit.nerede].filter(Boolean).join(" · ");
  $("resultTitle").textContent = y.sembol;
  $("resultSub").textContent = y.baslik;
  $("resultOrigin").textContent = y.koken;
  $("resultMeaning").textContent = y.anlam;
  $("resultMessage").textContent = y.mesaj;
  $("resultMessageBox").hidden = !y.mesaj;
  $("relatedBox").hidden = !y.ilgili.length;
  $("related").replaceChildren(...y.ilgili.map((id) => {
    const b = document.createElement("button");
    b.type = "button";
    b.append(img(id), sembolBul(id).ad);
    b.addEventListener("click", () => sembolAc(id));
    return b;
  }));
  $("resultAffirmation").textContent = y.olumlama;
  bindListen($("resultListen"), () => `/api/sembol/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".symbol-journal li").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "semboller", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz bir sembol sormadın.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} sembol kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.dataset.id = k.id;
    li.className = acikKayit?.id === k.id ? "is-current" : "";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open";
    open.innerHTML = "<b></b><small></small><p></p>";
    open.querySelector("b").textContent = k.yorum.sembol;
    open.querySelector("small").textContent = tarih(k.tarih);
    open.querySelector("p").textContent = k.yorum.baslik || k.nerede;
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.title = "Bu kaydı sil";
    sil.setAttribute("aria-label", "Bu kaydı sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu sembol kaydı silinsin mi?")) return;
      const response = await fetch("/api/sembol/sil", {
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

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/semboller")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/sembol/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, ai: data.ai, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  const hedef = window.location.hash.slice(1);
  if (sembolBul(hedef)) sembolAc(hedef);
  else if (kayitlar.length && hedef === "gunluk") showKayit(kayitlar[0]);
}

renderDaily();
renderCats();
renderGrid();
init();
