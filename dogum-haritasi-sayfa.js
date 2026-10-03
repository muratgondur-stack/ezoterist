const { burclar, gezegenler, elementler, sehirler, ayBurcunda, yukselenBurcunda } = AstrolojiVeri;
const { evler, acilar, anahtar } = DogumHaritasiVeri;
const $ = (id) => document.getElementById(id);
const TEXT = "︎"; // sembollerin emoji yerine yazı olarak çizilmesi için
const SVG = "http://www.w3.org/2000/svg";

let durum = { ses: false, ai: false };
let profil = {};
let girdi = null;
let harita = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3800);
};
const buyukHarf = (s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
const derece = (lon) => `${Math.floor(lon % 30)}°${String(Math.floor(((lon % 30) % 1) * 60)).padStart(2, "0")}′`;
const burcSembol = (k) => `${burclar[k].sembol}${TEXT}`;
const gezegenSembol = (b) => `${gezegenler[b].sembol}${TEXT}`;

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

const form = $("birthForm");

function fillCities() {
  const select = form.elements.sehir;
  const grup = (label, list) => {
    const g = document.createElement("optgroup");
    g.label = label;
    list.forEach((s) => g.append(new Option(s.ad, s.ad)));
    return g;
  };
  select.append(
    new Option("Şehir seç", ""),
    grup("Türkiye", sehirler.filter((s) => s.saatDilimi === "Europe/Istanbul")),
    grup("Yurt dışı", sehirler.filter((s) => s.saatDilimi !== "Europe/Istanbul")),
  );
}

function fillForm(g) {
  form.elements.tarih.value = g.tarih || "";
  form.elements.saat.value = g.saat || "";
  form.elements.saatYok.checked = Boolean(g.saatYok);
  form.elements.saat.disabled = form.elements.saatYok.checked;
  form.elements.sehir.value = g.sehir || "";
}

function showSummary(show) {
  form.hidden = show;
  $("birthSummary").hidden = !show;
  if (!show || !girdi) return;
  const [y, m, d] = girdi.tarih.split("-").map(Number);
  const gun = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
  $("birthText").textContent = `🎂 ${gun} · ${girdi.saatYok ? "saat bilinmiyor" : `🕰️ ${girdi.saat}`} · 📍 ${girdi.sehir}`;
}

form.elements.saatYok.addEventListener("change", () => { form.elements.saat.disabled = form.elements.saatYok.checked; });
$("birthEdit").addEventListener("click", () => { showSummary(false); form.scrollIntoView({ behavior: "smooth", block: "center" }); });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const yeni = {
    tarih: form.elements.tarih.value,
    saat: form.elements.saatYok.checked ? "" : form.elements.saat.value,
    saatYok: form.elements.saatYok.checked || !form.elements.saat.value,
    sehir: form.elements.sehir.value,
  };
  if (!yeni.tarih || !yeni.sehir) { toast("Doğum tarihini ve yerini seç."); return; }
  const button = $("birthSubmit");
  button.disabled = true;
  button.textContent = "Gökyüzü hesaplanıyor…";
  try {
    const response = await fetch("/api/astroloji/harita", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ girdi: yeni }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Harita çıkarılamadı.");
    if (data.kilitli) {
      const tarih = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date(data.yeniHaritaTarihi));
      toast(`Farklı bilgilerle yeni harita ${tarih} tarihinden itibaren çıkarılabilir. Kayıtlı haritan gösteriliyor.`);
    }
    await yukle(true);
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Haritamı çiz";
  }
});

// --- Çark ---

const el = (tag, attrs = {}, parent) => {
  const node = document.createElementNS(SVG, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (parent) parent.append(node);
  return node;
};

const R = { dis: 270, burc: 228, tik: 219, gezegen: 186, derece: 160, ev: 112, ic: 96 };

function cizCark(h) {
  const svg = $("wheel");
  svg.replaceChildren();
  const taban = h.saatBilinir ? h.asc : 0; // yükselen solda; saat yoksa 0° Koç solda
  const aci = (lon) => ((180 + lon - taban) * Math.PI) / 180;
  const nokta = (r, lon) => [r * Math.cos(aci(lon)), -r * Math.sin(aci(lon))];
  const f = (n) => n.toFixed(2);

  // Burç halkası
  const halka = el("g", { class: "w-ring" }, svg);
  Object.keys(burclar).forEach((k, i) => {
    const [a1, b1] = nokta(R.dis, i * 30);
    const [a2, b2] = nokta(R.dis, i * 30 + 30);
    const [c2, d2] = nokta(R.burc, i * 30 + 30);
    const [c1, d1] = nokta(R.burc, i * 30);
    el("path", {
      class: `w-sign ${DogumHaritasi.ELEMENT[k]}`,
      d: `M${f(a1)} ${f(b1)} A${R.dis} ${R.dis} 0 0 0 ${f(a2)} ${f(b2)} L${f(c2)} ${f(d2)} A${R.burc} ${R.burc} 0 0 1 ${f(c1)} ${f(d1)}Z`,
    }, halka);
    const [gx, gy] = nokta((R.dis + R.burc) / 2, i * 30 + 15);
    const t = el("text", { class: "w-glyph", x: f(gx), y: f(gy) }, halka);
    t.textContent = burcSembol(k);
    el("title", {}, t).textContent = burclar[k].ad;
  });
  for (let d = 0; d < 360; d += 5) {
    const [x1, y1] = nokta(R.burc, d);
    const [x2, y2] = nokta(d % 10 === 0 ? R.tik - 4 : R.tik + 3, d);
    el("line", { class: "w-tick", x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2) }, halka);
  }
  el("circle", { class: "w-inner", r: R.ic }, halka);

  // Evler
  if (h.evler) {
    const evGrup = el("g", { class: "w-house", style: "animation-delay:.7s" }, svg);
    h.evler.forEach((c, i) => {
      const eksen = i % 3 === 0;
      const [x1, y1] = nokta(eksen ? R.dis + 6 : R.burc, c);
      const [x2, y2] = nokta(R.ic, c);
      el("line", { class: `w-cusp${eksen ? " axis" : ""}`, x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2) }, evGrup);
      const sonraki = h.evler[(i + 1) % 12];
      const orta = c + (((sonraki - c) % 360) + 360) % 360 / 2;
      const [nx, ny] = nokta(R.ev, orta);
      el("text", { class: "w-house-no", x: f(nx), y: f(ny) }, evGrup).textContent = String(i + 1);
    });
    [["ASC", h.asc], ["MC", h.mc], ["DSC", h.asc + 180], ["IC", h.mc + 180]].forEach(([ad, lon]) => {
      const [x, y] = nokta(R.dis + 18, lon);
      el("text", { class: "w-axis-label", x: f(x), y: f(y) }, evGrup).textContent = ad;
    });
  }

  // Açı çizgileri
  const aciGrup = el("g", {}, svg);
  const lonOf = Object.fromEntries(h.konumlar.map((k) => [k.body, k.lon]));
  h.acilar.forEach((a, i) => {
    const [x1, y1] = nokta(R.ic, lonOf[a.a]);
    const [x2, y2] = nokta(R.ic, lonOf[a.b]);
    const line = el("line", {
      class: "w-aspect", x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2), stroke: acilar[a.tur].renk,
      style: `animation-delay:${1.6 + i * 0.08}s`, "data-a": a.a, "data-b": a.b,
    }, aciGrup);
    if (a.tur === "altmislik" || a.tur === "ucgen") line.setAttribute("stroke-width", "1.2");
  });

  // Gezegenler: üst üste binmesinler diye görüntü açıları birbirinden itilir.
  const sirali = [...h.konumlar].sort((p, q) => p.lon - q.lon).map((k) => ({ ...k, goster: k.lon }));
  const ARALIK = 10.5;
  for (let tur = 0; tur < 60; tur += 1) {
    let degisti = false;
    for (let i = 0; i < sirali.length; i += 1) {
      const p = sirali[i];
      const q = sirali[(i + 1) % sirali.length];
      const fark = (((q.goster - p.goster) % 360) + 360) % 360;
      if (fark < ARALIK) {
        const it = (ARALIK - fark) / 2 + 0.01;
        p.goster -= it;
        q.goster += it;
        degisti = true;
      }
    }
    if (!degisti) break;
  }
  sirali.forEach((k, i) => {
    const g = el("g", { class: "w-planet", "data-body": k.body, tabindex: "0", role: "button", style: `animation-delay:${1 + i * 0.09}s` }, svg);
    el("title", {}, g).textContent = `${gezegenler[k.body].ad}: ${burclar[k.sign].ad} ${derece(k.lon)}`;
    const [px, py] = nokta(R.burc, k.lon);
    const [qx, qy] = nokta(R.gezegen + 17, k.goster);
    el("line", { class: "w-pointer", x1: f(px), y1: f(py), x2: f(qx), y2: f(qy) }, g);
    const [cx, cy] = nokta(R.gezegen, k.goster);
    el("circle", { cx: f(cx), cy: f(cy), r: 16 }, g);
    el("text", { x: f(cx), y: f(cy + 1) }, g).textContent = gezegenSembol(k.body);
    const [dx, dy] = nokta(R.derece, k.goster);
    el("text", { class: "w-deg", x: f(dx), y: f(dy) }, g).textContent = `${Math.floor(k.lon % 30)}°${k.retro ? "℞" : ""}`;
    const sec = () => odakla(k.body);
    g.addEventListener("click", sec);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sec(); } });
  });

  $("wheelLegend").replaceChildren(...Object.values(acilar).map((a) => {
    const li = document.createElement("li");
    li.innerHTML = `<i style="background:${a.renk}"></i>`;
    li.append(`${a.sembol}${TEXT} ${a.ad}`);
    return li;
  }));
}

// --- Gezegen odağı ---

function aciMetni(a) {
  return `${buyukHarf(anahtar[a.a])} ile ${anahtar[a.b]} arasında ${acilar[a.tur].dogasi}. ${acilar[a.tur].anlam}`;
}

function odakla(body) {
  const k = harita.konumlar.find((x) => x.body === body);
  const G = gezegenler[body];
  const kendi = harita.acilar.filter((a) => a.a === body || a.b === body);
  document.querySelectorAll(".w-planet").forEach((n) => n.classList.toggle("is-active", n.dataset.body === body));
  document.querySelectorAll("#planetTable tr").forEach((n) => n.classList.toggle("is-active", n.dataset.body === body));
  document.querySelectorAll(".w-aspect").forEach((n) => {
    const ilgili = n.dataset.a === body || n.dataset.b === body;
    n.classList.toggle("hot", ilgili);
    n.classList.toggle("dim", !ilgili);
  });

  const panel = $("focus");
  panel.innerHTML = `<p class="sky-label">Gezegen ayrıntısı</p>
    <div class="focus-title"><span class="glyph"></span><div><b></b><small></small></div></div>
    <p class="anlam"></p><p class="burc"></p><p class="ev" hidden></p><ul></ul>`;
  panel.querySelector(".glyph").textContent = gezegenSembol(body);
  panel.querySelector(".focus-title b").textContent = G.ad;
  panel.querySelector(".focus-title small").textContent =
    `${burclar[k.sign].ad} ${derece(k.lon)}${k.ev ? ` · ${k.ev}. ev` : ""}${k.retro ? " · geri hareket ℞" : ""}`;
  panel.querySelector(".anlam").textContent = G.anlam;
  const burc = panel.querySelector(".burc");
  burc.innerHTML = "<b></b> ";
  burc.querySelector("b").textContent = `${burclar[k.sign].ad} burcunda:`;
  burc.append(`${buyukHarf(gezegenler[body].ad)} burada ${burclar[k.sign].anahtar.join(", ")} temalarıyla ifade bulur.`);
  if (k.ev) {
    const ev = panel.querySelector(".ev");
    ev.hidden = false;
    ev.innerHTML = "<b></b> ";
    ev.querySelector("b").textContent = `${k.ev}. evde (${evler[k.ev - 1].baslik}):`;
    ev.append(evler[k.ev - 1].aciklama);
  }
  panel.querySelector("ul").replaceChildren(...(kendi.length ? kendi : [null]).map((a) => {
    const li = document.createElement("li");
    if (!a) { li.textContent = "Bu gezegenin belirgin bir açısı yok; enerjisi daha bağımsız çalışır."; return li; }
    const diger = a.a === body ? a.b : a.a;
    const s = document.createElement("span");
    s.style.color = acilar[a.tur].renk;
    s.textContent = `${acilar[a.tur].sembol}${TEXT} ${acilar[a.tur].ad} ${gezegenler[diger].ad}`;
    li.append(s, ` (${a.orb}°): ${acilar[a.tur].anlam}`);
    return li;
  }));
  if (window.matchMedia("(max-width: 920px)").matches) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

$("aspectsMore").addEventListener("click", () => {
  document.querySelectorAll("#aspects li").forEach((li) => { li.hidden = false; });
  $("aspectsMore").hidden = true;
});

// --- Haritanın geri kalanı ---

function trio(label, key, text) {
  const div = document.createElement("div");
  div.className = "trio";
  if (!key) {
    div.innerHTML = `<p class="trio-label">${label}</p><p class="trio-sign">?</p><p>${text}</p>`;
    return div;
  }
  div.innerHTML = `<img src="/astroloji/${key}.webp" alt="" width="96" height="96" loading="lazy" />
    <p class="trio-label">${label}</p><p class="trio-sign">${burcSembol(key)} ${burclar[key].ad}</p><p></p>`;
  div.lastElementChild.textContent = text;
  return div;
}

function cizDetaylar(h) {
  const yer = Object.fromEntries(h.konumlar.map((k) => [k.body, k]));
  $("bigThree").replaceChildren(
    trio("Güneş", yer.sun.sign, burclar[yer.sun.sign].anahtar.map(buyukHarf).join(" · ")),
    trio("Ay", yer.moon.sign, ayBurcunda[yer.moon.sign]),
    trio("Yükselen", h.yukselen, h.yukselen ? yukselenBurcunda[h.yukselen] : "Yükselen burç için doğum saatin gerekli."),
  );

  $("planetTable").replaceChildren(...h.konumlar.map((k) => {
    const tr = document.createElement("tr");
    tr.dataset.body = k.body;
    tr.innerHTML = `<td class="g"></td><td><b></b></td><td class="b"></td><td class="ev"></td>`;
    tr.querySelector(".g").textContent = gezegenSembol(k.body);
    tr.querySelector("b").textContent = gezegenler[k.body].ad;
    tr.querySelector(".b").textContent = `${burcSembol(k.sign)} ${burclar[k.sign].ad} ${derece(k.lon)}`;
    if (k.retro) tr.querySelector(".b").insertAdjacentHTML("beforeend", ' <span class="retro" title="Geri hareket">℞</span>');
    tr.querySelector(".ev").textContent = k.ev ? `${k.ev}. ev` : "";
    tr.addEventListener("click", () => { odakla(k.body); $("wheel").scrollIntoView({ behavior: "smooth", block: "center" }); });
    return tr;
  }));

  const toplam = (o) => Object.values(o).reduce((t, v) => t + v, 0);
  const cubuk = (liste, veri, ad, sinif) => {
    const max = toplam(veri);
    liste.replaceChildren(...Object.entries(veri).map(([k, v]) => {
      const li = document.createElement("li");
      li.innerHTML = `<span></span><span class="bar"><span class="${sinif(k)}"></span></span><b>${v}</b>`;
      li.firstElementChild.textContent = ad(k);
      requestAnimationFrame(() => requestAnimationFrame(() => { li.querySelector(".bar span").style.width = `${(v / max) * 100}%`; }));
      return li;
    }));
  };
  cubuk($("elementBalance"), h.denge.element, (k) => `${elementler[k].ikon} ${elementler[k].ad}`, (k) => k);
  cubuk($("qualityBalance"), h.denge.nitelik, (k) => k, () => "");
  const be = elementler[h.denge.baskinElement];
  const eksik = Object.entries(h.denge.element).filter(([, v]) => v === 0).map(([k]) => elementler[k].ad);
  $("balanceNote").textContent = `Haritanda baskın element ${be.ad}, baskın nitelik ${h.denge.baskinNitelik}. ${be.aciklama}` +
    (eksik.length ? ` ${eksik.join(" ve ")} elementinde gezegenin yok; bu enerjiyi hayatındaki insanlarda ve deneyimlerde arayabilirsin.` : "");

  $("housesHead").hidden = !h.evler;
  $("houses").hidden = !h.evler;
  if (h.evler) {
    $("houses").replaceChildren(...evler.map((ev, i) => {
      const icinde = h.konumlar.filter((k) => k.ev === i + 1);
      const li = document.createElement("li");
      li.className = icinde.length ? "has-planets" : "";
      li.style.animationDelay = `${i * 0.04}s`;
      li.innerHTML = `<span class="no"></span><b></b><span class="kw"></span><p class="cusp"></p><div class="in"></div><p></p>`;
      li.querySelector(".no").textContent = ev.ad;
      li.querySelector("b").textContent = ev.baslik;
      li.querySelector(".kw").textContent = ev.anahtar;
      const burc = Astro.signOf(h.evler[i]);
      li.querySelector(".cusp").textContent = `Kapısı: ${burcSembol(burc)} ${burclar[burc].ad}`;
      li.querySelector(".in").replaceChildren(...icinde.map((k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = `${gezegenSembol(k.body)} ${gezegenler[k.body].ad}`;
        b.addEventListener("click", () => { odakla(k.body); $("wheel").scrollIntoView({ behavior: "smooth", block: "center" }); });
        return b;
      }));
      li.lastElementChild.textContent = ev.aciklama;
      return li;
    }));
  }

  const ILK = 10;
  $("aspects").replaceChildren(...(h.acilar.length ? h.acilar : [null]).map((a, i) => {
    const li = document.createElement("li");
    if (!a) { li.textContent = "Haritanda belirgin bir açı bulunamadı."; return li; }
    li.hidden = i >= ILK;
    li.innerHTML = `<span class="sym"></span><div><b></b><small></small><p></p></div>`;
    li.querySelector(".sym").textContent = `${acilar[a.tur].sembol}${TEXT}`;
    li.querySelector(".sym").style.color = acilar[a.tur].renk;
    li.querySelector("b").textContent = `${gezegenler[a.a].ad} ${acilar[a.tur].ad.toLocaleLowerCase("tr-TR")} ${gezegenler[a.b].ad}`;
    li.querySelector("small").textContent = `${gezegenSembol(a.a)} ${acilar[a.tur].sembol}${TEXT} ${gezegenSembol(a.b)} · orb ${a.orb}°`;
    li.querySelector("p").textContent = aciMetni(a);
    li.addEventListener("click", () => { odakla(a.a); $("wheel").scrollIntoView({ behavior: "smooth", block: "center" }); });
    return li;
  }));
  $("aspectsMore").hidden = h.acilar.length <= ILK;
  $("aspectsMore").textContent = `Tüm açıları göster (${h.acilar.length})`;
}

function cizHarita() {
  harita = DogumHaritasi.hesapla(girdi);
  $("harita").hidden = false;
  $("wheelNote").textContent = harita.saatBilinir
    ? `Yükselen ${burclar[harita.yukselen].ad} solda. Gezegene dokun, ayrıntısını gör.`
    : "Doğum saatin olmadığı için evler ve yükselen çizilmedi; Ay konumu yaklaşık. Gezegene dokun, ayrıntısını gör.";
  $("focus").innerHTML = '<p class="sky-label">Gezegenine dokun</p><p class="focus-empty">Çarktaki bir gezegene ya da listeye dokun; burcunu, evini ve açılarını burada anlatayım.</p>';
  cizCark(harita);
  cizDetaylar(harita);
}

// --- Derin yorum ---

const BOLUMLER = [
  ["kisilik", "☉", "Kişiliğin"], ["duygular", "☽", "Duygu dünyan"], ["ask", "♀", "Aşk ve ilişkiler"], ["kariyer", "♄", "Kariyer ve yol"],
  ["para", "♃", "Para ve değerler"], ["aile", "⌂", "Aile ve kökler"], ["ruhsal", "♆", "Ruhsal yolculuğun"],
];

function cizYorum(kayit) {
  const y = kayit.yorum;
  $("readingStart").hidden = true;
  $("readingWait").hidden = true;
  $("readingBody").hidden = false;
  $("readingHeadline").textContent = y.baslik;
  $("readingBadge").textContent = kayit.kaynak === "ai" ? "✨ Astroloğumuzun yorumu" : "📜 Haritanın özeti";
  $("readingSummary").textContent = y.ozet;
  $("readingGrid").replaceChildren(...BOLUMLER.filter(([k]) => y[k]).map(([k, ikon, ad], i) => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.animationDelay = `${i * 0.08}s`;
    div.innerHTML = "<h3></h3><p></p>";
    div.querySelector("h3").textContent = `${ikon}${TEXT} ${ad}`;
    div.querySelector("p").textContent = y[k];
    return div;
  }));
  const liste = (id, items) => $(id).replaceChildren(...items.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  liste("strengths", y.gucluYanlar);
  liste("lessons", y.dersler);
  $("strengths").closest(".dlg-grid").hidden = !y.gucluYanlar.length && !y.dersler.length;
  $("aspectReadingCard").hidden = !y.acilar?.length;
  $("aspectReadings").replaceChildren(...(y.acilar || []).map((a) => {
    const li = document.createElement("li");
    li.style.borderColor = acilar[a.tur]?.renk || "";
    li.innerHTML = "<b></b><p></p>";
    li.querySelector("b").textContent = `${gezegenSembol(a.a)} ${gezegenler[a.a].ad} ${acilar[a.tur].ad.toLocaleLowerCase("tr-TR")} ${gezegenler[a.b].ad} ${gezegenSembol(a.b)}`;
    li.querySelector("p").textContent = a.yorum;
    return li;
  }));
  bindListen($("readingListen"), () => `/api/dogum-haritasi/ses?v=${encodeURIComponent(girdi.tarih + girdi.saat + girdi.sehir)}`);
}

const BEKLEME = ["Gezegenlerin okunuyor…", "Evlerin tek tek inceleniyor…", "Açıların yorumlanıyor…", "Ay'ın ve yükselenin dinleniyor…", "Yorumun yazılıyor…"];

$("readingButton").addEventListener("click", async () => {
  $("readingStart").hidden = true;
  $("readingWait").hidden = false;
  let i = 0;
  $("waitText").textContent = BEKLEME[0];
  const zaman = setInterval(() => { i = (i + 1) % BEKLEME.length; $("waitText").textContent = BEKLEME[i]; }, 3500);
  try {
    const response = await fetch("/api/dogum-haritasi/yorum", { method: "POST", credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Yorum hazırlanamadı.");
    cizYorum(data);
    $("yorum").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    toast(error.message);
    $("readingWait").hidden = true;
    $("readingStart").hidden = false;
  } finally {
    clearInterval(zaman);
  }
});

const uzmanKarti = UzmanKarti({ bolum: "astroloji-harita", bindListen, toast });

// --- Başlangıç ---

async function yukle(kaydir = false) {
  const data = await fetch("/api/dogum-haritasi", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!data) { toast("Harita bilgisi alınamadı."); return; }
  durum = { ses: data.ses, ai: data.ai };
  girdi = data.girdi;
  if (!girdi) {
    if (profil.dogumTarihi) fillForm({ tarih: profil.dogumTarihi, saat: profil.dogumSaati, saatYok: !profil.dogumSaati, sehir: profil.dogumYeri });
    showSummary(false);
    $("harita").hidden = true;
    $("yorum").hidden = true;
    return;
  }
  stopVoice();
  fillForm(girdi);
  showSummary(true);
  cizHarita();
  $("yorum").hidden = false;
  $("readingBody").hidden = true;
  $("readingWait").hidden = true;
  if (data.derin) cizYorum(data.derin);
  else $("readingStart").hidden = false;
  uzmanKarti.goster();
  if (kaydir) $("harita").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/dogum-haritasi")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  profil = me.user.profil || {};
  await uzmanKarti.yukle();
  await yukle();
  $("heroStart").setAttribute("href", girdi ? "#harita" : "#bilgiler");
}

fillCities();
init();
