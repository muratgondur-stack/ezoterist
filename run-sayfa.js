const { runler, aettler, acilimlar, runBul } = RunVeri;
const $ = (id) => document.getElementById(id);
const SVG = "http://www.w3.org/2000/svg";

let durum = { ses: false, kalan: 3, sinir: 3, gununRunu: null };
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
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Rün şeklini önce koyu "oyuk", üstüne kehribar "ışık" olarak çizer.
function runSvg(sekil) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 40 60");
  svg.setAttribute("class", "rune-svg");
  svg.setAttribute("aria-hidden", "true");
  ["oyuk", "isik"].forEach((sinif) => {
    sekil.forEach((cizgi) => {
      const p = document.createElementNS(SVG, "polyline");
      p.setAttribute("points", cizgi.map(([x, y]) => `${x},${y}`).join(" "));
      p.setAttribute("class", sinif);
      svg.append(p);
    });
  });
  return svg;
}

function tas(id, { ters = false, kapali = false } = {}) {
  const div = document.createElement("div");
  div.className = `stone${ters ? " ters" : ""}`;
  if (!kapali && id) div.append(runSvg(runBul(id).sekil));
  return div;
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

// --- Sunucuya çekiş ---

async function cek(acilim, secimler, soru = "") {
  const response = await fetch("/api/run/cek", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
    body: JSON.stringify({ acilim, secimler, soru }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Taşlar çekilemedi.");
  return data;
}

// --- Günün rünü ---

function gununRunuGoster(kayit) {
  const c = kayit.taslar[0];
  const r = runBul(c.id);
  const kutu = $("dailyResult");
  kutu.hidden = false;
  kutu.innerHTML = "<div></div><div><p class=\"sky-label\"></p><h3></h3><p class=\"msg\"></p><button type=\"button\" class=\"btn btn-ghost\">Ayrıntılı yorumu aç</button></div>";
  kutu.firstElementChild.replaceWith(tas(c.id, { ters: c.ters }));
  kutu.querySelector(".sky-label").textContent = `${tarih(kayit.tarih)} · ${r.anlam}${c.ters ? " · ters" : ""}`;
  kutu.querySelector("h3").textContent = r.ad;
  kutu.querySelector(".msg").textContent = kayit.yorum.taslar[0] || (c.ters ? r.tersAnlam : r.duz);
  kutu.querySelector("button").addEventListener("click", () => showKayit(kayit, true));
  $("pouchButton").hidden = true;
}

$("pouchButton").addEventListener("click", async () => {
  const pouch = $("pouchButton");
  pouch.disabled = true;
  pouch.classList.add("shake");
  try {
    const [data] = await Promise.all([cek("gunun", [Math.floor(Math.random() * 24)]), bekle(700)]);
    if (!data.tekrar) kayitlar.unshift(data.kayit);
    durum.gununRunu = data.kayit.id;
    gununRunuGoster(data.kayit);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    pouch.disabled = false;
    pouch.classList.remove("shake");
  }
});

// --- Açılım ve masa ---

const ACILIMLAR = ["tek", "norn", "hac"];
let seciliAcilim = "norn";
let secimler = [];

function renderTabs() {
  $("spreadTabs").replaceChildren(...ACILIMLAR.map((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(k === seciliAcilim));
    b.textContent = `${acilimlar[k].ad} · ${acilimlar[k].pozisyonlar.length}`;
    b.addEventListener("click", () => { seciliAcilim = k; secimler = []; renderTabs(); renderTable(); });
    return b;
  }));
  $("spreadDesc").textContent = acilimlar[seciliAcilim].aciklama;
}

function gerekli() { return acilimlar[seciliAcilim].pozisyonlar.length; }

function renderPickNote() {
  const n = gerekli();
  $("pickNote").textContent = secimler.length < n
    ? `Sorunu düşünerek masadan ${n} taş seç (${secimler.length}/${n}). Sırası: ${acilimlar[seciliAcilim].pozisyonlar.join(" → ")}`
    : "Taşların seçildi. Hazır olduğunda çevir.";
  $("revealButton").disabled = secimler.length < n || (durum.kalan != null && durum.kalan <= 0);
}

// Taşların masadaki rastgele duruşu sayfa açılışında bir kez belirlenir.
const acilar = Array.from({ length: 24 }, () => Math.round(Math.random() * 50 - 25));

function renderTable() {
  $("stoneTable").classList.remove("cekiliyor");
  $("stoneTable").replaceChildren(...acilar.map((aci, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `${i + 1}. taş`);
    const t = tas(null, { kapali: true });
    t.style.setProperty("--aci", `${aci}deg`);
    b.append(t);
    const sira = secimler.indexOf(i);
    if (sira !== -1) { b.classList.add("secili"); b.dataset.sira = String(sira + 1); }
    b.addEventListener("click", () => {
      const j = secimler.indexOf(i);
      if (j !== -1) secimler.splice(j, 1);
      else if (secimler.length < gerekli()) secimler.push(i);
      else { toast(`Bu açılım için ${gerekli()} taş yeterli.`); return; }
      renderTable();
    });
    li.append(b);
    return li;
  }));
  renderPickNote();
}

$("resetButton").addEventListener("click", () => { secimler = []; renderTable(); });

function renderKota() {
  $("quota").textContent = durum.kalan == null ? "" : durum.kalan > 0
    ? `Bugün ${durum.kalan} açılım hakkın kaldı (bütün bölümlerde günde ${durum.sinir}). Günün rünü buna dahil değil.`
    : `Bugünkü ${durum.sinir} açılım hakkını kullandın. Yarın taşlar seni yine bekliyor.`;
  renderPickNote();
}

$("revealButton").addEventListener("click", async () => {
  const button = $("revealButton");
  button.disabled = true;
  button.textContent = "Rünler okunuyor…";
  $("stoneTable").classList.add("cekiliyor");
  try {
    const data = await cek(seciliAcilim, secimler, $("spreadForm").elements.soru.value.trim());
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    secimler = [];
    $("spreadForm").elements.soru.value = "";
    showKayit(data.kayit, true, true);
    renderJournal();
    renderTable();
  } catch (error) {
    toast(error.message);
    $("stoneTable").classList.remove("cekiliyor");
  } finally {
    button.textContent = "Taşları çevir";
    renderKota();
  }
});

// --- Sonuç ---

const NORN_RESIM = ["urd", "verdandi", "skuld"];

function showKayit(kayit, kaydir = false, canli = false) {
  window.yorumcuGoster?.(kayit); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
  stopVoice();
  acikKayit = kayit;
  const acilim = acilimlar[kayit.acilim];
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  $("resultMeta").textContent = [acilim.ad, tarih(kayit.tarih), kayit.soru ? `“${kayit.soru}”` : ""].filter(Boolean).join(" · ");
  $("resultTitle").textContent = y.baslik;
  $("resultBadge").textContent = kayit.kaynak === "ai" ? "✨ Rün okuyucumuzun yorumu" : "📜 Rünlerin anlamı";

  const yerlesim = $("spreadLayout");
  yerlesim.className = `spread-layout n${kayit.taslar.length}`;
  yerlesim.replaceChildren(...kayit.taslar.map((c, i) => {
    const r = runBul(c.id);
    const slot = document.createElement("div");
    slot.className = "slot";
    if (kayit.acilim === "norn") {
      const img = document.createElement("img");
      img.className = "norn";
      img.src = `/run/${NORN_RESIM[i]}.webp?v=1`;
      img.alt = "";
      img.loading = "lazy";
      slot.append(img);
    }
    const t = tas(c.id, { ters: c.ters });
    if (canli) { t.classList.add("flip"); t.style.animationDelay = `${0.2 + i * 0.45}s`; }
    const pos = document.createElement("span");
    pos.className = "pos";
    pos.textContent = acilim.pozisyonlar[i];
    const b = document.createElement("b");
    b.textContent = r.ad;
    const small = document.createElement("small");
    small.textContent = `${r.anlam}${c.ters ? " · ters" : ""}`;
    slot.append(t, pos, b, small);
    slot.addEventListener("click", () => runAc(c.id));
    slot.style.cursor = "pointer";
    return slot;
  }));

  $("stoneReadings").replaceChildren(...kayit.taslar.map((c, i) => {
    const r = runBul(c.id);
    const div = document.createElement("div");
    div.className = "card";
    div.style.animationDelay = `${i * 0.08}s`;
    div.innerHTML = "<div></div><div><span class=\"pos\"></span><h3></h3><p></p></div>";
    div.firstElementChild.replaceWith(tas(c.id, { ters: c.ters }));
    div.querySelector(".pos").textContent = acilim.pozisyonlar[i];
    div.querySelector("h3").textContent = `${r.ad} · ${r.anlam}`;
    if (c.ters) div.querySelector("h3").insertAdjacentHTML("beforeend", '<span class="ters-etiket">ters</span>');
    div.querySelector("p").textContent = y.taslar[i] || (c.ters ? r.tersAnlam : r.duz);
    return div;
  }));
  $("stoneReadings").hidden = kayit.taslar.length === 1 && !y.hikaye;
  $("storyText").textContent = y.hikaye;
  $("storyText").hidden = !y.hikaye;
  $("adviceText").textContent = y.tavsiye;
  $("adviceText").hidden = !y.tavsiye;
  bindListen($("resultListen"), () => `/api/run/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".rune-journal li").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "run-taslari", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz bir açılım yapmadın. Torbaya dokun ya da masadan taş seç.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} açılım kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.dataset.id = k.id;
    li.className = acikKayit?.id === k.id ? "is-current" : "";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open";
    const mini = document.createElement("div");
    mini.className = "mini";
    k.taslar.forEach((c) => mini.append(tas(c.id, { ters: c.ters })));
    const b = document.createElement("b");
    b.textContent = k.yorum.baslik;
    const small = document.createElement("small");
    small.textContent = `${acilimlar[k.acilim].ad} · ${tarih(k.tarih)}`;
    const p = document.createElement("p");
    p.textContent = k.soru || k.taslar.map((c) => runBul(c.id).ad).join(", ");
    open.append(mini, b, small, p);
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.title = "Bu açılımı sil";
    sil.setAttribute("aria-label", "Bu açılımı sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu açılım günlüğünden silinsin mi?")) return;
      const response = await fetch("/api/run/sil", {
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

// --- Sözlük ---

function renderDict() {
  $("runeDict").replaceChildren(...Object.entries(aettler).map(([k, a]) => {
    const div = document.createElement("div");
    div.className = "aett";
    div.innerHTML = "<h3></h3><p></p><ul></ul>";
    div.querySelector("h3").textContent = a.ad;
    div.querySelector("p").textContent = a.aciklama;
    div.querySelector("ul").replaceChildren(...runler.filter((r) => r.aett === k).map((r) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      const ad = document.createElement("b");
      ad.textContent = r.ad;
      const small = document.createElement("small");
      small.textContent = r.anlam;
      b.append(tas(r.id), ad, small);
      b.addEventListener("click", () => runAc(r.id));
      li.append(b);
      return li;
    }));
    return div;
  }));
}

function runAc(id) {
  const r = runBul(id);
  const govde = $("runeDialogBody");
  govde.innerHTML = `<div class="rune-detail"><div></div><div><p class="sky-label"></p><h2></h2><p class="kw"></p><p class="duz"></p><p class="ters-baslik" hidden>Ters (merkstave) geldiğinde</p><p class="ters" hidden></p></div></div>`;
  govde.querySelector(".rune-detail > div").replaceWith(tas(id));
  govde.querySelector(".sky-label").textContent = `${aettler[r.aett].ad} · ses: ${r.ses}`;
  govde.querySelector("h2").textContent = `${r.ad} · ${r.anlam}`;
  govde.querySelector(".kw").textContent = r.anahtar.join(" · ");
  govde.querySelector(".duz").textContent = r.duz;
  if (r.tersOlur) {
    govde.querySelector(".ters-baslik").hidden = false;
    govde.querySelector(".ters").hidden = false;
    govde.querySelector(".ters").textContent = r.tersAnlam;
  } else {
    govde.querySelector(".ters-baslik").hidden = false;
    govde.querySelector(".ters-baslik").textContent = "Simetrik bir rün: ters gelmez, mesajı her zaman aynıdır.";
  }
  $("runeDialog").showModal();
}

$("runeDialog").addEventListener("click", (e) => { if (e.target === $("runeDialog")) $("runeDialog").close(); });

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/run-taslari")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/run/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, kalan: data.kalan, sinir: data.sinir, gununRunu: data.gununRunu };
    kayitlar = data.kayitlar;
  }
  const gunun = durum.gununRunu && kayitlar.find((k) => k.id === durum.gununRunu);
  if (gunun) gununRunuGoster(gunun);
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

renderTabs();
renderTable();
renderDict();
init();
