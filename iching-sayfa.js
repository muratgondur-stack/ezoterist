const { trigramlar, heksagramlar, atistan, cizgileri, CIZGI_YERI } = IChingVeri;
const $ = (id) => document.getElementById(id);

let durum = { ses: false, kalan: 3, sinir: 3 };
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
const trigramResmi = (k) => `/iching/${k}.webp?v=1`;

// Altı çizgilik heksagram figürü (alttan üste).
function hexFigur(cizgiler, { degisen = [], kucuk = false } = {}) {
  const div = document.createElement("div");
  div.className = `hex${kucuk ? " small" : ""}`;
  div.setAttribute("aria-hidden", "true");
  cizgiler.forEach((c, i) => {
    const line = document.createElement("div");
    line.className = `line ${c ? "yang" : "yin"}${degisen.includes(i + 1) ? " moving" : ""}`;
    if (degisen.includes(i + 1)) {
      const m = document.createElement("span");
      m.className = "mark";
      m.textContent = c ? "○" : "×";
      line.append(m);
    }
    div.append(line);
  });
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

// --- Form ---

const form = $("askForm");
const ALANLAR = [["genel", "Genel"], ["ask", "Aşk"], ["kariyer", "İş ve para"], ["karar", "Bir karar"], ["ruhsal", "Ruhsal yol"]];
let seciliAlan = "genel";

function renderAreas() {
  $("areaChips").replaceChildren(...ALANLAR.map(([k, ad]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ad;
    b.setAttribute("aria-pressed", String(k === seciliAlan));
    b.addEventListener("click", () => { seciliAlan = k; renderAreas(); });
    return b;
  }));
}

function renderKota() {
  $("quota").textContent = durum.kalan == null ? "" : durum.kalan > 0
    ? `Bugün ${durum.kalan} soru hakkın kaldı (günde ${durum.sinir}).`
    : `Bugünkü ${durum.sinir} soru hakkını kullandın. I Ching aynı soruyu tekrar tekrar sormamayı öğütler; yarın yeniden bekleriz.`;
  $("askSubmit").disabled = (durum.kalan != null && durum.kalan <= 0);
}

let calisiyor = false;
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (calisiyor) return;
  const soru = form.elements.soru.value.trim();
  if (soru.length < 5) { toast("Sorunu birkaç kelimeyle yaz."); return; }
  calisiyor = true;
  const button = $("askSubmit");
  button.disabled = true;
  stopVoice();
  try {
    const response = await fetch("/api/iching/at", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ soru, alan: seciliAlan }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Paralar atılamadı.");
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    renderJournal();
    // Yorum, paralar canlandırılırken hazırlanır.
    const yorumIstegi = yorumAl(data.kayit.id);
    await atisCanlandir(data.kayit);
    $("throwTitle").textContent = "Heksagramın yorumlanıyor…";
    $("throwNote").textContent = "Çizgiler okunuyor, değişimler yorumlanıyor.";
    const kayit = await yorumIstegi;
    kayitlar = kayitlar.map((k) => (k.id === kayit.id ? kayit : k));
    form.elements.soru.value = "";
    $("atis").hidden = true;
    showKayit(kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
    $("atis").hidden = true;
  } finally {
    calisiyor = false;
    renderKota();
  }
});

async function yorumAl(id) {
  const response = await fetch("/api/iching/yorum", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Yorum alınamadı.");
  return data.kayit;
}

// --- Atış animasyonu ---

const DEGER = { 6: "Değişen yin", 7: "Yang", 8: "Yin", 9: "Değişen yang" };

async function atisCanlandir(kayit) {
  $("sonuc").hidden = true;
  $("atis").hidden = false;
  $("throwTitle").textContent = "Paralar atılıyor…";
  $("throwNote").textContent = "Sorun üzerine düşün. Altı atış, alttan yukarı altı çizgi.";
  $("build").replaceChildren();
  $("throwValue").innerHTML = "&nbsp;";
  $("atis").scrollIntoView({ behavior: "smooth", block: "center" });
  const coins = [...document.querySelectorAll("#coins .coin")];
  for (let i = 0; i < 6; i += 1) {
    const paralar = kayit.paralar[i];
    coins.forEach((coin, j) => {
      coin.classList.remove("spin");
      void coin.offsetWidth;
      coin.style.setProperty("--son", paralar[j] === 3 ? "1440deg" : "1620deg");
      coin.style.animationDelay = `${j * 0.07}s`;
      coin.classList.add("spin");
    });
    await bekle(1150);
    const toplam = kayit.atislar[i];
    $("throwValue").textContent = `${i + 1}. atış: ${paralar.map((p) => (p === 3 ? "yazı" : "tura")).join(", ")} → ${toplam} · ${DEGER[toplam]}`;
    const line = document.createElement("div");
    line.className = `line ${toplam % 2 ? "yang" : "yin"}${toplam === 6 || toplam === 9 ? " moving" : ""}`;
    const etiket = document.createElement("span");
    etiket.textContent = `${i + 1}. ${toplam}`;
    line.append(etiket);
    $("build").append(line);
    await bekle(450);
  }
}

// --- Sonuç ---

function hexKart(h, degisen, etiket) {
  const div = document.createElement("div");
  div.className = "hex-card";
  const kutu = document.createElement("div");
  kutu.className = "trigram-imgs";
  kutu.innerHTML = `<img src="${trigramResmi(h.ust)}" alt="" loading="lazy" /><img src="${trigramResmi(h.alt)}" alt="" loading="lazy" />`;
  kutu.append(hexFigur(h.cizgiler, { degisen }));
  const no = document.createElement("span");
  no.className = "no";
  no.textContent = `${etiket} · ${h.no}`;
  const b = document.createElement("b");
  b.textContent = h.ad;
  const small = document.createElement("small");
  small.textContent = `${trigramlar[h.ust].ad} üstte, ${trigramlar[h.alt].ad} altta · ${h.cince}`;
  div.append(kutu, no, b, small);
  div.addEventListener("click", () => hexAc(h.no));
  div.style.cursor = "pointer";
  return div;
}

function showKayit(kayit, kaydir = false) {
  stopVoice();
  acikKayit = kayit;
  const c = atistan(kayit.atislar);
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  $("resultQuestion").textContent = `“${kayit.soru}” · ${tarih(kayit.tarih)}`;
  $("resultTitle").textContent = y.baslik;
  $("resultBadge").textContent = kayit.kaynak === "ai" ? "✨ Sana özel yorum" : "📜 Heksagramın anlamı";
  const ciftler = [hexKart(c.ana, c.degisen, "Heksagramın")];
  if (c.sonra) {
    const ok = document.createElement("span");
    ok.className = "hex-arrow";
    ok.textContent = "→";
    ciftler.push(ok, hexKart(c.sonra, [], "Dönüştüğü"));
  }
  $("hexPair").replaceChildren(...ciftler);

  $("readingSummary").textContent = y.ozet;
  const blok = (id, metin, el) => { $(el).textContent = metin; $(id).hidden = !metin; };
  blok("stateBlock", y.durum, "stateText");
  blok("futureBlock", y.gelecek, "futureText");
  blok("answerBlock", y.cevap, "answerText");
  blok("adviceBlock", y.tavsiye, "adviceText");
  const degisenler = y.degisenler.length ? y.degisenler : c.degisen.map((n) => ({ cizgi: n, yorum: CIZGI_YERI[n - 1] }));
  $("linesBlock").hidden = !degisenler.length;
  $("movingList").replaceChildren(...degisenler.map((d) => {
    const li = document.createElement("li");
    li.innerHTML = "<b></b><span></span>";
    li.querySelector("b").textContent = d.cizgi;
    li.querySelector("span").textContent = d.yorum;
    return li;
  }));
  bindListen($("resultListen"), () => `/api/iching/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".hex-journal li").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "iching", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz bir soru sormadın. İlk sorunu yukarıda yaz.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} soru kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const c = atistan(k.atislar);
    const li = document.createElement("li");
    li.dataset.id = k.id;
    li.className = acikKayit?.id === k.id ? "is-current" : "";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open";
    const meta = document.createElement("div");
    meta.innerHTML = "<b></b><small></small><p></p>";
    meta.querySelector("b").textContent = `${c.ana.no}. ${c.ana.ad}${c.sonra ? ` → ${c.sonra.ad}` : ""}`;
    meta.querySelector("small").textContent = tarih(k.tarih);
    meta.querySelector("p").textContent = k.soru;
    open.append(hexFigur(c.ana.cizgiler, { degisen: c.degisen, kucuk: true }), meta);
    open.addEventListener("click", async () => {
      if (k.yorum) { showKayit(k, true); return; }
      // Yorumu yarım kalmış bir atış: yorumu şimdi iste.
      try {
        const dolu = await yorumAl(k.id);
        kayitlar = kayitlar.map((x) => (x.id === dolu.id ? dolu : x));
        showKayit(dolu, true);
        renderJournal();
      } catch (error) { toast(error.message); }
    });
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.title = "Bu soruyu sil";
    sil.setAttribute("aria-label", "Bu soruyu sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu soru ve yorumu günlüğünden silinsin mi?")) return;
      const response = await fetch("/api/iching/sil", {
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

// --- Trigramlar ve 64 heksagram ---

function renderTrigrams() {
  $("trigramGrid").replaceChildren(...Object.entries(trigramlar).map(([k, t]) => {
    const li = document.createElement("li");
    li.innerHTML = `<img src="${trigramResmi(k)}" alt="" width="420" height="420" loading="lazy" /><div class="info"></div>`;
    const info = li.querySelector(".info");
    const yazi = document.createElement("div");
    yazi.innerHTML = "<b></b><small></small>";
    yazi.querySelector("b").textContent = `${t.ad} · ${t.cince}`;
    yazi.querySelector("small").textContent = `${t.doga} · ${t.aile}`;
    const fig = hexFigur(t.cizgi);
    info.append(fig, yazi);
    return li;
  }));
}

function renderHexGrid() {
  $("hexGrid").replaceChildren(...Object.entries(heksagramlar).map(([no, h]) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    const small = document.createElement("small");
    small.textContent = no;
    const span = document.createElement("span");
    span.textContent = h.ad;
    b.append(hexFigur(cizgileri(Number(no))), small, span);
    b.addEventListener("click", () => hexAc(Number(no)));
    li.append(b);
    return li;
  }));
}

function hexAc(no) {
  const h = heksagramlar[no];
  const c = cizgileri(no);
  const alt = Object.keys(trigramlar).find((k) => trigramlar[k].cizgi.join("") === c.slice(0, 3).join(""));
  const ust = Object.keys(trigramlar).find((k) => trigramlar[k].cizgi.join("") === c.slice(3).join(""));
  const govde = $("hexDialogBody");
  govde.innerHTML = `<div class="hex-detail"><div><div class="trigram-imgs"><img src="${trigramResmi(ust)}" alt="" /><img src="${trigramResmi(alt)}" alt="" /></div></div>
    <div><p class="sky-label"></p><h2></h2><p class="kw"></p><p class="karar"></p><p class="tavsiye"></p><p class="kw tri"></p></div></div>`;
  govde.querySelector(".hex-detail > div").append(hexFigur(c));
  govde.querySelector(".hex-detail > div .hex").style.margin = "14px auto 0";
  govde.querySelector(".sky-label").textContent = `Heksagram ${no} · ${h.cince}`;
  govde.querySelector("h2").textContent = h.ad;
  govde.querySelector(".kw").textContent = h.anahtar.join(" · ");
  govde.querySelector(".karar").textContent = h.karar;
  govde.querySelector(".tavsiye").textContent = `Tavsiye: ${h.tavsiye}`;
  govde.querySelector(".tri").textContent = `Üstte ${trigramlar[ust].ad} (${trigramlar[ust].doga}), altta ${trigramlar[alt].ad} (${trigramlar[alt].doga}).`;
  $("hexDialog").showModal();
}

$("hexDialog").addEventListener("click", (e) => { if (e.target === $("hexDialog")) $("hexDialog").close(); });

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/iching")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/iching/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar[0]?.yorum && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

renderAreas();
renderTrigrams();
renderHexGrid();
init();
