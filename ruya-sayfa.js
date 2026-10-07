const { semboller, hisler } = RuyaVeri;
const $ = (id) => document.getElementById(id);

let durum = { ses: false, stt: false, kalan: 3, sinir: 3 };
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

const form = $("dreamForm");
const secim = { ruyaHissi: "", uyanisHissi: "" };

function renderChips(container) {
  const name = container.dataset.name;
  container.replaceChildren(...hisler.map((his) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = his;
    button.setAttribute("aria-pressed", String(secim[name] === his));
    button.addEventListener("click", () => {
      secim[name] = secim[name] === his ? "" : his;
      renderChips(container);
    });
    return button;
  }));
}

const textarea = form.elements.metin;
const sayac = () => { $("charCount").textContent = `${textarea.value.length} / 3000`; };
textarea.addEventListener("input", sayac);

function renderKota() {
  $("quota").textContent = durum.kalan == null ? "" : durum.kalan > 0
    ? `Bugün ${durum.kalan} rüya yorumu hakkın kaldı (bütün bölümlerde günde ${durum.sinir}).`
    : `Bugünkü ${durum.sinir} ücretsiz yorum hakkını kullandın. Yarın yeniden bekleriz.`;
  $("dreamSubmit").disabled = (durum.kalan != null && durum.kalan <= 0);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const metin = textarea.value.trim();
  if (metin.length < 20) { toast("Rüyanı biraz daha ayrıntılı anlat (en az birkaç cümle)."); return; }
  const button = $("dreamSubmit");
  button.disabled = true;
  button.textContent = "Rüyan yorumlanıyor…";
  try {
    const response = await fetch("/api/ruya/yorum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ metin, ...secim, durum: form.elements.durum.value }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Rüyan yorumlanamadı.");
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    form.reset();
    secim.ruyaHissi = "";
    secim.uyanisHissi = "";
    renderChips($("dreamFeel"));
    renderChips($("wakeFeel"));
    sayac();
    showKayit(data.kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    button.textContent = "Rüyamı yorumla";
    renderKota();
  }
});

// --- Sesle anlatma (Whisper) ---

let recorder = null;
let kayitZamani = null;

function micStatus(text) { $("micStatus").textContent = text; }

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    toast("Tarayıcın ses kaydını desteklemiyor.");
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast("Mikrofon izni verilmedi.");
    return;
  }
  const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
  recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const parcalar = [];
  recorder.addEventListener("dataavailable", (e) => { if (e.data.size) parcalar.push(e.data); });
  recorder.addEventListener("stop", async () => {
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(kayitZamani);
    const blob = new Blob(parcalar, { type: recorder.mimeType || "audio/webm" });
    recorder = null;
    $("micButton").classList.remove("is-recording");
    $("micButton").textContent = "🎙️ Sesle anlat";
    await transcribe(blob);
  });
  recorder.start();
  $("micButton").classList.add("is-recording");
  $("micButton").textContent = "⏹ Bitir";
  const bas = Date.now();
  micStatus("Dinliyorum… rüyanı anlat.");
  kayitZamani = setInterval(() => {
    const sn = Math.round((Date.now() - bas) / 1000);
    micStatus(`Dinliyorum… ${sn} sn`);
    if (sn >= 180) recorder?.stop();
  }, 500);
}

async function transcribe(blob) {
  const button = $("micButton");
  button.disabled = true;
  micStatus("Sesin yazıya çevriliyor…");
  try {
    const response = await fetch("/api/ruya/dinle", {
      method: "POST",
      headers: { "Content-Type": blob.type.split(";")[0] || "audio/webm" },
      credentials: "same-origin",
      body: blob,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Ses yazıya çevrilemedi.");
    if (!data.metin) throw new Error("Sesin anlaşılamadı, biraz daha yakından ve net konuşmayı dene.");
    textarea.value = [textarea.value.trim(), data.metin].filter(Boolean).join(" ").slice(0, 3000);
    sayac();
    micStatus("Yazıya çevrildi; istersen düzeltebilirsin.");
  } catch (error) {
    micStatus("");
    toast(error.message);
  } finally {
    button.disabled = false;
  }
}

$("micButton").addEventListener("click", () => {
  if (recorder) recorder.stop();
  else startRecording();
});

// --- Sonuç ---

let resimBekleme = null;

function renderPicture(kayit) {
  const figure = $("dreamPicture");
  const image = $("dreamImage");
  figure.classList.remove("is-ready", "is-none");
  image.hidden = true;
  clearTimeout(resimBekleme);
  if (kayit.resim === "hazir") {
    image.src = `/api/ruya/resim?id=${kayit.id}`;
    image.alt = kayit.yorum.baslik;
    image.hidden = false;
    figure.classList.add("is-ready");
  } else if (kayit.resim === "bekliyor") {
    // Resim arka planda üretiliyor; birkaç saniyede bir sorulur.
    resimBekleme = setTimeout(async () => {
      const data = await fetch(`/api/ruya/kayit?id=${kayit.id}`, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!data || acikKayit?.id !== kayit.id) return;
      kayitlar = kayitlar.map((k) => (k.id === kayit.id ? data.kayit : k));
      acikKayit = data.kayit;
      renderPicture(data.kayit);
      if (data.kayit.resim !== "bekliyor") renderJournal();
    }, 4000);
  } else {
    figure.classList.add("is-none");
  }
}

function listItems(items) {
  return items.map((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  });
}

function showKayit(kayit, kaydir = false) {
  window.yorumcuGoster?.(kayit); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
  stopVoice();
  acikKayit = kayit;
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  $("resultDate").textContent = `${tarih(kayit.tarih)} rüyası`;
  $("resultTitle").textContent = y.baslik;
  $("resultBadge").textContent = kayit.kaynak === "ai" ? "✨ Kişisel yorum" : "📖 Sözlükten yorum";
  $("resultTheme").textContent = y.tema;
  $("resultSymbols").replaceChildren(...(y.semboller.length ? y.semboller : [{ sembol: "Duygu", geleneksel: "", psikolojik: "Rüyandaki baskın duygu en güçlü ipucu." }]).map((s) => {
    const li = document.createElement("li");
    li.innerHTML = "<b></b><p><small>Geleneksel:</small> <span></span></p><p><small>Psikolojik:</small> <span></span></p>";
    li.querySelector("b").textContent = s.sembol;
    const [g, p] = li.querySelectorAll("span");
    g.textContent = s.geleneksel || "—";
    p.textContent = s.psikolojik || "—";
    return li;
  }));
  $("resultMessage").textContent = y.mesaj;
  $("resultReflection").textContent = y.yansima;
  $("resultMessage").parentElement.hidden = !y.mesaj;
  $("resultReflection").parentElement.hidden = !y.yansima;
  $("resultQuestions").replaceChildren(...listItems(y.sorular));
  bindListen($("resultListen"), () => `/api/ruya/ses?id=${kayit.id}`);
  renderPicture(kayit);
  uzmanKarti.goster();
  document.querySelectorAll(".journal-item").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "ruya-yorumu", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz yorumlanmış bir rüyan yok. İlk rüyanı yukarıda anlat.</li>';
    $("recurring").hidden = true;
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} rüya kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.className = `journal-item${acikKayit?.id === k.id ? " is-current" : ""}`;
    li.dataset.id = k.id;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "journal-open";
    open.innerHTML = `${k.resim === "hazir" ? `<img class="journal-thumb" src="/api/ruya/resim?id=${k.id}" alt="" loading="lazy" />` : '<span class="journal-thumb"></span>'}
      <span class="journal-meta"><b></b><small></small><p></p></span>`;
    open.querySelector("b").textContent = k.yorum.baslik;
    open.querySelector("small").textContent = tarih(k.tarih);
    open.querySelector("p").textContent = k.girdi.metin;
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "journal-delete";
    sil.title = "Bu rüyayı sil";
    sil.setAttribute("aria-label", "Bu rüyayı sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu rüya ve yorumu günlüğünden silinsin mi?")) return;
      const response = await fetch("/api/ruya/sil", {
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

  // Günlükte tekrar eden semboller.
  const sayim = new Map();
  kayitlar.forEach((k) => k.yorum.semboller.forEach((s) => {
    const ad = s.sembol.toLocaleLowerCase("tr-TR");
    sayim.set(ad, (sayim.get(ad) || 0) + 1);
  }));
  const tekrar = [...sayim].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 8);
  $("recurring").hidden = !tekrar.length;
  $("recurring").replaceChildren("Tekrar eden semboller:", ...tekrar.map(([ad, n]) => {
    const span = document.createElement("span");
    span.textContent = `${ad} · ${n}`;
    return span;
  }));
}

// --- Sözlük ---

const dekor = ["anahtar-kapi", "bulutta-yatak", "goz-ruya-kapani", "gunes-ay-bulut", "kristal-kure-kapi", "pencere-gemi", "ruya-kapani", "ruya-kitabi", "uyuyan-kedi", "yastik-goz-bandi", "kadin-profil-ruya"];

function renderTodaySymbol() {
  const gun = Math.floor((Date.now() + 3 * 3600000) / 86400000);
  const s = semboller[gun % semboller.length];
  $("todaySymbol").innerHTML = `<img src="/ruya/${dekor[gun % dekor.length]}.webp" alt="" width="110" height="110" />
    <div><p class="sky-label">Günün sembolü</p><b></b><p><small>Geleneksel:</small> <span></span></p><p><small>Psikolojik:</small> <span></span></p></div>`;
  $("todaySymbol").querySelector("b").textContent = s.ad;
  const [g, p] = $("todaySymbol").querySelectorAll("span");
  g.textContent = s.geleneksel;
  p.textContent = s.psikolojik;
}

function renderDict(filtre = "") {
  const f = filtre.toLocaleLowerCase("tr-TR").trim();
  const liste = semboller.filter((s) => !f || s.ad.toLocaleLowerCase("tr-TR").includes(f) || s.kokler.some((k) => k.trim().startsWith(f)));
  $("dictGrid").replaceChildren(...(liste.length ? liste : [{ ad: "Bulunamadı", geleneksel: "Bu sembol sözlüğümüzde yok; rüyanı anlatırsan özel olarak yorumlarız.", psikolojik: "" }]).map((s) => {
    const li = document.createElement("li");
    li.innerHTML = "<b></b><p><small>Geleneksel:</small> <span></span></p><p><small>Psikolojik:</small> <span></span></p>";
    li.querySelector("b").textContent = s.ad;
    const [g, p] = li.querySelectorAll("span");
    g.textContent = s.geleneksel;
    p.textContent = s.psikolojik || "—";
    return li;
  }));
}

$("dictSearch").addEventListener("input", (e) => renderDict(e.target.value));

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/ruya")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/ruya/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, stt: data.stt, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  $("micButton").hidden = true; // sesle anlatma kaldırıldı (Murat 2026-10-07)
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

renderChips($("dreamFeel"));
renderChips($("wakeFeel"));
renderTodaySymbol();
renderDict();
init();
