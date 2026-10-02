const { sayilar, pozisyonlar, kisiselYil, gunEnerjisi, karmikBorclar, eksikSayilar, kavramlar } = NumerolojiVeri;
const $ = (id) => document.getElementById(id);
const img = (n) => `/numeroloji/${sayilar[n].resim}.webp`;

let durum = { ses: false };
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3200);
};
const shortDate = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date(ms));

// --- Ses: baş numeroloğumuz konuşurken videosu oynar ---

const voice = $("voice");
const numerologVideo = $("numerologVideo");
let activeListen = null;

function konusuyor(evet) {
  $("numerolog").classList.toggle("is-speaking", evet);
  $("numerologCaption").textContent = evet ? "Şu an seninle konuşuyor…" : "Yorumlarını sesli dinlediğinde seninle konuşur.";
  if (evet) numerologVideo.play().catch(() => {});
  else numerologVideo.pause();
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
    numerologVideo.preload = "auto";
    voice.src = getUrl();
    voice.play().catch(() => {
      toast("Ses çalınamadı. Lütfen tekrar deneyin.");
      stopVoice();
    });
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
voice.addEventListener("error", () => {
  if (activeListen) toast("Seslendirme şu an hazır değil.");
  stopVoice();
});

// --- Bugün ---

let profil = null;

function renderToday() {
  const b = Numeroloji.bugun();
  const evrensel = Numeroloji.evrenselGun(b.gun, b.ay, b.yil);
  $("todayDate").textContent = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric", weekday: "long" }).format(new Date());
  $("universalNumber").textContent = evrensel;
  $("universalText").textContent = gunEnerjisi[evrensel];
}

async function renderPersonalDay() {
  if (!profil) return;
  const [, ay, gun] = profil.girdi.tarih.split("-").map(Number);
  const b = Numeroloji.bugun();
  const kYil = Numeroloji.kisiselYil(gun, ay, b.yil);
  const kAy = Numeroloji.kisiselAy(kYil, b.ay);
  const kGun = Numeroloji.kisiselGun(kAy, b.gun);
  $("personalTitle").textContent = `Kişisel günün: ${kGun}`;
  $("cycleChips").innerHTML = `<span>Kişisel yıl ${kYil}</span><span>Kişisel ay ${kAy}</span><span>Kişisel gün ${kGun}</span>`;
  $("personalText").textContent = "Bugünün yorumu hazırlanıyor…";
  try {
    const response = await fetch(`/api/numeroloji/gunluk?sayi=${kGun}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    $("personalText").textContent = `${data.metin}\n\nYılın teması: ${kisiselYil[kYil]}`;
    $("personalBadge").textContent = data.kaynak === "ai" ? "✨ Baş numeroloğumuzun yorumu" : "🔢 Sayıların anlamı";
    bindListen($("personalListen"), () => `/api/numeroloji/ses?tur=gunluk&sayi=${kGun}&gun=${data.tarih}`);
  } catch {
    $("personalText").textContent = `${gunEnerjisi[kGun]}\n\nYılın teması: ${kisiselYil[kYil]}`;
  }
}

// --- Profil ---

const form = $("profileForm");

function renderProfile(kayit) {
  profil = kayit;
  form.elements.adSoyad.value = kayit.girdi.adSoyad;
  form.elements.tarih.value = kayit.girdi.tarih;
  $("profileResult").hidden = false;

  // Kişisel yıl bugünün yılına göre yeniden hesaplanır (kayıt geçen yıldan kalmış olabilir).
  const [, ay, gun] = kayit.girdi.tarih.split("-").map(Number);
  const s = { ...kayit.sayilar, kisiselYil: Numeroloji.kisiselYil(gun, ay, Numeroloji.bugun().yil) };
  const sira = ["yasamYolu", "kader", "ruh", "kisilik", "dogumGunu", "olgunluk", "kisiselYil"];
  $("coreGrid").replaceChildren(...sira.map((pos) => {
    const n = s[pos];
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `core-card${pos === "yasamYolu" ? " is-main" : ""}`;
    button.innerHTML = `<span class="num">${n}</span><span class="pos"></span><span class="tag"></span>`;
    button.querySelector(".pos").textContent = pozisyonlar[pos].ad;
    button.querySelector(".tag").textContent = sayilar[n].ad;
    button.addEventListener("click", () => openNumber(n, pos));
    li.append(button);
    return li;
  }));

  const sayim = Numeroloji.izgara(gun, ay, Number(kayit.girdi.tarih.slice(0, 4)));
  $("loshu").replaceChildren(...[4, 9, 2, 3, 5, 7, 8, 1, 6].map((n) => {
    const span = document.createElement("span");
    span.textContent = sayim[n] ? String(n).repeat(Math.min(sayim[n], 4)) : n;
    if (!sayim[n]) span.classList.add("is-empty");
    span.title = sayim[n] ? `${n}: ${sayim[n]} kez` : `${n}: yok`;
    return span;
  }));

  const dersler = [
    ...kayit.karmikBorclar.map((k) => karmikBorclar[k]),
    ...kayit.eksik.map((n) => eksikSayilar[n]),
  ];
  $("lessons").replaceChildren(...(dersler.length ? dersler : ["Adında tüm sayılar var ve karmik borç görünmüyor: dengeli bir başlangıç."]).map((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    return li;
  }));

  $("profileReading").textContent = kayit.metin;
  $("profileBadge").textContent = kayit.kaynak === "ai" ? "✨ Kişisel yorum" : "🔢 Sayılarının özeti";
  const notlar = [`Bu profil ${shortDate(kayit.olusturma)} tarihinde çıkarıldı.`];
  if (kayit.yeniProfilTarihi) notlar.push(`Farklı bilgilerle yeni profil ${shortDate(kayit.yeniProfilTarihi)} tarihinden itibaren çıkarılabilir.`);
  $("profileNote").textContent = notlar.join(" ");
  bindListen($("profileListen"), () => `/api/numeroloji/ses?tur=profil&id=${kayit.id}`);
  uzmanKarti.goster();
  renderPersonalDay();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const girdi = { adSoyad: form.elements.adSoyad.value.trim(), tarih: form.elements.tarih.value };
  if (girdi.adSoyad.split(/\s+/).length < 2 || !girdi.tarih) { toast("Doğumdaki tam adını (ad ve soyad) ve doğum tarihini gir."); return; }
  stopVoice();
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  $("profileResult").hidden = false;
  $("profileReading").textContent = "Sayıların yorumlanıyor…";
  $("profileResult").scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const response = await fetch("/api/numeroloji/profil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ girdi }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Profil hesaplanamadı.");
    if (data.kilitli) toast(`Yeni profil ${shortDate(data.yeniProfilTarihi)} tarihinden itibaren çıkarılabilir. Kayıtlı profilin gösteriliyor.`);
    renderProfile(data);
  } catch (error) {
    $("profileReading").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

// --- Sayı penceresi ---

const dialog = $("numberDialog");

function listItems(items) {
  return items.map((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  });
}

function openNumber(n, pos) {
  stopVoice();
  const s = sayilar[n];
  $("dlgImage").src = img(n);
  $("dlgKeywords").textContent = s.anahtar.join(" · ");
  $("dlgName").textContent = `${n} · ${s.ad}`;
  $("dlgPosition").textContent = pos ? `${pozisyonlar[pos].ad}: ${pozisyonlar[pos].aciklama}` : "";
  $("dlgSummary").textContent = s.ozet;
  $("dlgStrong").replaceChildren(...listItems(s.guclu));
  $("dlgShadow").replaceChildren(...listItems(s.golge));
  $("dlgLove").textContent = s.ask;
  $("dlgCareer").textContent = s.kariyer;
  bindListen($("dlgListen"), () => `/api/numeroloji/ses?tur=sayi&sayi=${n}`);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

dialog.addEventListener("close", stopVoice);
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

function renderNumbers() {
  $("numberGrid").replaceChildren(...Object.keys(sayilar).map(Number).map((n) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sign-card";
    button.innerHTML = `<img src="${img(n)}" alt="" width="360" height="360" loading="lazy" decoding="async" />
      <span class="sign-name">${n}</span><span class="sign-dates"></span>`;
    button.querySelector(".sign-dates").textContent = sayilar[n].ad;
    button.addEventListener("click", () => openNumber(n));
    li.append(button);
    return li;
  }));
}

function renderConcepts() {
  $("conceptGrid").replaceChildren(...kavramlar.map(([ad, metin]) => {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = ad;
    const p = document.createElement("p");
    p.textContent = metin;
    li.append(b, p);
    return li;
  }));
}

const uzmanKarti = UzmanKarti({ bolum: "numeroloji-profil", bindListen, toast });

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/numeroloji")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  durum = await fetch("/api/astroloji/durum", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : durum)).catch(() => durum);
  await uzmanKarti.yukle();
  const kayit = await fetch("/api/numeroloji/profil", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (kayit?.id) renderProfile(kayit);
  else if (me.user.name && me.user.name.trim().split(/\s+/).length > 1) form.elements.adSoyad.value = me.user.name;
}

renderToday();
renderNumbers();
renderConcepts();
init();
