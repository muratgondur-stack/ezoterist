const { burclar } = AstrolojiVeri;
const { evreler, ayBurcunda, yeniAyTemasi } = AyVeri;
const $ = (id) => document.getElementById(id);
const SVG = "http://www.w3.org/2000/svg";
const TZ = "Europe/Istanbul";
const TEXT = "︎";

let durum = { ses: false };
let niyetler = [];
let dongu = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3400);
};
const bicim = (d, o) => new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, ...o }).format(d);
const gunSaat = (d) => bicim(d, { day: "numeric", month: "long", weekday: "long", hour: "2-digit", minute: "2-digit" });
const gunKodu = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const ayBurcu = (d) => Astro.signOf(Astro.moonLongitude(Astro.julianDay(d)));
const evreIndeksi = (e) => Math.floor(Astro.norm(e + 22.5) / 45);
const burcSembol = (k) => `${burclar[k].sembol}${TEXT}`;

// --- Ay çizimi ---

// Ay yüzeyi için tek bir gradyan; tüm çizimler bunu kullanır.
(function tanimlar() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = `<defs><radialGradient id="ayDoku" cx="40%" cy="38%" r="70%">
    <stop offset="0%" stop-color="#ffffff"/><stop offset="55%" stop-color="#e3e8f6"/><stop offset="100%" stop-color="#aab3cf"/></radialGradient></defs>`;
  document.body.prepend(svg);
})();

// elongation: Ay'ın Güneş'ten açısı (0 Yeni Ay, 180 Dolunay). Büyürken sağ taraf aydınlanır (kuzey yarımküre).
function ayCiz(elongation) {
  const e = Astro.norm(elongation);
  const r = 48;
  const rx = Math.abs(Math.cos((e * Math.PI) / 180)) * r;
  const d = e <= 180
    ? `M0,-${r} A${r},${r} 0 0 1 0,${r} A${rx.toFixed(2)},${r} 0 0 ${e < 90 ? 0 : 1} 0,-${r}Z`
    : `M0,-${r} A${r},${r} 0 0 0 0,${r} A${rx.toFixed(2)},${r} 0 0 ${e > 270 ? 1 : 0} 0,-${r}Z`;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "-50 -50 100 100");
  svg.setAttribute("class", "moon-svg");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<circle class="dark" r="${r}"/><path class="lit" d="${d}"/><circle class="rim" r="${r}"/>`;
  return svg;
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

// --- Şu an ---

// Ay'ın bir sonraki burç değişimi: saat saat ilerleyip sonra dakikaya kadar daraltır.
function burcGecisi(simdi) {
  const bas = ayBurcu(simdi);
  let lo = simdi.getTime();
  let hi = lo;
  for (let i = 0; i < 80; i += 1) {
    hi += 3600000;
    if (ayBurcu(new Date(hi)) !== bas) break;
    lo = hi;
  }
  while (hi - lo > 60000) {
    const orta = (lo + hi) / 2;
    if (ayBurcu(new Date(orta)) === bas) lo = orta;
    else hi = orta;
  }
  return { zaman: new Date(hi), burc: ayBurcu(new Date(hi)) };
}

function kalan(hedef) {
  const ms = hedef - Date.now();
  const gun = Math.floor(ms / 86400000);
  const saat = Math.floor((ms % 86400000) / 3600000);
  return gun > 0 ? `${gun} gün ${saat} saat sonra` : `${saat} saat sonra`;
}

function renderNow() {
  const simdi = new Date();
  const faz = Astro.moonPhase(simdi);
  const burc = ayBurcu(simdi);
  const evre = evreler[evreIndeksi(faz.elongation)];
  const sonYeniAy = Astro.nextPhase(new Date(simdi.getTime() - 30 * 86400000), 0);
  const yas = (simdi - sonYeniAy) / 86400000;
  const gecis = burcGecisi(simdi);

  $("nowDate").textContent = bicim(simdi, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  $("nowMoon").replaceChildren(ayCiz(faz.elongation));
  $("nowPhaseLabel").textContent = faz.waxing ? "Büyüyen Ay" : "Küçülen Ay";
  $("nowPhase").textContent = faz.name;
  const facts = [
    ["Aydınlanma", `%${Math.round(faz.illumination * 100)}`],
    ["Ay'ın yaşı", `${yas.toFixed(1)} gün`],
    ["Ay burcu", `${burcSembol(burc)} ${burclar[burc].ad}`],
    ["Burç değişimi", `${bicim(gecis.zaman, { weekday: "short", hour: "2-digit", minute: "2-digit" })} · ${burclar[gecis.burc].ad}`],
  ];
  $("nowFacts").replaceChildren(...facts.map(([k, v]) => {
    const li = document.createElement("li");
    li.textContent = k;
    const b = document.createElement("b");
    b.textContent = v;
    li.prepend(b);
    return li;
  }));
  $("nowAdvice").textContent = evre.oneri;

  $("nowSign").innerHTML = `<img src="/astroloji/${burc}.webp" alt="" width="120" height="120" /><div><b></b><small></small><p></p></div>`;
  $("nowSign").querySelector("b").textContent = `Ay ${burclar[burc].ad} burcunda`;
  $("nowSign").querySelector("small").textContent = `${burclar[gecis.burc].ad} burcuna geçişi: ${bicim(gecis.zaman, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`;
  $("nowSign").querySelector("p").textContent = ayBurcunda[burc].tema;

  const hedefler = [[0, "Yeni Ay"], [90, "İlk Dördün"], [180, "Dolunay"], [270, "Son Dördün"]]
    .map(([aci, ad]) => ({ aci, ad, zaman: Astro.nextPhase(simdi, aci) }))
    .sort((a, b) => a.zaman - b.zaman);
  $("nextPhases").replaceChildren(...hedefler.map((h) => {
    const div = document.createElement("div");
    div.className = "card";
    div.append(ayCiz(h.aci));
    const yazi = document.createElement("div");
    yazi.innerHTML = "<b></b><small></small><span class=\"count\"></span>";
    yazi.querySelector("b").textContent = `${h.ad} · ${burclar[ayBurcu(h.zaman)].ad}`;
    yazi.querySelector("small").textContent = `${bicim(h.zaman, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`;
    yazi.querySelector(".count").textContent = ` · ${kalan(h.zaman)}`;
    div.append(yazi);
    return div;
  }));
}

// --- Döngü ve rehber ---

function renderCycle() {
  if (!dongu) return;
  const yeni = new Date(dongu.yeniAy);
  const dolu = new Date(dongu.dolunay);
  const kart = (resim, etiket, tarih, burc, metin) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<img src="/ay/${resim}.webp?v=1" alt="" width="120" height="120" loading="lazy" /><div><p class="sky-label"></p><b></b><p></p></div>`;
    div.querySelector(".sky-label").textContent = `${etiket} · ${bicim(tarih, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`;
    div.querySelector("b").textContent = `${burcSembol(burc)} ${burclar[burc].ad}`;
    div.querySelector("p:last-child").textContent = metin;
    return div;
  };
  const yb = ayBurcu(yeni);
  const db = ayBurcu(dolu);
  $("cycle").replaceChildren(
    kart("yeniay", "Bu döngünün Yeni Ay'ı", yeni, yb, `Niyet teması: ${yeniAyTemasi[yb]}.`),
    kart("dolunay", dolu < new Date() ? "Bu döngünün Dolunay'ı" : "Yaklaşan Dolunay", dolu, db, `Farkındalık teması: ${yeniAyTemasi[db]}.`),
  );
  $("guideNote").textContent = `Bu döngü ${bicim(yeni, { day: "numeric", month: "long" })} Yeni Ay'ı ile başladı, ${bicim(new Date(dongu.sonrakiYeniAy), { day: "numeric", month: "long" })} Yeni Ay'ında yenilenecek.`;
}

function renderGuide(r) {
  window.yorumcuGoster?.(r); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
  $("guideStart").hidden = Boolean(r);
  $("guide").hidden = !r;
  if (!r) return;
  const y = r.rehber;
  $("guideHeadline").textContent = y.baslik;
  $("guideBadge").textContent = r.kaynak === "ai" ? "✨ Sana özel" : "📜 Döngünün teması";
  $("guideNew").textContent = y.yeniAy;
  $("guideFull").textContent = y.dolunay;
  const liste = (id, items) => $(id).replaceChildren(...items.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  liste("guideIntentions", y.niyetOnerileri);
  liste("guideRelease", y.birakilacaklar);
  liste("guideRitual", y.rituel);
  $("guideRitualBox").hidden = !y.rituel.length;
  $("guideAffirmation").textContent = y.olumlama;
  bindListen($("guideListen"), () => `/api/ay/ses?k=${r.kod}`);
  uzmanKarti.goster();
}

$("guideButton").addEventListener("click", async () => {
  const b = $("guideButton");
  b.disabled = true;
  b.textContent = "Ay ve haritan okunuyor…";
  try {
    const response = await fetch("/api/ay/rehber", { method: "POST", credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Rehber hazırlanamadı.");
    renderGuide(data);
    $("guide").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    toast(error.message);
  } finally {
    b.disabled = false;
    b.textContent = "Bana özel Ay rehberimi hazırla";
  }
});

const uzmanKarti = UzmanKarti({ bolum: "ay-takvimi", bindListen, toast });

// --- Niyet defteri ---

function donguAdi(kod) {
  const [y, m, d] = kod.split("-").map(Number);
  const yeniAy = Astro.nextPhase(new Date(Date.UTC(y, m - 1, d) - 86400000), 0);
  return `${burclar[ayBurcu(yeniAy)].ad} Yeni Ay'ı döngüsü · ${bicim(yeniAy, { day: "numeric", month: "long", year: "numeric" })}`;
}

function renderIntents() {
  const kutu = $("intentList");
  if (!niyetler.length) {
    kutu.innerHTML = '<p class="intent-empty">Henüz niyet yazmadın. Yeni Ay, niyet yazmak için en güçlü zamandır.</p>';
    return;
  }
  const gruplar = new Map();
  niyetler.forEach((n) => { if (!gruplar.has(n.ay)) gruplar.set(n.ay, []); gruplar.get(n.ay).push(n); });
  kutu.replaceChildren(...[...gruplar].map(([kod, liste]) => {
    const div = document.createElement("div");
    div.className = "intent-group";
    const h4 = document.createElement("h4");
    h4.textContent = `${kod === dongu?.kod ? "Bu döngü · " : ""}${donguAdi(kod)}`;
    const ul = document.createElement("ul");
    ul.className = "intents";
    ul.replaceChildren(...liste.map((n) => {
      const li = document.createElement("li");
      li.className = n.durum;
      const span = document.createElement("span");
      span.textContent = n.metin;
      const acts = document.createElement("div");
      acts.className = "acts";
      const btn = (ikon, baslik, hedef) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = ikon;
        b.title = baslik;
        b.setAttribute("aria-label", baslik);
        b.setAttribute("aria-pressed", String(n.durum === hedef));
        b.addEventListener("click", async () => {
          const yeni = n.durum === hedef ? "bekliyor" : hedef;
          const response = await fetch("/api/ay/niyet-durum", {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id: n.id, durum: yeni }),
          });
          if (!response.ok) { toast("Kaydedilemedi."); return; }
          n.durum = yeni;
          if (yeni === "gerceklesti") toast("Ne güzel! Şükranla kutla. ✨");
          renderIntents();
        });
        return b;
      };
      const sil = document.createElement("button");
      sil.type = "button";
      sil.textContent = "🗑";
      sil.title = "Sil";
      sil.setAttribute("aria-label", "Niyeti sil");
      sil.addEventListener("click", async () => {
        if (!confirm("Bu niyet silinsin mi?")) return;
        const response = await fetch("/api/ay/niyet-sil", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id: n.id }),
        });
        if (!response.ok) { toast("Silinemedi."); return; }
        niyetler = niyetler.filter((x) => x.id !== n.id);
        renderIntents();
      });
      acts.append(btn("✓", "Gerçekleşti", "gerceklesti"), btn("🕊", "Bıraktım", "birakildi"), sil);
      li.append(span, acts);
      return li;
    }));
    div.append(h4, ul);
    return div;
  }));
}

$("intentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("intentForm").elements.metin;
  const metin = input.value.trim();
  if (metin.length < 3) { toast("Niyetini birkaç kelimeyle yaz."); return; }
  try {
    const response = await fetch("/api/ay/niyet", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ metin }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Niyet kaydedilemedi.");
    niyetler.unshift(data.niyet);
    input.value = "";
    renderIntents();
  } catch (error) {
    toast(error.message);
  }
});

// --- Takvim ---

let gosterilen = (() => { const [y, m] = gunKodu(new Date()).split("-").map(Number); return { y, m }; })();
let seciliGun = null;

function ozelGunler(y, m) {
  // Ayın içindeki Yeni Ay ve Dolunay anları, yerel gün koduna göre.
  const sonuc = new Map();
  [0, 90, 180, 270].forEach((aci) => {
    let t = new Date(Date.UTC(y, m - 1, 1) - 3 * 86400000);
    for (let i = 0; i < 3; i += 1) {
      const an = Astro.nextPhase(t, aci);
      sonuc.set(gunKodu(an), { aci, an });
      t = new Date(an.getTime() + 86400000);
    }
  });
  return sonuc;
}

const OZEL_AD = { 0: "Yeni Ay", 90: "İlk Dördün", 180: "Dolunay", 270: "Son Dördün" };

function renderCalendar() {
  const { y, m } = gosterilen;
  $("monthName").textContent = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));
  const gunSayisi = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const ilkGun = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Pazartesi = 0
  const ozel = ozelGunler(y, m);
  const bugun = gunKodu(new Date());
  const hucreler = [];
  for (let i = 0; i < ilkGun; i += 1) {
    const s = document.createElement("span");
    s.className = "bos";
    hucreler.push(s);
  }
  for (let d = 1; d <= gunSayisi; d += 1) {
    const kod = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const ogle = Astro.localToUtc(y, m, d, 12, 0, TZ);
    const faz = Astro.moonPhase(ogle);
    const burc = ayBurcu(ogle);
    const b = document.createElement("button");
    b.type = "button";
    b.className = `${kod === bugun ? "bugun" : ""}${kod === seciliGun ? " secili" : ""}`;
    const no = document.createElement("span");
    no.className = "no";
    no.textContent = String(d);
    const burcEl = document.createElement("span");
    burcEl.className = "burc";
    burcEl.textContent = burcSembol(burc);
    burcEl.title = burclar[burc].ad;
    b.append(no, ayCiz(ozel.get(kod) ? ozel.get(kod).aci : faz.elongation), burcEl);
    const o = ozel.get(kod);
    if (o && (o.aci === 0 || o.aci === 180)) {
      const etiket = document.createElement("span");
      etiket.className = "ozel";
      etiket.textContent = o.aci === 0 ? "Yeni Ay" : "Dolunay";
      b.append(etiket);
      b.classList.add("ozel-gun");
    }
    b.setAttribute("aria-label", `${d} · ${o ? OZEL_AD[o.aci] : evreler[evreIndeksi(faz.elongation)].ad} · Ay ${burclar[burc].ad}`);
    b.addEventListener("click", () => { seciliGun = kod; renderCalendar(); gunDetay(kod, ogle, o); });
    hucreler.push(b);
  }
  $("calGrid").replaceChildren(...hucreler);
}

function gunDetay(kod, ogle, ozel) {
  const faz = Astro.moonPhase(ogle);
  const burc = ayBurcu(ogle);
  const evre = evreler[evreIndeksi(faz.elongation)];
  const kutu = $("dayDetail");
  kutu.hidden = false;
  kutu.innerHTML = "<div></div><div><p class=\"sky-label\"></p><h3></h3><p class=\"ozel-an\"></p><p class=\"tema\"></p><p class=\"evre\"></p><ul class=\"uygun\"></ul></div>";
  kutu.firstElementChild.replaceWith(ayCiz(faz.elongation));
  const [y, m, d] = kod.split("-").map(Number);
  kutu.querySelector(".sky-label").textContent = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
  kutu.querySelector("h3").textContent = `${evre.ad} · Ay ${burclar[burc].ad} burcunda · %${Math.round(faz.illumination * 100)}`;
  kutu.querySelector(".ozel-an").textContent = ozel ? `${OZEL_AD[ozel.aci]} tam anı: ${bicim(ozel.an, { hour: "2-digit", minute: "2-digit" })} (${burclar[ayBurcu(ozel.an)].ad})` : "";
  kutu.querySelector(".ozel-an").hidden = !ozel;
  kutu.querySelector(".tema").textContent = ayBurcunda[burc].tema;
  kutu.querySelector(".evre").textContent = evre.oneri;
  kutu.querySelector(".uygun").replaceChildren(...ayBurcunda[burc].uygun.map((u) => { const li = document.createElement("li"); li.textContent = u; return li; }));
  kutu.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

$("prevMonth").addEventListener("click", () => { gosterilen = gosterilen.m === 1 ? { y: gosterilen.y - 1, m: 12 } : { y: gosterilen.y, m: gosterilen.m - 1 }; renderCalendar(); });
$("nextMonth").addEventListener("click", () => { gosterilen = gosterilen.m === 12 ? { y: gosterilen.y + 1, m: 1 } : { y: gosterilen.y, m: gosterilen.m + 1 }; renderCalendar(); });

// --- Yeni Ay ve Dolunay listesi ---

function renderLunations() {
  const liste = [];
  [0, 180].forEach((aci) => {
    let t = new Date();
    for (let i = 0; i < 13; i += 1) {
      const an = Astro.nextPhase(t, aci);
      liste.push({ aci, an });
      t = new Date(an.getTime() + 86400000);
    }
  });
  const sinir = Date.now() + 365 * 86400000;
  $("lunations").replaceChildren(...liste.filter((l) => l.an.getTime() < sinir).sort((a, b) => a.an - b.an).map(({ aci, an }) => {
    const burc = ayBurcu(an);
    const li = document.createElement("li");
    li.append(ayCiz(aci));
    const div = document.createElement("div");
    div.innerHTML = "<b></b><small></small><p></p>";
    div.querySelector("b").textContent = `${aci === 0 ? "Yeni Ay" : "Dolunay"} · ${burcSembol(burc)} ${burclar[burc].ad}`;
    div.querySelector("small").textContent = gunSaat(an);
    div.querySelector("p").textContent = `${aci === 0 ? "Niyet" : "Farkındalık"}: ${yeniAyTemasi[burc]}.`;
    li.append(div);
    return li;
  }));
}

// --- Doğum Ay'ı ---

function dogumAyi(girdi) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(girdi?.tarih || "")) return;
  const [y, m, d] = girdi.tarih.split("-").map(Number);
  const [s, dk] = /^\d{2}:\d{2}$/.test(girdi.saat || "") ? girdi.saat.split(":").map(Number) : [12, 0];
  const sehir = AstrolojiVeri.sehirler.find((c) => c.ad === girdi.sehir);
  const an = Astro.localToUtc(y, m, d, s, dk, sehir?.saatDilimi || TZ);
  const faz = Astro.moonPhase(an);
  const evre = evreler[evreIndeksi(faz.elongation)];
  const burc = ayBurcu(an);
  const kutu = $("birthResult");
  kutu.hidden = false;
  kutu.innerHTML = "<div></div><div><p class=\"sky-label\"></p><h3></h3><p class=\"a\"></p><p class=\"b\"></p></div>";
  kutu.firstElementChild.replaceWith(ayCiz(faz.elongation));
  kutu.querySelector(".sky-label").textContent = `${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d))} · aydınlanma %${Math.round(faz.illumination * 100)}`;
  kutu.querySelector("h3").textContent = `${evre.ad}'da doğdun · Ay ${burclar[burc].ad} burcunda`;
  kutu.querySelector(".a").textContent = evre.dogum;
  kutu.querySelector(".b").textContent = AstrolojiVeri.ayBurcunda[burc];
}

$("birthForm").addEventListener("submit", (e) => { e.preventDefault(); dogumAyi({ tarih: $("birthForm").elements.tarih.value }); });

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/ay-takvimi")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/ay/durum", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ses: data.ses };
    dongu = data.dongu;
    niyetler = data.niyetler;
    renderCycle();
    const p = me.user.profil || {};
    const dogum = data.dogum || (p.dogumTarihi ? { tarih: p.dogumTarihi, saat: p.dogumSaati, sehir: p.dogumYeri } : null);
    if (dogum) {
      $("birthForm").elements.tarih.value = dogum.tarih;
      dogumAyi(dogum);
    }
  }
  await uzmanKarti.yukle();
  renderGuide(data?.rehber || null);
  renderIntents();
}

renderNow();
setInterval(renderNow, 10 * 60 * 1000);
renderCalendar();
renderLunations();
init();
