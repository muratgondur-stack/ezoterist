const { kartlar, takimlar, acilimlar } = TarotVeri;
const $ = (id) => document.getElementById(id);
const kartBul = (id) => kartlar.find((k) => k.id === id);
const kartResmi = (id) => `/tarot/kart/${id}.webp`;

let durum = { ses: false, ai: true, kalan: 3, sinir: 3, gununKarti: null };
let kayitlar = [];
let acikKayit = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3800);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Ses: yorumcu konuşurken figürü ışıldar (resim ve ad ust-cubuk.js seçimine göre) ---

const voice = $("voice");
const video = $("numerologVideo");
let activeListen = null;

function konusuyor(evet) {
  $("numerolog").classList.toggle("is-speaking", evet);
  $("numerologCaption").textContent = evet ? "Şu an kartlarını anlatıyor…" : "Yorumunu sesli dinlediğinde seninle konuşur.";
  if (video) { if (evet) video.play().catch(() => {}); else video.pause(); }
}

function stopVoice() {
  voice.pause();
  konusuyor(false);
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
    if (video) video.preload = "auto";
    voice.src = getUrl();
    voice.play().catch(() => { toast("Ses çalınamadı."); stopVoice(); });
  };
}

voice.addEventListener("playing", () => {
  if (!activeListen) return;
  activeListen.disabled = false;
  activeListen.classList.add("is-playing");
  activeListen.textContent = "⏹ Durdur";
  konusuyor(true);
});
voice.addEventListener("ended", stopVoice);
voice.addEventListener("error", () => { if (activeListen) toast("Seslendirme şu an hazır değil."); stopVoice(); });

// --- Kart bileşeni ---

function tcard({ id, ters, acik = false, bos = false } = {}) {
  const el = document.createElement("div");
  el.className = `tcard${acik ? " is-open" : ""}${ters ? " is-reversed" : ""}`;
  el.innerHTML = `<div class="tcard-inner"><div class="tcard-face tcard-back${bos ? " is-empty" : ""}"></div><div class="tcard-face tcard-front"></div></div>`;
  if (id) kartiYerlestir(el, id, ters);
  return el;
}

function kartiYerlestir(el, id, ters) {
  const k = kartBul(id);
  const front = el.querySelector(".tcard-front");
  front.innerHTML = `<img src="${kartResmi(id)}" alt="" loading="lazy" /><span class="tname"></span>`;
  front.querySelector("img").alt = `${k.ad}${ters ? " (ters)" : ""}`;
  const ad = front.querySelector(".tname");
  ad.textContent = k.ad;
  if (ters) ad.insertAdjacentHTML("beforeend", "<small>TERS</small>");
  el.classList.toggle("is-reversed", Boolean(ters));
}

// --- Açılım seçimi ---

let secilenAcilim = null;
let secimler = [];
let masaKilitli = false;

function renderSpreads() {
  $("spreadGrid").replaceChildren(...Object.entries(acilimlar).map(([kod, a]) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "spread-option";
    button.setAttribute("aria-pressed", String(secilenAcilim === kod));
    button.innerHTML = "<b></b><small></small><span class=\"count\"></span>";
    button.querySelector("b").textContent = a.ad;
    button.querySelector("small").textContent = a.aciklama;
    button.querySelector(".count").textContent = kod === "gunun"
      ? (durum.gununKarti ? "Bugün çekildi · tekrar gör" : "1 kart · günde bir")
      : `${a.pozisyonlar.length} kart`;
    button.addEventListener("click", () => acilimSec(kod));
    li.append(button);
    return li;
  }));
}

function renderKota() {
  $("quota").textContent = !durum.ai
    ? "Okuyucumuz şu an müsait değil; kartları yine açabilirsin, yorum sözlükten gelir."
    : durum.kalan == null
      ? "Günün kartı günde bir."
      : `Bugün ${durum.kalan} açılım hakkın kaldı (günde ${durum.sinir}); günün kartı ayrıca günde bir.`;
}

function acilimSec(kod) {
  if (masaKilitli) return;
  stopVoice();
  secilenAcilim = kod;
  secimler = [];
  renderSpreads();
  if (kod === "gunun" && durum.gununKarti) {
    const kayit = kayitlar.find((k) => k.id === durum.gununKarti);
    if (kayit) {
      $("table").hidden = true;
      $("questionBox").hidden = true;
      showReading(kayit, true);
      return;
    }
  }
  if (kod !== "gunun" && (durum.kalan != null && durum.kalan <= 0)) {
    toast("Bugünkü açılım hakkını kullandın. Günün kartını yine görebilirsin.");
    return;
  }
  $("questionBox").hidden = kod === "gunun";
  hazirlaMasa();
}

// --- Masa: karıştır, seç, aç ---

function hazirlaMasa() {
  const a = acilimlar[secilenAcilim];
  $("table").hidden = false;
  $("revealButton").hidden = true;
  $("resetButton").hidden = true;
  $("tableHint").textContent = `Kalbinden geçeni düşün ve ${a.pozisyonlar.length} kart seç.`;

  const spread = $("spread");
  spread.className = `spread ${secilenAcilim}`;
  spread.replaceChildren(...a.pozisyonlar.map((pos) => {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.append(tcard({ bos: true }));
    const label = document.createElement("span");
    label.className = "slot-label";
    label.textContent = pos;
    slot.append(label);
    return slot;
  }));

  const ribbon = $("ribbon");
  ribbon.classList.remove("is-shuffling");
  ribbon.replaceChildren(...Array.from({ length: 78 }, (_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ribbon-card";
    button.setAttribute("aria-label", `${i + 1}. kart`);
    button.style.setProperty("--wave", `${Math.sin(i / 4) * 6}px`);
    button.style.setProperty("--tilt", `${Math.sin(i / 7) * 3}deg`);
    button.style.setProperty("--delay", `${i * 12}ms`);
    button.style.setProperty("--from", `${(39 - i) * 6}`);
    button.addEventListener("click", () => kartSec(i, button));
    return button;
  }));
  // Karıştırma: kartlar dağıtıldıktan sonra bir kez harmanlanır.
  setTimeout(() => {
    ribbon.classList.add("is-shuffling");
    setTimeout(() => ribbon.classList.remove("is-shuffling"), 1400);
  }, 900);
  $("table").scrollIntoView({ behavior: "smooth", block: "start" });
}

function kartSec(i, button) {
  const a = acilimlar[secilenAcilim];
  if (masaKilitli || secimler.length >= a.pozisyonlar.length || secimler.includes(i)) return;
  secimler.push(i);
  button.classList.add("is-taken");
  const slot = $("spread").children[secimler.length - 1];
  slot.querySelector(".tcard-back").classList.remove("is-empty");
  const kalan = a.pozisyonlar.length - secimler.length;
  $("tableHint").textContent = kalan ? `${kalan} kart daha seç.` : "Kartların hazır. Açmaya hazır mısın?";
  $("revealButton").hidden = kalan > 0;
}

$("revealButton").addEventListener("click", async () => {
  if (masaKilitli) return;
  masaKilitli = true;
  const button = $("revealButton");
  button.disabled = true;
  button.textContent = `🔮 ${window.SeciliYorumcu?.ad || "Okuyucumuz"} kartlarına bakıyor…`;
  try {
    const response = await fetch("/api/tarot/cek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ acilim: secilenAcilim, secimler, soru: $("question").value }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Kartlar açılamadı.");
    durum.kalan = data.kalan;
    if (secilenAcilim === "gunun") durum.gununKarti = data.kayit.id;
    kayitlar = [data.kayit, ...kayitlar.filter((k) => k.id !== data.kayit.id)];
    button.hidden = true;
    $("tableHint").textContent = acilimlar[secilenAcilim].ad;
    // Kartlar sırayla dönerek açılır.
    const slots = [...$("spread").children];
    for (const [n, c] of data.kayit.kartlar.entries()) {
      const el = slots[n].querySelector(".tcard");
      kartiYerlestir(el, c.id, c.ters);
      await bekle(n === 0 ? 150 : 420);
      el.classList.add("is-open");
    }
    await bekle(900);
    $("resetButton").hidden = false;
    renderSpreads();
    renderKota();
    renderJournal();
    showReading(data.kayit, true);
  } catch (error) {
    toast(error.message);
  } finally {
    masaKilitli = false;
    button.disabled = false;
    button.textContent = "Kartlarımı aç";
  }
});

$("resetButton").addEventListener("click", () => {
  secilenAcilim = null;
  $("table").hidden = true;
  $("questionBox").hidden = true;
  $("question").value = "";
  renderSpreads();
  $("masa").scrollIntoView({ behavior: "smooth" });
});

// --- Yorum ---

function showReading(kayit, kaydir = false) {
  window.yorumcuGoster?.(kayit); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
  stopVoice();
  acikKayit = kayit;
  const a = acilimlar[kayit.acilim];
  $("sonuc").hidden = false;
  $("readingMeta").textContent = `${tarih(kayit.tarih)} · ${a.ad}${kayit.soru ? ` · “${kayit.soru}”` : ""}`;
  $("readingTitle").textContent = kayit.yorum.baslik;
  $("readingBadge").textContent = kayit.kaynak === "ai" ? `✨ ${window.GosterilenYorumcu?.ad || "Okuyucumuzun"} yorumu` : "📖 Kartların anlamı";
  $("cardReadings").replaceChildren(...kayit.kartlar.map((c, i) => {
    const k = kartBul(c.id);
    const li = document.createElement("li");
    li.className = "card-reading";
    const kart = tcard({ id: c.id, ters: c.ters, acik: true });
    kart.addEventListener("click", () => openCard(c.id));
    const govde = document.createElement("div");
    govde.innerHTML = "<span class=\"pos\"></span><h3></h3><p></p>";
    govde.querySelector(".pos").textContent = `${i + 1}. ${a.pozisyonlar[i]}`;
    govde.querySelector("h3").textContent = k.ad;
    if (c.ters) govde.querySelector("h3").insertAdjacentHTML("beforeend", "<small>TERS</small>");
    govde.querySelector("p").textContent = kayit.yorum.kartlar[i] || (c.ters ? k.ters : k.duz);
    li.append(kart, govde);
    return li;
  }));
  $("story").textContent = kayit.yorum.hikaye;
  $("storyCard").querySelector("h3").textContent = kayit.kartlar.length > 1 ? "Kartların hikâyesi" : "Kartın mesajı";
  $("story").hidden = !kayit.yorum.hikaye;
  $("advice").textContent = kayit.yorum.tavsiye ? `“${kayit.yorum.tavsiye}”` : "";
  bindListen($("readingListen"), () => `/api/tarot/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".journal-item").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) setTimeout(() => $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" }), 200);
}

const uzmanKarti = UzmanKarti({ bolum: "tarot", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz açtığın kart yok. Masaya otur ve ilk açılımını yap.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} açılım kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.className = `journal-item${acikKayit?.id === k.id ? " is-current" : ""}`;
    li.dataset.id = k.id;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "journal-open";
    const resimler = k.kartlar.slice(0, 5).map((c) => `<img src="${kartResmi(c.id)}" alt="" loading="lazy"${c.ters ? ' class="is-reversed"' : ""} />`).join("");
    open.innerHTML = `<span class="journal-thumb cards">${resimler}</span><span class="journal-meta"><b></b><small></small><p></p></span>`;
    open.querySelector("b").textContent = k.yorum.baslik;
    open.querySelector("small").textContent = `${tarih(k.tarih)} · ${acilimlar[k.acilim].ad}`;
    open.querySelector("p").textContent = k.soru || k.kartlar.map((c) => kartBul(c.id).ad).join(", ");
    open.addEventListener("click", () => showReading(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "journal-delete";
    sil.title = "Bu açılımı sil";
    sil.setAttribute("aria-label", "Bu açılımı sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu açılım günlüğünden silinsin mi?")) return;
      const response = await fetch("/api/tarot/sil", {
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

// --- Deste ---

let filtre = "hepsi";
const FILTRELER = [["hepsi", "Tümü"], ["buyuk", "Büyük Arkana"], ...takimlar.map((t) => [t.id, t.cogul])];

function renderDeck() {
  $("deckFilter").replaceChildren(...FILTRELER.map(([kod, ad]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = ad;
    button.setAttribute("aria-pressed", String(filtre === kod));
    button.addEventListener("click", () => { filtre = kod; renderDeck(); });
    return button;
  }));
  const liste = kartlar.filter((k) => filtre === "hepsi" || (filtre === "buyuk" ? k.arkana === "buyuk" : k.takim === filtre));
  $("deckGrid").replaceChildren(...liste.map((k) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "deck-card";
    button.innerHTML = `<img src="${kartResmi(k.id)}" alt="" loading="lazy" decoding="async" /><span class="tname"></span>`;
    button.querySelector("img").alt = k.ad;
    button.querySelector(".tname").textContent = k.ad;
    button.addEventListener("click", () => openCard(k.id));
    li.append(button);
    return li;
  }));
}

const dialog = $("cardDialog");
function openCard(id) {
  const k = kartBul(id);
  const takim = takimlar.find((t) => t.id === k.takim);
  $("dlgImage").src = kartResmi(id);
  $("dlgImage").alt = k.ad;
  $("dlgGroup").textContent = k.arkana === "buyuk" ? `Büyük Arkana · ${k.numara}` : `${takim.cogul} · ${takim.element} · ${takim.tema}`;
  $("dlgName").textContent = k.ad;
  $("dlgKeywords").textContent = k.anahtar;
  $("dlgUpright").textContent = k.duz;
  $("dlgReversed").textContent = k.ters;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/tarot")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/tarot/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, ai: data.ai, kalan: data.kalan, sinir: data.sinir, gununKarti: data.gununKarti };
    kayitlar = data.kayitlar;
  }
  renderSpreads();
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showReading(kayitlar[0]);
}

renderSpreads();
renderDeck();
init();
