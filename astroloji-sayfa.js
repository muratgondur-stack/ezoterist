const { burclar, elementler, nitelikler, gezegenler, ayBurcunda, yukselenBurcunda, sehirler } = AstrolojiVeri;
const $ = (id) => document.getElementById(id);
const TEXT = "︎"; // burç sembolleri iPhone'da renkli emojiye dönmesin
const sym = (key) => `${burclar[key].sembol}${TEXT}`;
const img = (key) => `/astroloji/${key}.webp`;

const storage = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

let durum = { ai: false, ses: false };
let toastTimer;
const toast = (text) => {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
};

const formatDate = (date, withTime = false) =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul", day: "numeric", month: "long", weekday: withTime ? undefined : "long",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);

// --- Gökyüzü şu an ---

function renderSky() {
  const now = new Date();
  const konumlar = Astro.positions(now);
  const by = Object.fromEntries(konumlar.map((k) => [k.body, k]));
  const evre = Astro.moonPhase(now);

  $("skyTime").textContent = `${formatDate(now, true)} itibarıyla, İstanbul saatiyle.`;
  $("skySun").textContent = `${sym(by.sun.sign)} ${burclar[by.sun.sign].ad} ${Math.floor(by.sun.degree)}°`;
  $("skyMoon").textContent = `${sym(by.moon.sign)} ${burclar[by.moon.sign].ad} ${Math.floor(by.moon.degree)}°`;
  $("skyMoonIcon").textContent = evre.icon;
  $("skyMoonPhase").textContent = `${evre.name} · %${Math.round(evre.illumination * 100)} aydınlık`;
  $("skyFull").textContent = formatDate(Astro.nextPhase(now, 180), true);
  $("skyNew").textContent = `Yeni ay: ${formatDate(Astro.nextPhase(now, 0), true)}`;

  $("planetList").replaceChildren(
    ...konumlar.map((k) => {
      const li = document.createElement("li");
      li.className = "planet-chip";
      li.innerHTML = `<span class="glyph">${gezegenler[k.body].sembol}${TEXT}</span>
        <span><b>${gezegenler[k.body].ad}${k.retro ? '<span class="retro" title="Geri hareket">℞</span>' : ""}</b>
        <small>${sym(k.sign)} ${burclar[k.sign].ad} ${Math.floor(k.degree)}°</small></span>`;
      return li;
    }),
  );
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
  button.dataset.label = button.textContent;
  button.hidden = !durum.ses;
  button.onclick = () => {
    if (activeListen === button) { stopVoice(); return; }
    stopVoice();
    const url = getUrl();
    if (!url) return;
    activeListen = button;
    button.disabled = true;
    button.textContent = "⏳ Alev hazırlanıyor…";
    voice.src = url;
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
});
voice.addEventListener("ended", stopVoice);
voice.addEventListener("error", () => {
  if (activeListen) toast("Seslendirme şu an hazır değil.");
  stopVoice();
});

// --- Burçlar ---

function renderSigns() {
  const mine = storage.get("ezo_burc");
  $("signGrid").replaceChildren(
    ...Astro.SIGN_KEYS.map((key) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `sign-card${key === mine ? " is-mine" : ""}`;
      button.innerHTML = `<img src="${img(key)}" alt="" width="360" height="360" loading="lazy" decoding="async" />
        <span class="sign-name">${burclar[key].ad}</span><span class="sign-dates">${burclar[key].tarih}</span>`;
      button.addEventListener("click", () => openSign(key));
      li.append(button);
      return li;
    }),
  );
}

const dialog = $("signDialog");
let openKey = null;

function listItems(items) {
  return items.map((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  });
}

async function openSign(key) {
  openKey = key;
  storage.set("ezo_burc", key);
  renderSigns();
  stopVoice();

  const b = burclar[key];
  $("dlgImage").src = img(key);
  $("dlgImage").alt = `${b.ad} burcu`;
  $("dlgDates").textContent = `${sym(key)} ${b.tarih}`;
  $("dlgName").textContent = b.ad;
  const facts = [
    ["Element", `${elementler[b.element].ikon} ${elementler[b.element].ad}`], ["Nitelik", b.nitelik], ["Gezegen", b.gezegen],
    ["Taş", b.tas], ["Renk", b.renk], ["Şanslı gün", b.gun],
  ];
  $("dlgFacts").replaceChildren(...facts.map(([k, v]) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${k}:</b> `;
    li.append(v);
    return li;
  }));
  $("dlgSummary").textContent = b.ozet;
  $("dlgStrong").replaceChildren(...listItems(b.guclu));
  $("dlgShadow").replaceChildren(...listItems(b.golge));
  $("dlgLove").textContent = b.ask;
  $("dlgCareer").textContent = b.kariyer;
  $("dlgMyth").textContent = b.mitoloji;
  $("dlgMatch").replaceChildren(...b.uyum.map((other) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<img src="${img(other)}" alt="" width="38" height="38" />${burclar[other].ad}`;
    button.addEventListener("click", () => openSign(other));
    li.append(button);
    return li;
  }));

  bindListen($("dlgListenSign"), () => `/api/astroloji/ses?tur=burc&burc=${key}`);
  $("dlgListenToday").hidden = true;
  $("dlgBadge").textContent = "";
  $("dlgToday").textContent = "Gökyüzüne bakılıyor…";

  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;

  try {
    const response = await fetch(`/api/astroloji/gunluk?burc=${key}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (openKey !== key) return;
    $("dlgToday").textContent = data.metin;
    $("dlgBadge").textContent = data.kaynak === "ai" ? "✨ Astroloğumuzun yorumu" : "🔭 Gökyüzü hesabına göre";
    bindListen($("dlgListenToday"), () => `/api/astroloji/ses?tur=gunluk&burc=${key}&gun=${data.tarih}`);
  } catch {
    if (openKey === key) $("dlgToday").textContent = "Günün yorumu şu an alınamadı. Biraz sonra tekrar dene.";
  }
}

dialog.addEventListener("close", () => { openKey = null; stopVoice(); });
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

// --- Doğum haritası ---

const form = $("chartForm");

function fillCities() {
  const select = form.elements.sehir;
  const tr = sehirler.filter((s) => s.saatDilimi === "Europe/Istanbul");
  const abroad = sehirler.filter((s) => s.saatDilimi !== "Europe/Istanbul");
  const group = (label, list) => {
    const g = document.createElement("optgroup");
    g.label = label;
    list.forEach((s) => g.append(new Option(s.ad, s.ad)));
    return g;
  };
  select.append(new Option("Şehir seç", ""), group("Türkiye", tr), group("Yurt dışı", abroad));
}

function chartFrom(values) {
  const [year, month, day] = values.tarih.split("-").map(Number);
  const city = sehirler.find((s) => s.ad === values.sehir);
  const timeKnown = !values.saatYok && /^\d{2}:\d{2}$/.test(values.saat || "");
  const [hour, minute] = timeKnown ? values.saat.split(":").map(Number) : [12, 0];
  const when = Astro.localToUtc(year, month, day, hour, minute, city.saatDilimi);
  const konumlar = Astro.positions(when);
  const yerlesim = Object.fromEntries(konumlar.map((k) => [k.body, k.sign]));
  const result = { when, konumlar, yerlesim, timeKnown, city, yukselen: "" };
  if (timeKnown) result.yukselen = Astro.signOf(Astro.angles(when, city.enlem, city.boylam).asc);
  else {
    // Saat yoksa Ay gün içinde burç değiştirmiş olabilir.
    const start = Astro.signOf(Astro.moonLongitude(Astro.julianDay(Astro.localToUtc(year, month, day, 0, 0, city.saatDilimi))));
    const end = Astro.signOf(Astro.moonLongitude(Astro.julianDay(Astro.localToUtc(year, month, day, 23, 59, city.saatDilimi))));
    if (start !== end) result.ayBelirsiz = [start, end];
  }
  return result;
}

function trio(label, key, text) {
  const div = document.createElement("div");
  div.className = "trio";
  div.innerHTML = `<img src="${img(key)}" alt="" width="96" height="96" />
    <div><p class="trio-label">${label}</p><p class="trio-sign">${sym(key)} ${burclar[key].ad}</p></div>`;
  const p = document.createElement("p");
  p.textContent = text;
  div.append(p);
  return div;
}

// Haritanın görsel kısmı (Güneş/Ay/yükselen kartları, yerleşimler) girdiden tarayıcıda çizilir.
function drawChart(values) {
  const chart = chartFrom(values);
  $("chartResult").hidden = false;

  const ayMetni = chart.ayBelirsiz
    ? `Doğum saatine göre Ay'ın ${burclar[chart.ayBelirsiz[0]].ad} ya da ${burclar[chart.ayBelirsiz[1]].ad} burcunda. ${ayBurcunda[chart.yerlesim.moon]}`
    : ayBurcunda[chart.yerlesim.moon];
  const cards = [
    trio("Güneş", chart.yerlesim.sun, burclar[chart.yerlesim.sun].anahtar.join(" · ")),
    trio("Ay", chart.yerlesim.moon, ayMetni),
  ];
  if (chart.yukselen) cards.push(trio("Yükselen", chart.yukselen, yukselenBurcunda[chart.yukselen]));
  else {
    const div = document.createElement("div");
    div.className = "trio";
    div.innerHTML = `<p class="trio-label">Yükselen</p><p class="trio-sign">?</p><p>Yükselen burç için doğum saatin gerekli.</p>`;
    cards.push(div);
  }
  $("bigThree").replaceChildren(...cards);

  $("placements").replaceChildren(...chart.konumlar.map((k) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="glyph">${gezegenler[k.body].sembol}${TEXT}</span><b>${gezegenler[k.body].ad}</b>
      <span class="where">${sym(k.sign)} ${burclar[k.sign].ad} ${Math.floor(k.degree)}°${k.retro ? ' <span class="retro">℞</span>' : ""}</span>`;
    return li;
  }));
}

const shortDate = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date(ms));

function fillForm(girdi) {
  form.elements.tarih.value = girdi.tarih || "";
  form.elements.saat.value = girdi.saat || "";
  form.elements.saatYok.checked = Boolean(girdi.saatYok);
  form.elements.saat.disabled = form.elements.saatYok.checked;
  form.elements.sehir.value = girdi.sehir || "";
}

// Sunucudaki kayıtlı haritayı (yorum + ses) gösterir.
function showSaved(kayit) {
  fillForm(kayit.girdi);
  drawChart(kayit.girdi);
  $("chartReading").textContent = kayit.metin;
  $("chartBadge").textContent = kayit.kaynak === "ai" ? "✨ Astroloğumuzun yorumu" : "📜 Haritanın özeti";
  const notlar = [`Bu harita ${shortDate(kayit.olusturma)} tarihinde çıkarıldı.`];
  if (kayit.yeniHaritaTarihi) notlar.push(`Farklı bilgilerle yeni harita ${shortDate(kayit.yeniHaritaTarihi)} tarihinden itibaren çıkarılabilir.`);
  $("chartNote").textContent = notlar.join(" ");
  bindListen($("chartListen"), () => `/api/astroloji/ses?tur=harita&id=${kayit.id}`);
}

async function requestChart(girdi) {
  stopVoice();
  drawChart(girdi);
  $("chartResult").scrollIntoView({ behavior: "smooth", block: "start" });
  $("chartReading").textContent = "Haritan yorumlanıyor…";
  $("chartBadge").textContent = "";
  $("chartNote").textContent = "";
  $("chartListen").hidden = true;

  try {
    const response = await fetch("/api/astroloji/harita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ girdi }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error);
    if (data.kilitli) toast(`Yeni harita ${shortDate(data.yeniHaritaTarihi)} tarihinden itibaren çıkarılabilir. Kayıtlı haritan gösteriliyor.`);
    showSaved(data);
  } catch (error) {
    $("chartReading").textContent = error.message || "Yorum şu an alınamadı; yerleşimlerin aşağıda.";
  }
}

form.elements.saatYok.addEventListener("change", () => {
  form.elements.saat.disabled = form.elements.saatYok.checked;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const girdi = {
    tarih: form.elements.tarih.value,
    saat: form.elements.saatYok.checked ? "" : form.elements.saat.value,
    saatYok: form.elements.saatYok.checked || !form.elements.saat.value,
    sehir: form.elements.sehir.value,
  };
  if (!girdi.tarih || !girdi.sehir) { toast("Doğum tarihini ve yerini seç."); return; }
  requestChart(girdi);
});


// --- Sözlük ---

function renderGlossary() {
  $("elementGrid").replaceChildren(...Object.values(elementler).map((e) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="el-icon">${e.ikon}</span><b>${e.ad}</b><span class="el-signs">${e.burclar.map((k) => burclar[k].ad).join(" · ")}</span>`;
    const p = document.createElement("p");
    p.textContent = e.aciklama;
    li.append(p);
    return li;
  }));
  $("modalityGrid").replaceChildren(...Object.entries(nitelikler).map(([ad, metin]) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${ad}</b>`;
    const p = document.createElement("p");
    p.textContent = metin;
    li.append(p);
    return li;
  }));
  $("planetGrid").replaceChildren(...Object.values(gezegenler).map((g) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="glyph">${g.sembol}${TEXT}</span><b>${g.ad}</b>`;
    const p = document.createElement("p");
    p.textContent = g.anlam;
    li.append(p);
    return li;
  }));
}

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/astroloji")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  durum = await fetch("/api/astroloji/durum", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : durum)).catch(() => durum);
  const kayit = await fetch("/api/astroloji/harita", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (kayit?.id) showSaved(kayit);
}

renderSky();
setInterval(renderSky, 5 * 60 * 1000);
renderSigns();
fillCities();
renderGlossary();
init();
