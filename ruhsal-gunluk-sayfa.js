const { duygular, gununSorusu, duyguBul } = GunlukVeri;
const { burclar } = AstrolojiVeri;
const $ = (id) => document.getElementById(id);
const SVG = "http://www.w3.org/2000/svg";

let durum = { ses: false, ai: false, kalan: 3, ozetHakki: true, bugun: "" };
let kayitlar = [];
let ozetler = [];
let acik = null;
let secili = [];
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3600);
};
const gunAdi = (gun, o = { weekday: "long", day: "numeric", month: "long" }) => {
  const [y, m, d] = gun.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { ...o, timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
};
const gunEkle = (gun, n) => {
  const [y, m, d] = gun.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

async function post(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body || {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "İşlem yapılamadı.");
  return data;
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

const form = $("entryForm");

function ayBilgisi(gun) {
  const [y, m, d] = gun.split("-").map(Number);
  const an = Astro.localToUtc(y, m, d, 12, 0, "Europe/Istanbul");
  const faz = Astro.moonPhase(an);
  const burc = Astro.signOf(Astro.moonLongitude(Astro.julianDay(an)));
  return `${faz.icon} ${faz.name} · Ay ${burclar[burc].ad} burcunda · ${gunAdi(gun)}`;
}

function renderMoods() {
  $("moods").replaceChildren(...duygular.map((d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.style.setProperty("--c", d.renk);
    b.setAttribute("aria-pressed", String(secili.includes(d.id)));
    b.innerHTML = "<span></span>";
    b.firstChild.textContent = d.ikon;
    b.append(d.ad);
    b.addEventListener("click", () => {
      if (secili.includes(d.id)) secili = secili.filter((x) => x !== d.id);
      else if (secili.length < 4) secili.push(d.id);
      else { toast("En fazla dört duygu seçebilirsin."); return; }
      renderMoods();
    });
    return b;
  }));
}

function formuDoldur(gun) {
  const k = kayitlar.find((x) => x.gun === gun);
  acik = k || null;
  form.elements.gun.value = gun;
  $("writeTitle").textContent = gun === durum.bugun ? "Bugünün sayfası" : `${gunAdi(gun, { day: "numeric", month: "long" })} sayfası`;
  $("moonChip").textContent = ayBilgisi(gun);
  $("prompt").textContent = gununSorusu(gun);
  secili = k ? [...k.duygular] : [];
  renderMoods();
  form.elements.enerji.value = k?.enerji || 5;
  $("energyValue").textContent = form.elements.enerji.value;
  ["sukran1", "sukran2", "sukran3"].forEach((n, i) => { form.elements[n].value = k?.sukran[i] || ""; });
  form.elements.niyet.value = k?.niyet || "";
  form.elements.metin.value = k?.metin || "";
  sayac();
  $("reflectButton").hidden = !k || !durum.ai;
  yansimaGoster(k);
  document.querySelectorAll(".pages li").forEach((el) => el.classList.toggle("is-current", el.dataset.gun === gun));
}

const sayac = () => { $("charCount").textContent = `${form.elements.metin.value.length} / 4000`; };
form.elements.metin.addEventListener("input", sayac);
form.elements.enerji.addEventListener("input", () => { $("energyValue").textContent = form.elements.enerji.value; });
form.elements.gun.addEventListener("change", () => {
  const g = form.elements.gun.value;
  if (!g || g > durum.bugun) { toast("Geleceğe günlük yazılamaz."); form.elements.gun.value = acik?.gun || durum.bugun; return; }
  formuDoldur(g);
});

function renderKota() {
  $("quota").textContent = durum.ai
    ? `Bugün ${durum.kalan} yansıma hakkın var. Günlüğünü kaydettikten sonra "Yansımamı al" ile şefkatli bir ayna tutabilirim.`
    : "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const b = $("saveButton");
  b.disabled = true;
  try {
    const { kayit } = await post("/api/ruhsal/kaydet", {
      gun: form.elements.gun.value,
      duygular: secili,
      enerji: Number(form.elements.enerji.value),
      sukran: [form.elements.sukran1.value, form.elements.sukran2.value, form.elements.sukran3.value],
      niyet: form.elements.niyet.value,
      metin: form.elements.metin.value,
    });
    kayitlar = [kayit, ...kayitlar.filter((x) => x.id !== kayit.id)].sort((a, b2) => (a.gun < b2.gun ? 1 : -1));
    acik = kayit;
    $("saved").hidden = false;
    setTimeout(() => { $("saved").hidden = true; }, 2500);
    $("reflectButton").hidden = !durum.ai;
    yansimaGoster(kayit);
    renderAll();
  } catch (error) {
    toast(error.message);
  } finally {
    b.disabled = false;
  }
});

// --- Yansıma ---

function yansimaGoster(k) {
  stopVoice();
  const y = k?.yansima;
  $("reflection").hidden = !y;
  if (!y) return;
  $("reflectionText").textContent = y.metin;
  $("reflectionQuestion").textContent = y.soru ? `Yarın için: ${y.soru}` : "";
  $("reflectionAffirmation").textContent = y.olumlama;
  bindListen($("reflectionListen"), () => `/api/ruhsal/ses?id=${k.id}&t=${y.tarih}`);
}

$("reflectButton").addEventListener("click", async () => {
  if (!acik) { toast("Önce sayfanı kaydet."); return; }
  const b = $("reflectButton");
  b.disabled = true;
  b.textContent = "Günlüğün okunuyor…";
  try {
    const { yansima } = await post("/api/ruhsal/yansima", { id: acik.id });
    acik.yansima = yansima;
    durum.kalan = Math.max(0, durum.kalan - 1);
    yansimaGoster(acik);
    renderKota();
    $("reflection").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    toast(error.message);
  } finally {
    b.disabled = false;
    b.textContent = "✨ Yansımamı al";
  }
});

// --- Sesle yazma (rüya bölümündeki Whisper hattı) ---

let recorder = null;
let kayitZamani = null;

async function kayitBaslat() {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast("Mikrofon izni verilmedi."); return; }
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
    $("micButton").textContent = "🎙️ Sesle yaz";
    $("micButton").disabled = true;
    $("micStatus").textContent = "Sesin yazıya çevriliyor…";
    try {
      const response = await fetch("/api/ruya/dinle", { method: "POST", headers: { "Content-Type": blob.type.split(";")[0] || "audio/webm" }, credentials: "same-origin", body: blob });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ses yazıya çevrilemedi.");
      if (!data.metin) throw new Error("Sesin anlaşılamadı; biraz daha net konuşmayı dene.");
      form.elements.metin.value = [form.elements.metin.value.trim(), data.metin].filter(Boolean).join(" ").slice(0, 4000);
      sayac();
      $("micStatus").textContent = "Yazıya çevrildi; istersen düzeltebilirsin.";
    } catch (error) {
      $("micStatus").textContent = "";
      toast(error.message);
    } finally {
      $("micButton").disabled = false;
    }
  });
  recorder.start();
  $("micButton").classList.add("is-recording");
  $("micButton").textContent = "⏹ Bitir";
  const bas = Date.now();
  kayitZamani = setInterval(() => {
    const sn = Math.round((Date.now() - bas) / 1000);
    $("micStatus").textContent = `Dinliyorum… ${sn} sn`;
    if (sn >= 180) recorder?.stop();
  }, 500);
}

$("micButton").hidden = !(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
$("micButton").addEventListener("click", () => { if (recorder) recorder.stop(); else kayitBaslat(); });

// --- Ritim: seri, ısı haritası, enerji grafiği ---

const baskinDuygu = (k) => duyguBul(k.duygular[0]);

function renderStreak() {
  const gunler = new Set(kayitlar.map((k) => k.gun));
  let seri = 0;
  let g = gunler.has(durum.bugun) ? durum.bugun : gunEkle(durum.bugun, -1);
  while (gunler.has(g)) { seri += 1; g = gunEkle(g, -1); }
  const bu30 = kayitlar.filter((k) => k.gun > gunEkle(durum.bugun, -30)).length;
  const kutu = (deger, etiket) => { const d = document.createElement("div"); d.innerHTML = "<b></b><small></small>"; d.firstChild.textContent = deger; d.lastChild.textContent = etiket; return d; };
  $("streak").replaceChildren(kutu(`${seri} 🔥`, "günlük seri"), kutu(String(kayitlar.length), "toplam sayfa"), kutu(String(bu30), "son 30 günde"));
}

function renderHeat() {
  const harita = new Map(kayitlar.map((k) => [k.gun, k]));
  const [y, m, d] = durum.bugun.split("-").map(Number);
  const haftaGunu = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const bas = gunEkle(durum.bugun, -(28 + haftaGunu));
  const hucreler = [];
  for (let i = 0; i < 35; i += 1) {
    const g = gunEkle(bas, i);
    const span = document.createElement("span");
    const k = harita.get(g);
    if (g > durum.bugun) span.className = "gelecek";
    if (k) {
      const dd = baskinDuygu(k);
      span.classList.add("dolu");
      span.style.setProperty("--c", dd?.renk || "#f3c26b");
      span.textContent = dd?.ikon || "✍️";
      span.title = `${gunAdi(g, { day: "numeric", month: "long" })}: ${k.duygular.map((x) => duyguBul(x)?.ad).join(", ") || "yazı"} · enerji ${k.enerji}`;
      span.addEventListener("click", () => { formuDoldur(g); $("yaz").scrollIntoView({ behavior: "smooth" }); });
    } else {
      span.title = gunAdi(g, { day: "numeric", month: "long" });
    }
    if (g === durum.bugun) span.classList.add("bugun");
    hucreler.push(span);
  }
  $("heat").replaceChildren(...hucreler);
}

function renderChart() {
  const svg = $("energyChart");
  const noktalar = [];
  for (let i = 29; i >= 0; i -= 1) {
    const g = gunEkle(durum.bugun, -i);
    const k = kayitlar.find((x) => x.gun === g);
    if (k) noktalar.push([((29 - i) / 29) * 300, 115 - ((k.enerji - 1) / 9) * 105]);
  }
  let ic = `<defs><linearGradient id="enerjiDolgu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(243,194,107,.35)"/><stop offset="100%" stop-color="rgba(243,194,107,0)"/></linearGradient></defs>`;
  [10, 62, 115].forEach((yy) => { ic += `<line class="grid" x1="0" x2="300" y1="${yy}" y2="${yy}"/>`; });
  if (noktalar.length >= 2) {
    const yol = noktalar.map(([x, yy]) => `${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
    ic += `<polygon class="area" points="${noktalar[0][0].toFixed(1)},120 ${yol} ${noktalar[noktalar.length - 1][0].toFixed(1)},120"/><polyline class="line" points="${yol}"/>`;
  }
  noktalar.forEach(([x, yy]) => { ic += `<circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="2.6"/>`; });
  if (!noktalar.length) ic += `<text x="150" y="65" text-anchor="middle" fill="#c3bdd6" font-size="11">Henüz veri yok</text>`;
  svg.innerHTML = ic;

  const sayim = new Map();
  kayitlar.filter((k) => k.gun > gunEkle(durum.bugun, -30)).forEach((k) => k.duygular.forEach((d) => sayim.set(d, (sayim.get(d) || 0) + 1)));
  const top = [...sayim].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top[0]?.[1] || 1;
  $("topMoods").replaceChildren(...(top.length ? top : [null]).map((t) => {
    const li = document.createElement("li");
    if (!t) { li.className = "empty"; li.textContent = "Duygu seçtikçe burada görünecek."; return li; }
    const dd = duyguBul(t[0]);
    li.style.setProperty("--c", dd.renk);
    li.innerHTML = "<span></span><span class=\"bar\"><span></span></span><b></b>";
    li.firstChild.textContent = `${dd.ikon} ${dd.ad}`;
    li.querySelector(".bar span").style.width = `${(t[1] / max) * 100}%`;
    li.querySelector("b").textContent = String(t[1]);
    return li;
  }));
}

// --- Haftalık özet ---

function renderWeeks() {
  $("weekButton").disabled = !durum.ozetHakki || !durum.ai;
  $("weeks").replaceChildren(...ozetler.map((o) => {
    const div = document.createElement("div");
    div.className = "card week";
    div.innerHTML = `<p class="range"></p><h3></h3><p class="o"></p><ul></ul><p class="t"></p><p class="affirmation"></p><button type="button" class="listen" hidden>🔊 Sesli dinle</button>`;
    div.querySelector(".range").textContent = `${gunAdi(o.bas, { day: "numeric", month: "long" })} – ${gunAdi(o.bit, { day: "numeric", month: "long" })} · ${o.gunSayisi} sayfa`;
    div.querySelector("h3").textContent = o.baslik;
    div.querySelector(".o").textContent = o.ozet;
    div.querySelector("ul").replaceChildren(...o.oruntuler.map((x) => { const li = document.createElement("li"); li.textContent = x; return li; }));
    div.querySelector(".t").textContent = o.tavsiye;
    div.querySelector(".affirmation").textContent = o.olumlama;
    bindListen(div.querySelector(".listen"), () => `/api/ruhsal/ses?id=${o.id}`);
    return div;
  }));
}

$("weekButton").addEventListener("click", async () => {
  const b = $("weekButton");
  b.disabled = true;
  b.textContent = "Haftan okunuyor…";
  try {
    const { ozet } = await post("/api/ruhsal/ozet");
    ozetler.unshift(ozet);
    durum.ozetHakki = false;
    renderWeeks();
  } catch (error) {
    toast(error.message);
  } finally {
    b.textContent = "Haftamı özetle";
    $("weekButton").disabled = !durum.ozetHakki || !durum.ai;
  }
});

// --- Sayfalar ---

function renderPages() {
  $("listNote").textContent = kayitlar.length ? `${kayitlar.length} sayfa. Birine dokun, aç ve düzenle.` : "";
  $("pages").replaceChildren(...(kayitlar.length ? kayitlar : [null]).map((k) => {
    const li = document.createElement("li");
    if (!k) { li.className = "empty"; li.textContent = "Henüz bir sayfan yok. Yukarıdan bugünün sayfasını yazarak başla."; return li; }
    li.dataset.gun = k.gun;
    li.className = acik?.id === k.id ? "is-current" : "";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open";
    open.innerHTML = "<span class=\"emo\"></span><b></b><small></small><p></p>";
    open.querySelector(".emo").textContent = k.duygular.map((d) => duyguBul(d)?.ikon).join(" ") || "✍️";
    open.querySelector("b").textContent = gunAdi(k.gun);
    open.querySelector("small").textContent = `${k.ay.ikon} Ay ${burclar[k.ay.burc].ad} · enerji ${k.enerji}${k.yansima ? " · ✨ yansıma" : ""}`;
    open.querySelector("p").textContent = k.metin || k.niyet || k.sukran.join(", ");
    open.addEventListener("click", () => { formuDoldur(k.gun); $("yaz").scrollIntoView({ behavior: "smooth" }); });
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.title = "Bu sayfayı sil";
    sil.setAttribute("aria-label", "Bu sayfayı sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm(`${gunAdi(k.gun, { day: "numeric", month: "long" })} sayfası silinsin mi?`)) return;
      try {
        await post("/api/ruhsal/sil", { id: k.id });
        kayitlar = kayitlar.filter((x) => x.id !== k.id);
        if (acik?.id === k.id) formuDoldur(k.gun);
        renderAll();
      } catch (error) { toast(error.message); }
    });
    li.append(open, sil);
    return li;
  }));
}

function renderAll() {
  renderStreak();
  renderHeat();
  renderChart();
  renderPages();
}

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/ruhsal-gunluk")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/ruhsal/durum", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!data) { toast("Günlüğün yüklenemedi."); return; }
  durum = { ses: data.ses, ai: data.ai, kalan: data.kalan, ozetHakki: data.ozetHakki, bugun: data.bugun };
  kayitlar = data.kayitlar;
  ozetler = data.ozetler;
  form.elements.gun.max = durum.bugun;
  formuDoldur(durum.bugun);
  renderKota();
  renderAll();
  renderWeeks();
}

init();
