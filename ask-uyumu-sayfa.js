const { burclar, sehirler } = AstrolojiVeri;
const { KATEGORILER, puanYorumu } = AskUyumu;
const $ = (id) => document.getElementById(id);

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
const burcResmi = (k) => `/astroloji/${k}.webp`;

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

const form = $("loveForm");
const kisiAlani = (kisi) => form.querySelector(`[data-kisi="${kisi}"]`);
const alan = (kisi, ad) => kisiAlani(kisi).querySelector(`[name="${ad}"]`);

function fillCities() {
  ["sen", "o"].forEach((kisi) => {
    const select = alan(kisi, "sehir");
    select.replaceChildren(new Option("Bilmiyorum / Türkiye", ""), ...sehirler.map((s) => new Option(s.ad, s.ad)));
  });
}

const kisiOku = (kisi) => ({
  ad: alan(kisi, "ad").value.trim(),
  tarih: alan(kisi, "tarih").value,
  saat: alan(kisi, "saat").value,
  sehir: alan(kisi, "sehir").value,
});

function renderKota() {
  $("quota").textContent = durum.kalan == null ? "" : durum.kalan > 0
    ? `Bugün ${durum.kalan} uyum hesaplama hakkın kaldı (bütün bölümlerde günde ${durum.sinir}).`
    : `Bugünkü ${durum.sinir} uyum hakkını kullandın. Yarın yeniden bekleriz.`;
  $("loveSubmit").disabled = (durum.kalan != null && durum.kalan <= 0);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("loveSubmit");
  button.disabled = true;
  button.textContent = "Yıldızlar hesaplanıyor…";
  try {
    const response = await fetch("/api/ask-uyumu/hesapla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ sen: kisiOku("sen"), o: kisiOku("o"), not: form.elements.not.value.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Uyum hesaplanamadı.");
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    // "Sen" bilgileri bir sonraki hesap için kalır; partner temizlenir.
    ["ad", "tarih", "saat", "sehir"].forEach((ad) => { alan("o", ad).value = ""; });
    form.elements.not.value = "";
    showKayit(data.kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    button.textContent = "Uyumumuzu hesapla";
    renderKota();
  }
});

// --- Sonuç ---

function partnerHtml(el, kisi, h) {
  const b = burclar[h.gunes];
  el.innerHTML = `<img src="${burcResmi(h.gunes)}" alt="" width="150" height="150" /><b></b><small></small>`;
  el.querySelector("b").textContent = kisi.ad;
  el.querySelector("small").textContent = `${b.sembol} ${b.ad} · Yaşam yolu ${h.yasamYolu}`;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
}

let sayacAnimasyonu = null;
function animateMeter(toplam) {
  const fill = $("meterFill");
  const cevre = 2 * Math.PI * 52;
  fill.style.transition = "none";
  fill.style.strokeDashoffset = cevre;
  void fill.getBoundingClientRect();
  fill.style.transition = "";
  requestAnimationFrame(() => { fill.style.strokeDashoffset = cevre * (1 - toplam / 100); });
  cancelAnimationFrame(sayacAnimasyonu);
  const bas = performance.now();
  const adim = (an) => {
    const t = Math.min(1, (an - bas) / 2000);
    $("meterValue").textContent = `%${Math.round(toplam * (1 - Math.pow(1 - t, 3)))}`;
    if (t < 1) sayacAnimasyonu = requestAnimationFrame(adim);
  };
  sayacAnimasyonu = requestAnimationFrame(adim);
  $("meterLabel").textContent = puanYorumu(toplam);
}

function renderBars(puanlar) {
  $("scoreBars").replaceChildren(...Object.entries(KATEGORILER).map(([k, kat]) => {
    const li = document.createElement("li");
    li.innerHTML = '<span class="lbl"><b><span class="ikon"></span><span class="ad"></span></b><small></small></span><span class="bar"><span></span></span><span class="val"></span>';
    li.querySelector(".ikon").textContent = kat.ikon;
    li.querySelector(".ad").textContent = kat.ad;
    li.querySelector("small").textContent = kat.aciklama;
    li.querySelector(".val").textContent = `%${puanlar[k]}`;
    return li;
  }));
  // Çubuklar bir sonraki karede dolar ki geçiş animasyonu görünsün.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $("scoreBars").querySelectorAll(".bar span").forEach((bar, i) => {
      bar.style.transitionDelay = `${0.2 + i * 0.15}s`;
      bar.style.width = `${Object.values(puanlar)[i]}%`;
    });
  }));
}

function renderPlacements(kayit) {
  const { sen, o } = kayit.hesap;
  const satirlar = [
    ["☉ Güneş", "gunes"], ["☽ Ay", "ay"], ["♀ Venüs", "venus"], ["♂ Mars", "mars"], ["☿ Merkür", "merkur"],
  ];
  const tablo = $("placementTable");
  tablo.innerHTML = "<thead><tr><th></th><th></th><th></th></tr></thead><tbody></tbody>";
  const [, thSen, thO] = tablo.querySelectorAll("th");
  thSen.textContent = kayit.sen.ad;
  thO.textContent = kayit.o.ad;
  const ad = (k) => `${burclar[k].sembol} ${burclar[k].ad}`;
  const rows = satirlar.map(([etiket, k]) => [etiket, ad(sen[k]), ad(o[k])]);
  rows.push(["∞ Yaşam yolu", String(sen.yasamYolu), String(o.yasamYolu)]);
  tablo.querySelector("tbody").replaceChildren(...rows.map((r) => {
    const tr = document.createElement("tr");
    r.forEach((v) => { const td = document.createElement("td"); td.textContent = v; tr.append(td); });
    return tr;
  }));
}

const listItems = (items) => items.map((text) => { const li = document.createElement("li"); li.textContent = text; return li; });

function showKayit(kayit, kaydir = false) {
  window.yorumcuGoster?.(kayit); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
  stopVoice();
  acikKayit = kayit;
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  partnerHtml($("partnerSen"), kayit.sen, kayit.hesap.sen);
  partnerHtml($("partnerO"), kayit.o, kayit.hesap.o);
  animateMeter(kayit.sonuc.toplam);
  $("coupleTitle").textContent = y.baslik;
  $("coupleSummary").textContent = y.ozet;
  renderBars(kayit.sonuc.puanlar);
  renderPlacements(kayit);
  $("strongList").replaceChildren(...listItems(y.gucluYanlar));
  $("growList").replaceChildren(...listItems(y.zorluklar));
  $("strongCard").hidden = !y.gucluYanlar.length;
  $("growCard").hidden = !y.zorluklar.length;
  [["loveText", y.ask], ["talkText", y.iletisim], ["futureText", y.gelecek]].forEach(([id, metin]) => {
    $(id).textContent = metin;
    $(id).parentElement.hidden = !metin;
  });
  $("adviceList").replaceChildren(...listItems(y.tavsiyeler));
  bindListen($("resultListen"), () => `/api/ask-uyumu/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".journal-item").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "ask-uyumu", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz hesaplanmış bir uyumun yok. İlk uyumunu yukarıda hesapla.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} uyum kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.className = `journal-item${acikKayit?.id === k.id ? " is-current" : ""}`;
    li.dataset.id = k.id;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "journal-open";
    open.innerHTML = `<span class="journal-thumb pair" style="position:relative"><img src="${burcResmi(k.hesap.sen.gunes)}" alt="" loading="lazy" /><span>♥</span><img src="${burcResmi(k.hesap.o.gunes)}" alt="" loading="lazy" /><b>%${k.sonuc.toplam}</b></span>
      <span class="journal-meta"><b></b><small></small><p></p></span>`;
    open.querySelector(".journal-meta b").textContent = `${k.sen.ad} ♥ ${k.o.ad}`;
    open.querySelector("small").textContent = tarih(k.tarih);
    open.querySelector("p").textContent = k.yorum.baslik;
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "journal-delete";
    sil.title = "Bu uyumu sil";
    sil.setAttribute("aria-label", "Bu uyumu sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu uyum ve yorumu günlüğünden silinsin mi?")) return;
      const response = await fetch("/api/ask-uyumu/sil", {
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

// --- Burç uyum haritası ---

let seciliBurc = "koc";
function renderSignTable() {
  $("signPicker").replaceChildren(...Object.entries(burclar).map(([k, b]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${b.sembol} ${b.ad}`;
    button.setAttribute("aria-pressed", String(k === seciliBurc));
    button.addEventListener("click", () => { seciliBurc = k; renderSignTable(); });
    return button;
  }));
  const liste = Object.keys(burclar).map((k) => [k, AskUyumu.burcPuani(seciliBurc, k)]).sort((a, b) => b[1] - a[1]);
  $("tableNote").textContent = `${burclar[seciliBurc].ad} burcunun 12 burçla Güneş uyumu (yalnızca Güneş burcu; tam uyum için yukarıda hesapla).`;
  $("signMatch").replaceChildren(...liste.map(([k, p]) => {
    const li = document.createElement("li");
    li.innerHTML = `<img src="${burcResmi(k)}" alt="" loading="lazy" /><b></b><span class="bar"><span></span></span><span class="val">%${p}</span>`;
    li.querySelector("b").textContent = burclar[k].ad;
    requestAnimationFrame(() => requestAnimationFrame(() => { li.querySelector(".bar span").style.width = `${p}%`; }));
    return li;
  }));
}

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/ask-uyumu")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const [data, harita] = await Promise.all([
    fetch("/api/ask-uyumu/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch("/api/astroloji/harita", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  if (data) {
    durum = { ...durum, ses: data.ses, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
  }
  // "Sen" alanı: son uyumdan, yoksa doğum haritasından ve hesap adından doldurulur.
  const son = kayitlar[0]?.sen;
  const p = me.user.profil || {};
  const girdi = harita?.girdi || { tarih: p.dogumTarihi, saat: p.dogumSaati, sehir: p.dogumYeri };
  alan("sen", "ad").value = son?.ad || me.user.name || "";
  alan("sen", "tarih").value = son?.tarih || girdi.tarih || "";
  alan("sen", "saat").value = son?.saat || (girdi.saatYok ? "" : girdi.saat || "");
  alan("sen", "sehir").value = son?.sehir || girdi.sehir || "";
  const gunes = kayitlar[0]?.hesap.sen.gunes;
  if (gunes) { seciliBurc = gunes; renderSignTable(); }
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  if (kayitlar.length && window.location.hash === "#gunluk") showKayit(kayitlar[0]);
}

fillCities();
renderSignTable();
init();
