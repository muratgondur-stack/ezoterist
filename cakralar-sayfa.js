const { cakralar, sorular, durumu, cakraBul } = CakraVeri;
const $ = (id) => document.getElementById(id);

// Beden resmindeki yedi çakra noktasının konumu (resim genişliğine/yüksekliğine göre yüzde).
const NOKTALAR = { kok: [50, 75], sakral: [50, 66.3], solar: [50, 56.7], kalp: [50, 46.8], bogaz: [50, 38.3], "ucuncu-goz": [50, 22.2], tac: [50, 13.7] };

let durum = { ses: false, kalan: 3, sinir: 3 };
let kayitlar = [];
let acikKayit = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3400);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
const renkli = (el, c) => { el.style.setProperty("--c", c); return el; };

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
    meditasyonuBitir();
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

// --- Beden ve çakra ayrıntısı ---

function cakraGoster(id, kaydir = false) {
  const c = cakraBul(id);
  document.querySelectorAll(".body-figure .nokta, .chakra-strip button").forEach((el) => el.classList.toggle("aktif", el.dataset.id === id));
  const kutu = renkli($("chakraDetail"), c.renk);
  kutu.innerHTML = `<div class="disk"></div><div><p class="sky-label"></p><h2></h2><p class="alt"></p><p class="tema"></p>
    <dl><div><dt>Dengede</dt><dd class="dengede"></dd></div><div><dt>Dengesizken</dt><dd class="dengesiz"></dd></div>
    <div><dt>Uygulama</dt><dd class="uygulama"></dd></div><div><dt>Element · Mantra</dt><dd class="element"></dd></div></dl>
    <div class="stones"></div><p class="olumlama"></p></div>`;
  kutu.querySelector(".disk").textContent = c.mantra.split(" ")[0];
  kutu.querySelector(".sky-label").textContent = `${cakralar.indexOf(c) + 1}. çakra · ${c.konum}`;
  kutu.querySelector("h2").textContent = c.ad;
  kutu.querySelector(".alt").textContent = c.sanskrit;
  kutu.querySelector(".tema").textContent = c.tema;
  kutu.querySelector(".dengede").textContent = c.dengede;
  kutu.querySelector(".dengesiz").textContent = c.dengesiz;
  kutu.querySelector(".uygulama").textContent = c.uygulama;
  kutu.querySelector(".element").textContent = `${c.element} · ${c.mantra}`;
  kutu.querySelector(".stones").replaceChildren("Destekleyen kristaller: ", ...c.kristaller.map((k) => {
    const a = document.createElement("a");
    a.href = `/kristaller#${k}`;
    a.textContent = KristalVeri.kristalBul(k).ad;
    return a;
  }));
  kutu.querySelector(".olumlama").textContent = `“${c.olumlama}”`;
  if (kaydir) kutu.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderBody() {
  const fig = $("bodyFigure");
  cakralar.forEach((c, i) => {
    const b = renkli(document.createElement("button"), c.renk);
    b.type = "button";
    b.className = "nokta";
    b.dataset.id = c.id;
    b.title = c.ad;
    b.setAttribute("aria-label", c.ad);
    const [x, y] = NOKTALAR[c.id];
    b.style.left = `${x}%`;
    b.style.top = `${y}%`;
    b.style.setProperty("--d", `${i * 0.25}s`);
    b.addEventListener("click", () => cakraGoster(c.id, true));
    fig.append(b);
  });
  $("chakraStrip").replaceChildren(...cakralar.map((c) => {
    const li = document.createElement("li");
    const b = renkli(document.createElement("button"), c.renk);
    b.type = "button";
    b.dataset.id = c.id;
    b.innerHTML = "<i></i><b></b><small></small>";
    b.querySelector("b").textContent = c.ad.replace(" Çakrası", "").replace(" Çakra", "");
    b.querySelector("small").textContent = c.sanskrit;
    b.addEventListener("click", () => cakraGoster(c.id));
    li.append(b);
    return li;
  }));
  cakraGoster("kalp");
}

// --- Test ---

const cevaplar = new Array(sorular.length).fill(0);
let soruNo = 0;

function renderQuiz() {
  const bitti = soruNo >= sorular.length;
  $("quizBar").style.width = `${(Math.min(soruNo, sorular.length) / sorular.length) * 100}%`;
  $("quizEnd").hidden = !bitti;
  $("quizScale").hidden = bitti;
  $("quizBack").hidden = soruNo === 0;
  if (bitti) {
    $("quizCount").textContent = "Bütün soruları cevapladın.";
    $("quizQuestion").textContent = "Enerji haritan hazır.";
    return;
  }
  const [id, metin] = sorular[soruNo];
  const c = cakraBul(id);
  renkli($("quiz"), c.renk);
  $("quizCount").textContent = `${soruNo + 1} / ${sorular.length} · ${c.ad}`;
  const q = $("quizQuestion");
  q.textContent = metin;
  q.style.animation = "none";
  void q.offsetWidth;
  q.style.animation = "";
  $("quizScale").replaceChildren(...[1, 2, 3, 4, 5].map((v) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(v);
    b.className = cevaplar[soruNo] === v ? "secili" : "";
    b.addEventListener("click", () => {
      cevaplar[soruNo] = v;
      b.classList.add("secili");
      setTimeout(() => { soruNo += 1; renderQuiz(); }, 220);
    });
    return b;
  }));
}

$("quizBack").addEventListener("click", () => { soruNo = Math.max(0, soruNo - 1); renderQuiz(); });

function renderKota() {
  $("quota").textContent = durum.kalan == null ? "" : durum.kalan > 0
    ? `21 kısa ifade. İçinden geleni işaretle; doğru ya da yanlış cevap yok. Bugün ${durum.kalan} test hakkın var.`
    : `Bugünkü ${durum.sinir} test hakkını kullandın. Çakralar zamanla değişir; yarın yeniden ölç.`;
  $("quizSubmit").disabled = (durum.kalan != null && durum.kalan <= 0);
}

$("quizSubmit").addEventListener("click", async () => {
  const b = $("quizSubmit");
  b.disabled = true;
  b.textContent = "Enerjin okunuyor…";
  try {
    const response = await fetch("/api/cakra/test", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ cevaplar, not: $("quizNote").value.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Sonuç alınamadı.");
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    cevaplar.fill(0);
    soruNo = 0;
    $("quizNote").value = "";
    renderQuiz();
    showKayit(data.kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    b.textContent = "Sonucumu göster";
    renderKota();
  }
});

// --- Sonuç ---

function showKayit(kayit, kaydir = false) {
  window.yorumcuGoster?.(kayit); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
  stopVoice();
  acikKayit = kayit;
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  $("resultDate").textContent = tarih(kayit.tarih);
  $("resultTitle").textContent = y.baslik;
  $("resultBadge").textContent = kayit.kaynak === "ai" ? "✨ Sana özel plan" : "📜 Çakra rehberi";
  $("resultSummary").textContent = y.ozet;
  $("chakraBars").replaceChildren(...cakralar.map((c, i) => {
    const p = kayit.puanlar[c.id];
    const li = renkli(document.createElement("li"), c.renk);
    li.innerHTML = `<i></i><div><span class="ad"></span><div class="bar"><span></span></div></div><span class="val"></span><p></p>`;
    li.querySelector(".ad").textContent = c.ad;
    const small = document.createElement("small");
    small.textContent = ` · ${durumu(p)}`;
    li.querySelector(".ad").append(small);
    li.querySelector(".val").textContent = `%${p}`;
    li.querySelector("p").textContent = y.cakralar[c.id] || "";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const bar = li.querySelector(".bar span");
      bar.style.transitionDelay = `${0.1 + i * 0.12}s`;
      bar.style.width = `${Math.max(3, p)}%`;
    }));
    return li;
  }));
  const odak = cakraBul(y.odak);
  const fk = renkli($("focusChakra"), odak.renk);
  fk.innerHTML = `<div class="disk"></div><p class="sky-label">Odak çakran</p><b></b><p></p><button type="button" class="btn btn-ghost">Çakrayı tanı</button>`;
  fk.querySelector("b").textContent = odak.ad;
  fk.querySelector("p:not(.sky-label)").textContent = odak.uygulama;
  fk.querySelector("button").addEventListener("click", () => cakraGoster(odak.id, true));
  $("weekPlan").replaceChildren(...y.plan.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  $("weekBox").hidden = !y.plan.length;
  $("resultAffirmation").textContent = y.olumlama;
  bindListen($("resultListen"), () => `/api/cakra/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".chakra-journal li").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "cakralar", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Meditasyon ---

const medVoice = $("medVoice");
let medAdim = -1;
let medZaman = null;

function renderMedColumn() {
  $("medColumn").replaceChildren(...cakralar.map((c) => renkli(document.createElement("span"), c.renk)));
}

function medAdimGoster(adim) {
  const noktalar = [...$("medColumn").children];
  noktalar.forEach((n, i) => {
    n.classList.toggle("yandi", i < adim);
    n.classList.toggle("simdi", i === adim - 1);
  });
  if (adim === 0) {
    $("medStep").textContent = "Giriş";
    $("medTitleText").textContent = "Nefesine dön";
    $("medBody").textContent = "Rahat bir pozisyonda otur. Gözlerini kapat, derin bir nefes al ve yavaşça ver.";
    $("medMantra").textContent = "";
    return;
  }
  const c = cakralar[adim - 1];
  $("medStep").textContent = `${adim} / 7 · ${c.konum}`;
  $("medTitleText").textContent = c.ad;
  $("medBody").textContent = c.meditasyon;
  $("medMantra").textContent = c.mantra.split(" ")[0];
  if (window.matchMedia("(max-width: 680px)").matches) cakraGoster(c.id);
}

function meditasyonuBitir(tamam = false) {
  if (medAdim < 0) return;
  medVoice.pause();
  clearTimeout(medZaman);
  medAdim = -1;
  $("medStart").hidden = false;
  $("medStop").hidden = true;
  if (tamam) {
    [...$("medColumn").children].forEach((n) => { n.classList.add("yandi"); n.classList.remove("simdi"); });
    $("medStep").textContent = "Tamamlandı";
    $("medTitleText").textContent = "Yedi çakran ışıl ışıl";
    $("medBody").textContent = "Birkaç derin nefes daha al. Parmaklarını oynat, hazır olduğunda gözlerini yavaşça aç.";
    $("medMantra").textContent = "";
  }
}

function medSonraki() {
  medAdim += 1;
  if (medAdim > 7) { meditasyonuBitir(true); return; }
  medAdimGoster(medAdim);
  if (durum.ses) {
    medVoice.src = `/api/cakra/meditasyon?adim=${medAdim}`;
    medVoice.play().catch(() => { medZaman = setTimeout(medSonraki, 25000); });
  } else {
    medZaman = setTimeout(medSonraki, medAdim === 0 ? 12000 : 25000);
  }
}

// Her adımın sesi bitince birkaç saniyelik sessizlik, sonra sonraki çakra.
medVoice.addEventListener("ended", () => { if (medAdim >= 0) medZaman = setTimeout(medSonraki, 4000); });
medVoice.addEventListener("error", () => { if (medAdim >= 0) medZaman = setTimeout(medSonraki, 20000); });

$("medStart").addEventListener("click", () => {
  stopVoice();
  medAdim = -1;
  $("medStart").hidden = true;
  $("medStop").hidden = false;
  medSonraki();
});
$("medStop").addEventListener("click", () => meditasyonuBitir(false));

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz test yapmadın. Yukarıdaki 21 ifadeyle başla.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} test kayıtlı. Zaman içindeki değişimini izle.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.dataset.id = k.id;
    li.className = acikKayit?.id === k.id ? "is-current" : "";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open";
    const mini = document.createElement("div");
    mini.className = "mini";
    cakralar.forEach((c) => {
      const s = renkli(document.createElement("span"), c.renk);
      s.style.height = `${Math.max(6, k.puanlar[c.id])}%`;
      s.title = `${c.ad}: %${k.puanlar[c.id]}`;
      mini.append(s);
    });
    const b = document.createElement("b");
    b.textContent = k.yorum.baslik;
    const small = document.createElement("small");
    small.textContent = tarih(k.tarih);
    open.append(mini, b, small);
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.title = "Bu testi sil";
    sil.setAttribute("aria-label", "Bu testi sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu test günlüğünden silinsin mi?")) return;
      const response = await fetch("/api/cakra/sil", {
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
    window.location.replace(`/login?next=${encodeURIComponent("/cakralar")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/cakra/durum", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

renderBody();
renderQuiz();
renderMedColumn();
init();
