const $ = (id) => document.getElementById(id);

let veri = null; // { sema, degerler, degisen, ozet, gecmis }
let taslak = {}; // kaydedilmemiş değişiklikler
let kullanicilar = [];
let kontorHedef = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3600);
};
const tarih = (ms, saatli = true) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", ...(saatli ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(ms));
const sayi = (n) => new Intl.NumberFormat("tr-TR").format(n);
const esit = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const el = (tag, props = {}, ...cocuklar) => { const e = Object.assign(document.createElement(tag), props); e.append(...cocuklar); return e; };

async function api(url, govde) {
  const r = await fetch(url, govde === undefined ? { credentials: "same-origin" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(govde),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "İşlem yapılamadı.");
  return d;
}

// --- Sekmeler ---

function sekme(ad) {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === ad)));
  document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== `tab-${ad}`; });
  history.replaceState(null, "", `#${ad}`);
  if (ad === "kullanicilar" && !kullanicilar.length) kullanicilariYukle();
  if (ad === "anahtarlar") anahtarlariYukle();
  if (ad === "odeme") odemeYukle();
  if (ad === "uzmanlar") uzmanlariYukle();
  if (ad === "fiyatlar") maliyetYukle();
}
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => sekme(b.dataset.tab)));

// --- Özet ---

function renderOzet() {
  const o = veri.ozet;
  const ses = o.servis.ses;
  const kart = (deger, etiket, alt = "") => el("div", { className: "stat" }, el("b", { textContent: deger }), el("span", { textContent: etiket }), ...(alt ? [el("p", { textContent: alt })] : []));
  const bugunToplam = o.kullanim.reduce((t, b) => t + b.bugun, 0);
  $("stats").replaceChildren(
    kart(sayi(o.uye), "üye", `son 7 günde ${o.yeniUye} yeni`),
    kart(sayi(bugunToplam), "bugünkü analiz", "günlük sınırlı bölümlerde"),
    kart(String((o.uzman.sirada || 0) + (o.uzman.inceleniyor || 0)), "bekleyen uzman talebi", `${o.uzman.geciken || 0} gecikmiş · ${o.uzman.hazir || 0} yanıtlandı`),
    (() => {
      const k = kart(o.servis.yapayZeka && ses.ok ? "✓" : "!", "servisler", "");
      k.querySelector("p")?.remove();
      k.append(el("p", {}, el("span", { className: o.servis.yapayZeka ? "ok" : "bad", textContent: `Yapay zekâ ${o.servis.yapayZeka ? "bağlı" : "yok"}` }), " · ",
        el("span", { className: ses.ok ? "ok" : "bad", textContent: `Ses ${ses.ok ? "çalışıyor" : `sorunlu (${ses.hata || "?"})`}` })));
      if (ses.yuklu?.length) k.append(el("p", { textContent: `Bellekteki sesler: ${ses.yuklu.join(", ")}` }));
      return k;
    })(),
  );
  $("sectionTable").querySelector("tbody").replaceChildren(...o.kullanim.map((b) => {
    const s = veri.degerler[`sinir.${b.id}`];
    return el("tr", {},
      el("td", { textContent: b.ad }),
      el("td", {}, el("span", { className: `pill ${b.acik ? "acik" : "kapali"}`, textContent: b.acik ? "Açık" : "Kapalı" })),
      el("td", { className: "num", textContent: sayi(b.bugun) }),
      el("td", { className: "num", textContent: sayi(b.kullanici) }),
      el("td", { className: "num", textContent: sayi(b.toplam) }),
      el("td", { className: "num", textContent: s === undefined ? "—" : s === 0 ? "sınırsız" : `${s}/gün` }),
    );
  }));
}

// --- Ayarlar ---

const deger = (k) => (Object.prototype.hasOwnProperty.call(taslak, k) ? taslak[k] : veri.degerler[k]);

function degistir(k, v) {
  if (esit(v, veri.degerler[k])) delete taslak[k];
  else taslak[k] = v;
  const satir = document.querySelector(`.row[data-k="${CSS.escape(k)}"]`);
  satir?.classList.toggle("degisti", Object.prototype.hasOwnProperty.call(taslak, k));
  const n = Object.keys(taslak).length;
  $("saveBar").hidden = !n;
  $("saveInfo").textContent = `${n} kaydedilmemiş değişiklik`;
}

function kontrol(s) {
  const k = s.anahtar;
  const v = deger(k);
  if (s.tur === "bool") {
    const input = el("input", { type: "checkbox", checked: v !== false });
    input.setAttribute("aria-label", s.ad);
    input.addEventListener("change", () => degistir(k, input.checked));
    return el("label", { className: "switch" }, input, el("span"));
  }
  if (s.tur === "secim") {
    const select = el("select");
    s.secenekler.forEach((o) => select.append(new Option(o || "— varsayılan —", o)));
    select.value = v;
    select.addEventListener("change", () => degistir(k, select.value));
    const kutu = el("div", { className: "control" }, select);
    if (k === "ses.ses" || k.endsWith(".ses")) {
      const play = el("button", { type: "button", className: "play", textContent: "▶", title: "Sesi dinle" });
      play.addEventListener("click", () => sesDinle(select.value || deger("ses.ses"), play));
      kutu.append(play);
    }
    return kutu;
  }
  if (s.tur === "tam" || s.tur === "sayi") {
    const num = el("input", { type: "number", min: s.min, max: s.max, step: s.adim || 1, value: v });
    num.setAttribute("aria-label", s.ad);
    const kutu = el("div", { className: "control" });
    if (s.tur === "sayi") {
      const range = el("input", { type: "range", min: s.min, max: s.max, step: s.adim || 0.01, value: v });
      range.setAttribute("aria-label", s.ad);
      range.addEventListener("input", () => { num.value = range.value; degistir(k, Number(range.value)); });
      num.addEventListener("input", () => { range.value = num.value; if (num.value !== "") degistir(k, Number(num.value)); });
      kutu.append(range);
    } else {
      num.addEventListener("input", () => { if (num.value !== "") degistir(k, Number(num.value)); });
    }
    kutu.append(num);
    if (s.birim) kutu.append(el("span", { className: "unit", textContent: s.birim }));
    return kutu;
  }
  if (s.tur === "epostalar") {
    const ta = el("textarea", { rows: 2, value: (v || []).join(", ") });
    ta.setAttribute("aria-label", s.ad);
    ta.addEventListener("input", () => degistir(k, ta.value.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)));
    return el("div", { className: "control" }, ta);
  }
  const input = el("input", { type: "text", value: v ?? "" });
  input.setAttribute("aria-label", s.ad);
  input.addEventListener("input", () => degistir(k, input.value.trim()));
  return el("div", { className: "control" }, input);
}

const GRUP_IKON = { Genel: "🏠", Ses: "🔊", "Yapay zekâ": "🧠", Süreler: "⏱️", "Günlük sınırlar": "🎯", İzinler: "🔐", Bölümler: "🧭", "Bölüm sesleri": "🎙️" };

function renderAyarlar() {
  const gruplar = new Map();
  // Fiyat ve maliyet ayarları kendi sekmesinde ("Fiyatlar").
  veri.sema.filter((s) => s.grup !== "Fiyatlar" && s.grup !== "Maliyet").forEach((s) => { if (!gruplar.has(s.grup)) gruplar.set(s.grup, []); gruplar.get(s.grup).push(s); });
  const sira = ["Genel", "Ses", "Bölüm sesleri", "Yapay zekâ", "Günlük sınırlar", "Süreler", "Bölümler", "İzinler"];
  $("settings").replaceChildren(...[...gruplar].sort((a, b) => sira.indexOf(a[0]) - sira.indexOf(b[0])).map(([grup, liste]) => {
    const kart = el("div", { className: "card group" }, el("h2", { textContent: `${GRUP_IKON[grup] || "•"} ${grup}` }));
    if (grup === "Bölümler") kart.append(el("p", { className: "section-note", textContent: "Kapalı bölüm menüde 'bakımda' görünür; sen yönetici olarak yine girebilirsin." }));
    if (grup === "Günlük sınırlar") kart.append(el("p", { className: "section-note", textContent: "Kişi başı günlük hak. 0 = sınırsız." }));
    const rows = el("div", { className: "rows" });
    liste.forEach((s) => {
      const ozel = veri.degisen.includes(s.anahtar);
      const reset = el("button", { type: "button", className: "reset", textContent: "↺", title: "Varsayılana dön" });
      reset.hidden = !ozel;
      reset.addEventListener("click", () => sifirla(s.anahtar));
      const etiket = el("div", { className: "label" }, el("b", { textContent: s.ad }),
        el("small", { textContent: [s.aciklama, `varsayılan: ${Array.isArray(s.vars) ? s.vars.join(", ") || "—" : s.vars === "" ? "—" : typeof s.vars === "boolean" ? (s.vars ? "açık" : "kapalı") : s.vars}`].filter(Boolean).join(" · ") }));
      const row = el("div", { className: `row${ozel ? " ozel" : ""}` }, etiket, kontrol(s), reset);
      row.dataset.k = s.anahtar;
      rows.append(row);
    });
    kart.append(rows);
    return kart;
  }));
  taslak = {};
  $("saveBar").hidden = true;
}

$("save").addEventListener("click", async () => {
  const b = $("save");
  b.disabled = true;
  try {
    const sayisi = Object.keys(taslak).length;
    await api("/api/yonetim/ayarlar", { degisiklikler: taslak });
    toast(`${sayisi} ayar kaydedildi; hemen geçerli.`);
    await yukle();
  } catch (error) {
    toast(error.message);
  } finally {
    b.disabled = false;
  }
});
$("discard").addEventListener("click", () => renderAyarlar());

async function sifirla(k) {
  const s = veri.sema.find((x) => x.anahtar === k);
  if (!confirm(`"${s.ad}" varsayılana dönsün mü?`)) return;
  try {
    await api("/api/yonetim/sifirla", { anahtarlar: [k] });
    toast("Varsayılana döndü.");
    await yukle();
  } catch (error) { toast(error.message); }
}

// Ses örneği: seçili ses ve (kaydedilmemiş olsa da) seçili hızla.
async function sesDinle(ses, dugme) {
  dugme.disabled = true;
  dugme.textContent = "…";
  try {
    const r = await fetch("/api/yonetim/ses-ornek", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ ses, hiz: deger("ses.hiz") }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ses üretilemedi.");
    const url = URL.createObjectURL(await r.blob());
    const a = $("sample");
    a.src = url;
    await a.play();
  } catch (error) {
    toast(error.message);
  } finally {
    dugme.disabled = false;
    dugme.textContent = "▶";
  }
}

// --- Kullanıcılar ---

async function kullanicilariYukle() {
  try {
    kullanicilar = (await api("/api/yonetim/kullanicilar")).kullanicilar;
    renderKullanicilar();
  } catch (error) { toast(error.message); }
}

function renderKullanicilar() {
  const q = $("userSearch").value.trim().toLocaleLowerCase("tr-TR");
  const liste = kullanicilar.filter((u) => !q || u.email.includes(q) || u.name.toLocaleLowerCase("tr-TR").includes(q));
  const onayli = kullanicilar.filter((u) => u.bilgilendirmeOnay).length;
  $("userCount").textContent = `${liste.length} / ${kullanicilar.length} · bilgilendirmeyi onaylayan ${onayli}`;
  $("userTable").querySelector("tbody").replaceChildren(...liste.map((u) => {
    const ekle = el("button", { type: "button", className: "mini-btn", textContent: "🪙 Kontör" });
    ekle.addEventListener("click", () => {
      kontorHedef = u;
      $("creditUser").textContent = `${u.name || u.email} · şu anki bakiye ${sayi(u.bakiye)}`;
      $("creditForm").reset();
      $("creditDialog").showModal();
    });
    return el("tr", {},
      el("td", {}, u.name || "—", el("small", { textContent: u.email })),
      el("td", { textContent: u.createdAt ? tarih(Date.parse(u.createdAt), false) : "—" }),
      el("td", { textContent: [u.sifreVar ? "şifre" : "", u.google ? "Google" : ""].filter(Boolean).join(" + ") || "—" }),
      el("td", { className: u.bilgilendirmeOnay ? "ok" : "muted", textContent: u.bilgilendirmeOnay ? `✓ ${tarih(Date.parse(u.bilgilendirmeOnay))}` : "Onaylamadı" }),
      el("td", { className: "num", textContent: sayi(u.bakiye) }),
      el("td", {}, ekle),
    );
  }));
}
$("userSearch").addEventListener("input", renderKullanicilar);

$("creditForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = $("creditForm");
  try {
    const { hareket } = await api("/api/yonetim/kontor", { userId: kontorHedef.id, miktar: Number(f.elements.miktar.value), aciklama: f.elements.aciklama.value });
    kontorHedef.bakiye = hareket.bakiyeSonra;
    $("creditDialog").close();
    renderKullanicilar();
    toast(`Yeni bakiye: ${sayi(hareket.bakiyeSonra)}`);
  } catch (error) { toast(error.message); }
});

// --- Geçmiş ---

function renderGecmis() {
  const ad = (k) => veri.sema.find((s) => s.anahtar === k)?.ad || k;
  const yaz = (v) => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "açık" : "kapalı") : String(v ?? "—"));
  $("history").replaceChildren(...(veri.gecmis.length ? veri.gecmis : [null]).map((g) => {
    if (!g) return el("li", { textContent: "Henüz değişiklik yok." });
    return el("li", {}, el("small", { textContent: `${tarih(g.tarih)} · ${g.kim}` }), el("br"),
      `${ad(g.anahtar)}: `, el("code", { textContent: yaz(g.eski) }), " → ", el("code", { textContent: yaz(g.yeni) }));
  }));
}

// --- Fiyatlar ve maliyet ---

const tl = (n, b = 2) => (n == null ? "—" : `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: b, maximumFractionDigits: b }).format(n)} ₺`);
let fiyatZamanlayici = null;
async function tekAyarKaydet(anahtar, deger) {
  try {
    await api("/api/yonetim/ayarlar", { degisiklikler: { [anahtar]: deger } });
    veri.degerler[anahtar] = deger;
    clearTimeout(fiyatZamanlayici);
    fiyatZamanlayici = setTimeout(maliyetYukle, 250);
  } catch (error) {
    toast(error.message);
  }
}
function sayiGirdisi(anahtar, deger, { adim = 0.01, min = 0 } = {}) {
  const i = el("input", { type: "number", step: String(adim), min: String(min), value: String(deger) });
  i.addEventListener("change", () => {
    const v = Number(i.value);
    if (!Number.isFinite(v) || v < min) { toast("Geçerli bir sayı gir."); return; }
    tekAyarKaydet(anahtar, v);
  });
  return i;
}

async function maliyetYukle() {
  let m;
  try { m = await api("/api/yonetim/maliyet"); } catch (error) { toast(error.message); return; }
  const kutu = (etiket, girdi, not) => el("label", { className: "cost-input" }, el("span", { textContent: etiket }), girdi, not ? el("small", { textContent: not }) : "");
  const tanitim = el("input", { type: "checkbox", checked: Boolean(m.tanitim) });
  tanitim.addEventListener("change", () => tekAyarKaydet("fiyat.tanitim", tanitim.checked));
  $("costInputs").replaceChildren(
    el("label", { className: `cost-input tanitim-kutu${m.tanitim ? " acik" : ""}` },
      el("span", {}, tanitim, " 🎁 Tanıtım dönemi: her şey ücretsiz"),
      el("small", { textContent: "Açıkken onay penceresi açılmaz, fiyat rozetleri 'Ücretsiz Tanıtım' görünür. Kapatınca ücretli işlemlerde kontör onayı istenir." })),
    kutu("Dolar kuru (USD/TRY)", sayiGirdisi("maliyet.usdTry", veri.degerler["maliyet.usdTry"]), `Kullanılan: ${m.kur ? m.kur.toFixed(4) : "—"} (${m.kurKaynagi})${m.tcmb ? ` · TCMB: ${m.tcmb}` : ""} · 0 = otomatik`),
    kutu("1 kontör =", sayiGirdisi("fiyat.kontorTL", m.kontorTL), "TL"),
    kutu("gpt-4.1-mini girdi", sayiGirdisi("maliyet.metinGiris", m.birim.giris), "$ / 1M token"),
    kutu("gpt-4.1-mini çıktı", sayiGirdisi("maliyet.metinCikis", m.birim.cikis), "$ / 1M token"),
    kutu("Google TTS standart", sayiGirdisi("maliyet.ses", m.birim.ses), "$ / 1M karakter"),
    kutu("OpenAI görsel", sayiGirdisi("maliyet.gorsel", m.birim.gorsel, { adim: 0.001 }), "$ / görsel"),
  );
  $("costTable").querySelector("tbody").replaceChildren(...m.bolumler.map((b) => {
    const kar = el("td", { className: `num ${b.kar == null ? "" : b.kar >= 0 ? "kar-arti" : "kar-eksi"}`, textContent: b.kar == null ? "—" : tl(b.kar) });
    // Yalnız fiyat girişi ve sonuç; maliyetin kırılımı tutarın ipucunda.
    const ayrinti = `${b.olculen ? `${sayi(b.islem)} işlemden ölçüldü` : "Tahmin (henüz ölçüm yok)"} · ort. ${sayi(b.ortalama.giris)} girdi / ${sayi(b.ortalama.cikis)} çıktı token\n` +
      `Metin: ${tl(b.tl.metin, 4)} · Ses (dinlenirse): ${tl(b.tl.ses, 4)} · Görsel: ${tl(b.tl.gorsel, 4)}`;
    // Sıra: maliyet → kâr → fiyat → uzman (insan) değerlendirmesi fiyatı.
    const fiyatKutusu = (anahtar, deger, tlKarsiligi) => el("div", { className: "fiyat-kutu" },
      sayiGirdisi(anahtar, deger, { adim: 1 }), el("small", { textContent: `= ${tl(tlKarsiligi)}` }));
    return el("tr", {},
      el("td", { className: "bolum-ad", textContent: b.ad }),
      el("td", { className: `num ${b.olculen ? "" : "tahmin"}`, textContent: `${b.olculen ? "" : "≈ "}${tl(b.maliyet, 2)}`, title: ayrinti }),
      kar,
      el("td", { className: "num" }, fiyatKutusu(`fiyat.${b.id}`, b.kontor, b.satis)),
      el("td", { className: "num" }, b.uzmanKontor == null ? el("span", { className: "tahmin", textContent: "—" }) : fiyatKutusu(`fiyat.${b.id}.uzman`, b.uzmanKontor, b.uzmanSatis)),
    );
  }));
}

// --- API anahtarları ---

async function anahtarlariYukle() {
  try {
    renderAnahtarlar((await api("/api/yonetim/anahtarlar")).anahtarlar);
  } catch (error) {
    toast(error.message);
  }
}

function renderAnahtarlar(liste) {
  $("keys").replaceChildren(...liste.map((a) => {
    const durum = el("p", { className: "key-state", textContent: a.var ? `Kayıtlı · …${a.son4} · ${tarih(a.tarih)}` : "Girilmemiş" });
    const sonuc = el("p", { className: "key-result" });
    const girdi = el("input", { type: "password", placeholder: a.var ? "Yeni anahtarla değiştir" : a.ipucu, autocomplete: "off", spellcheck: false });
    girdi.setAttribute("aria-label", `${a.ad} anahtarı`);
    const kaydet = el("button", { type: "button", className: "btn btn-primary", textContent: "Kaydet" });
    const testEt = el("button", { type: "button", className: "btn btn-ghost", textContent: "Test et", disabled: !a.var });
    const sil = el("button", { type: "button", className: "btn btn-ghost", textContent: "Sil", hidden: !a.var });
    kaydet.addEventListener("click", async () => {
      if (!girdi.value.trim()) { toast("Önce anahtarı yapıştır."); return; }
      kaydet.disabled = true;
      try {
        const yeni = (await api("/api/yonetim/anahtar", { saglayici: a.id, deger: girdi.value })).anahtarlar;
        renderAnahtarlar(yeni);
        toast(`${a.ad} anahtarı kaydedildi. Şimdi test edebilirsin.`);
      } catch (error) {
        toast(error.message);
        kaydet.disabled = false;
      }
    });
    testEt.addEventListener("click", async () => {
      testEt.disabled = true;
      sonuc.className = "key-result";
      sonuc.textContent = "Test ediliyor…";
      try {
        const r = await api("/api/yonetim/anahtar-test", { saglayici: a.id });
        sonuc.className = `key-result ${r.ok ? "ok" : "bad"}`;
        sonuc.textContent = `${r.ok ? "✓" : "✗"} ${r.mesaj}`;
      } catch (error) {
        sonuc.className = "key-result bad";
        sonuc.textContent = error.message;
      } finally {
        testEt.disabled = false;
      }
    });
    sil.addEventListener("click", async () => {
      if (!confirm(`${a.ad} anahtarı silinsin mi?`)) return;
      try {
        renderAnahtarlar((await api("/api/yonetim/anahtar", { saglayici: a.id, deger: "" })).anahtarlar);
        toast("Anahtar silindi.");
      } catch (error) {
        toast(error.message);
      }
    });
    return el("div", { className: "key-row" }, el("h3", { textContent: a.ad }), durum, el("div", { className: "key-actions" }, girdi, kaydet, testEt, sil), sonuc);
  }));
}

// --- Uzmanlar (sanal karakterler, gerçek uzmanlar, hakediş) ---

let uzVeri = null;
const tl2 = (n) => `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)} ₺`;

async function uzmanlariYukle() {
  try {
    uzVeri = await api("/api/yonetim/uzmanlar");
    renderSanal();
    renderGercek();
  } catch (error) {
    toast(error.message);
  }
}

// Bölüm seçimi: işaretlenebilir küçük etiketler.
function bolumSecici(secili) {
  const kutu = el("div", { className: "uz-bolumler" });
  uzVeri.bolumListesi.forEach((b) => {
    const c = el("input", { type: "checkbox", value: b.id, checked: secili.includes(b.id) });
    kutu.append(el("label", { className: "uz-bolum" }, c, el("span", { textContent: b.ad })));
  });
  kutu.secilenler = () => [...kutu.querySelectorAll("input:checked")].map((x) => x.value);
  return kutu;
}

// Uzmanın yazılı cevabını okuyacak ses: seçim kutusu + kendi adıyla örnek dinletme.
let ornekSes = null;
function sesSecici(u) {
  const sec = el("select", { className: "uz-ses" }, el("option", { value: "", textContent: "Bölümün sesi" }),
    ...uzVeri.sesler.map((x) => el("option", { value: x, textContent: x[0].toLocaleUpperCase("tr-TR") + x.slice(1), selected: x === u.ses })));
  const dinle = el("button", { type: "button", className: "btn btn-ghost btn-sm", textContent: "▶ Dinle" });
  dinle.addEventListener("click", async () => {
    dinle.disabled = true;
    dinle.textContent = "⏳";
    try {
      const r = await fetch("/api/yonetim/ses-ornek", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ ses: sec.value, metin: `Merhaba, ben ${u.ad || "uzmanınız"}. Fincanına, yıldızlarına ve kalbine birlikte bakalım.` }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ses çalınamadı.");
      ornekSes?.pause();
      ornekSes = new Audio(URL.createObjectURL(await r.blob()));
      await ornekSes.play();
    } catch (error) { toast(error.message); } finally { dinle.disabled = false; dinle.textContent = "▶ Dinle"; }
  });
  const kutu = el("div", { className: "uz-ses-kutu" }, sec, dinle);
  kutu.deger = () => sec.value;
  return kutu;
}

async function fotoYukle(id, dosya) {
  const r = await fetch(`/api/yonetim/uzman-foto?id=${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": dosya.type }, credentials: "same-origin", body: dosya });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Fotoğraf yüklenemedi.");
  return d;
}
const fotoDugmesi = (id, yazi = "🖼 Resmi değiştir") => {
  const girdi = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp", hidden: true });
  const b = el("button", { type: "button", className: "btn btn-ghost btn-sm", textContent: yazi });
  b.addEventListener("click", () => girdi.click());
  girdi.addEventListener("change", async () => {
    if (!girdi.files[0]) return;
    try { await fotoYukle(id, girdi.files[0]); toast("Resim güncellendi."); uzmanlariYukle(); } catch (error) { toast(error.message); }
  });
  return el("span", {}, b, girdi);
};

function renderSanal() {
  const sanallar = uzVeri.uzmanlar.filter((u) => u.tip === "sanal");
  const gercekler = uzVeri.uzmanlar.filter((u) => u.tip === "gercek");
  $("snOzet").textContent = `${sanallar.filter((u) => u.gorunuyor).length} / ${sanallar.length} vitrinde`;
  $("snGrid").replaceChildren(...sanallar.map((u) => {
    const ad = el("input", { value: u.ad, maxLength: 40, placeholder: "İsim ver (ör. Nuran Ana)" });
    const unvan = el("input", { value: u.unvan, maxLength: 50, placeholder: "Unvan (ör. Kahve falı ustası)" });
    const tanitim = el("textarea", { value: u.tanitim, maxLength: 400, rows: 2, placeholder: "Kısa tanıtım (müşteri görür)" });
    const bolumler = bolumSecici(u.bolumler);
    const sabit = el("select", {}, el("option", { value: "", textContent: "Havuz: bölümü seçen bütün uzmanlar" }),
      ...gercekler.map((g) => el("option", { value: g.id, textContent: `Yalnız ${g.ad} (${g.email})`, selected: g.id === u.sabitUzman })));
    const sira = el("input", { type: "number", min: 1, max: 99, value: u.sira || 1, className: "uz-sira" });
    const ses = sesSecici(u);
    const acik = el("input", { type: "checkbox", checked: u.aktif });
    const kaydet = el("button", { type: "button", className: "btn btn-primary btn-sm", textContent: "Kaydet" });
    const sil = el("button", { type: "button", className: "btn btn-ghost btn-sm", textContent: "Sil" });
    kaydet.addEventListener("click", async () => {
      kaydet.disabled = true;
      try {
        await api("/api/yonetim/uzman-guncelle", { id: u.id, ad: ad.value, unvan: unvan.value, tanitim: tanitim.value, bolumler: bolumler.secilenler(), sabitUzman: sabit.value, sira: Number(sira.value), aktif: acik.checked, ses: ses.deger() });
        toast(`${ad.value || "Karakter"} kaydedildi.`);
        uzmanlariYukle();
      } catch (error) { toast(error.message); kaydet.disabled = false; }
    });
    sil.addEventListener("click", async () => {
      if (!confirm(`${u.ad || "Bu karakter"} silinsin mi?`)) return;
      try { await api("/api/yonetim/uzman-sil", { id: u.id }); uzmanlariYukle(); } catch (error) { toast(error.message); }
    });
    const durum = u.gorunuyor ? "✓ Vitrinde" : !u.aktif ? "Kapalı" : !u.ad ? "İsim yok" : !u.bolumler.length ? "Bölüm seçilmedi" : "Resim yok";
    return el("article", { className: `sn-kart${u.gorunuyor ? " acik" : ""}` },
      el("div", { className: "sn-resim" }, u.resim ? el("img", { src: u.resim, alt: "", loading: "lazy" }) : el("span", { textContent: "Resim yok" }), el("b", { className: "sn-durum", textContent: durum })),
      el("div", { className: "sn-alanlar" },
        ad, unvan, tanitim,
        el("small", { className: "uz-etiket", textContent: "Görüneceği bölümler" }), bolumler,
        el("small", { className: "uz-etiket", textContent: "Yazılı cevabı okuyacak ses" }), ses,
        el("small", { className: "uz-etiket", textContent: "Talepler kime gitsin" }), sabit,
        el("div", { className: "sn-alt" }, el("label", { className: "uz-acik" }, acik, " Açık"), el("label", { className: "uz-acik" }, "Sıra ", sira), fotoDugmesi(u.id), sil, kaydet)));
  }));
}

function renderGercek() {
  const uyeler = uzVeri.uyeler.filter((m) => !uzVeri.uzmanlar.some((u) => u.userId === m.id));
  $("uzUyeler").replaceChildren(...uyeler.map((m) => el("option", { value: m.email, textContent: m.name })));
  const gercekler = uzVeri.uzmanlar.filter((u) => u.tip === "gercek");
  $("uzListe").replaceChildren(...(gercekler.length ? gercekler.map((u) => {
    const h = u.hakedis || { toplam: 0, odenen: 0, kalan: 0, adet: 0, kalemler: [], odemeler: [] };
    const ad = el("input", { value: u.ad, maxLength: 40 });
    const unvan = el("input", { value: u.unvan, maxLength: 50 });
    const oran = el("input", { type: "number", min: 0, max: 100, value: u.oran, className: "uz-sira" });
    const acik = el("input", { type: "checkbox", checked: u.aktif });
    const bolumler = bolumSecici(u.bolumler);
    const gses = sesSecici(u);
    const kaydet = el("button", { type: "button", className: "btn btn-primary btn-sm", textContent: "Kaydet" });
    kaydet.addEventListener("click", async () => {
      try {
        await api("/api/yonetim/uzman-guncelle", { id: u.id, ad: ad.value, unvan: unvan.value, oran: Number(oran.value), aktif: acik.checked, bolumler: bolumler.secilenler(), ses: gses.deger() });
        toast(`${ad.value} kaydedildi.`);
        uzmanlariYukle();
      } catch (error) { toast(error.message); }
    });
    const ode = el("button", { type: "button", className: "btn btn-ghost btn-sm", textContent: "💸 Ödeme yaptım", disabled: !(h.kalan > 0) });
    ode.addEventListener("click", async () => {
      const not = prompt(`${u.ad} için ${tl2(h.kalan)} ödendi olarak işaretlensin. Not (ör. havale tarihi / açıklama):`, "");
      if (not === null) return;
      try { const r = await api("/api/yonetim/hakedis-ode", { uzmanId: u.id, not }); toast(`${tl2(r.odeme.tutar)} ödeme kaydedildi.`); uzmanlariYukle(); } catch (error) { toast(error.message); }
    });
    const kalemler = el("details", { className: "uz-kalemler" }, el("summary", { textContent: `Cevaplar ve ödemeler (${h.adet} cevap, ${h.odemeler.length} ödeme)` }),
      el("table", { className: "grid-table" },
        el("thead", {}, el("tr", {}, ...["Tarih", "Bölüm", "Müşteri", "Tür", "Fiyat", "Oran", "Hakediş", ""].map((x) => el("th", { textContent: x })))),
        el("tbody", {}, ...h.kalemler.map((k) => el("tr", {},
          el("td", { textContent: tarih(k.tarih) }), el("td", { textContent: k.bolumAdi }), el("td", { textContent: k.musteri }),
          el("td", { textContent: { video: "🎬 Video", ses: "🎙️ Ses", yazi: "✍️ Yazı" }[k.tur] || k.tur }),
          el("td", { textContent: `${k.fiyatKontor} kontör` }), el("td", { textContent: `%${k.oran}` }),
          el("td", { className: "num", textContent: tl2(k.tutar) }), el("td", { className: k.odendi ? "ok" : "muted", textContent: k.odendi ? "Ödendi" : "Bekliyor" }))))),
      ...h.odemeler.map((o) => el("p", { className: "section-note small", textContent: `💸 ${tarih(o.tarih)} · ${tl2(o.tutar)} · ${o.adet} cevap${o.not ? ` · ${o.not}` : ""} · ${o.kim}` })));
    return el("article", { className: "uz-kart" },
      el("div", { className: "uz-ust" },
        u.resim ? el("img", { className: "uz-foto", src: u.resim, alt: "" }) : el("span", { className: "uz-foto bos", textContent: "👤" }),
        el("div", {}, el("b", { textContent: u.ad }), el("small", { textContent: `${u.email} · ${u.vitrinde ? (u.gorunuyor ? "kendi adıyla vitrinde" : "vitrinde görünmek istiyor (foto/bölüm eksik)") : "yalnız arka planda cevaplıyor"}` })),
        el("div", { className: "uz-hakedis" }, el("span", {}, "Toplam ", el("b", { textContent: tl2(h.toplam) })), el("span", {}, "Ödenen ", el("b", { textContent: tl2(h.odenen) })), el("span", { className: "kalan" }, "Kalan ", el("b", { textContent: tl2(h.kalan) })), ode)),
      el("div", { className: "uz-duzen" }, el("label", {}, "Görünen ad", ad), el("label", {}, "Unvan", unvan), el("label", {}, "Oran %", oran), el("label", { className: "uz-acik" }, acik, " Açık"), fotoDugmesi(u.id, "🖼 Foto"), kaydet),
      el("small", { className: "uz-etiket", textContent: "Yorum yazabileceği bölümler (uzman kendisi de seçer)" }), bolumler,
      el("small", { className: "uz-etiket", textContent: "Kendi adıyla görünürse yazılı cevabını okuyacak ses" }), gses, kalemler);
  }) : [el("p", { className: "section-note", textContent: "Henüz gerçek uzman yok. Yukarıdan bir üyeyi uzman yap." })]));
}

$("snYeni").addEventListener("click", async () => {
  try { await api("/api/yonetim/sanal-ekle", {}); toast("Yeni karakter eklendi; resmini yükleyip isim ver."); uzmanlariYukle(); } catch (error) { toast(error.message); }
});
$("uzEkle").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("uzUye").value.trim().toLowerCase();
  const uye = uzVeri.uyeler.find((m) => m.email.toLowerCase() === q) || uzVeri.uyeler.find((m) => m.name.toLocaleLowerCase("tr-TR") === q);
  if (!uye) { toast("Listeden bir üye seç (e-postasını yaz)."); return; }
  try {
    await api("/api/yonetim/uzman-ekle", { userId: uye.id, ad: $("uzAd").value || uye.name, unvan: $("uzUnvan").value, oran: Number($("uzOran").value) });
    $("uzEkle").reset();
    toast(`${uye.name || uye.email} artık uzman. Panel adresi: /uzman`);
    uzmanlariYukle();
  } catch (error) { toast(error.message); }
});

// --- Ödeme (PayTR) ve kuponlar ---

const SIPARIS_DURUM = { basladi: "Başladı", bekliyor: "Ödeme sayfasında", acilamadi: "Açılamadı", basarisiz: "Başarısız", odendi: "Ödendi ✓" };

async function odemeYukle() {
  try {
    renderOdeme(await api("/api/yonetim/odeme"));
  } catch (error) {
    toast(error.message);
  }
}

function renderPaytr(p) {
  $("payState").className = `pay-state ${p.hazir ? (p.mod === "canli" ? "canli" : "test") : ""}`;
  $("payState").textContent = p.hazir
    ? `${p.mod === "canli" ? "● CANLI — herkes kontör alabilir" : "● TEST modu — yalnız sen deneyebilirsin, para çekilmez"} · Mağaza ${p.magazaNo} · parola …${p.parolaSon} · gizli anahtar …${p.gizliSon}`
    : "Ödeme kapalı: mağaza bilgileri eksik. Kullanıcılar paketleri görür ama satın alamaz.";
  $("payId").value = p.magazaNo || "";
  $("payKey").value = "";
  $("paySalt").value = "";
  $("payKey").placeholder = p.parolaSon ? `kayıtlı (…${p.parolaSon}) — değiştirmek için yapıştır` : "";
  $("paySalt").placeholder = p.gizliSon ? `kayıtlı (…${p.gizliSon}) — değiştirmek için yapıştır` : "";
  $("payMode").value = p.mod;
  $("payNotify").textContent = p.bildirimAdresi;
  $("payTest").disabled = !p.hazir;
  $("payClear").hidden = !p.magazaNo && !p.parolaSon;
}

function renderKuponlar(liste) {
  $("cpTable").querySelector("tbody").replaceChildren(...liste.map((k) => {
    const sil = el("button", { type: "button", className: "btn btn-ghost btn-sm", textContent: "Sil", hidden: Boolean(k.kullanan) });
    sil.addEventListener("click", async () => {
      if (!confirm(`${k.kod} kuponu silinsin mi?`)) return;
      try { renderKuponlar((await api("/api/yonetim/kupon-sil", { kod: k.kod })).kuponlar); } catch (error) { toast(error.message); }
    });
    return el("tr", {},
      el("td", {}, el("code", { textContent: k.kod })),
      el("td", { className: "num", textContent: sayi(k.kontor) }),
      el("td", { textContent: k.notu || "—" }),
      el("td", { textContent: tarih(k.olusturma) }),
      el("td", { className: k.kullanan ? "" : "muted", textContent: k.kullanan ? `${k.kullanan.eposta} · ${tarih(k.kullanma)}` : "Kullanılmadı" }),
      el("td", {}, sil));
  }));
  $("cpTable").hidden = !liste.length;
  $("cpEmpty").hidden = Boolean(liste.length);
}

function renderOdeme(d) {
  renderPaytr(d.paytr);
  renderKuponlar(d.kuponlar);
  $("payTable").querySelector("tbody").replaceChildren(...d.siparisler.map((s) => el("tr", {},
    el("td", { textContent: tarih(s.tarih) }),
    el("td", { textContent: s.eposta }),
    el("td", { className: "num", textContent: `${sayi(s.tutar)} ₺` }),
    el("td", { className: "num", textContent: sayi(s.kontor) }),
    el("td", { textContent: s.mod === "canli" ? "Canlı" : "Test" }),
    el("td", { className: s.durum === "odendi" ? "ok" : ["acilamadi", "basarisiz"].includes(s.durum) ? "bad" : "", textContent: SIPARIS_DURUM[s.durum] || s.durum, title: s.hata || "" }))));
  $("payTable").hidden = !d.siparisler.length;
  $("payEmpty").hidden = Boolean(d.siparisler.length);
}

$("paySave").addEventListener("click", async () => {
  const mod = $("payMode").value;
  if (mod === "canli" && !confirm("Canlı moda geçilsin mi? Kullanıcıların kartından gerçek ödeme alınır.")) return;
  $("paySave").disabled = true;
  try {
    const r = await api("/api/yonetim/paytr", { magazaNo: $("payId").value, parola: $("payKey").value, gizli: $("paySalt").value, mod });
    renderPaytr(r.paytr);
    $("payResult").textContent = "";
    toast(r.paytr.hazir ? "PayTR bilgileri kaydedildi. Şimdi bağlantıyı test edebilirsin." : "Kaydedildi. Eksik bilgi var.");
  } catch (error) {
    toast(error.message);
  } finally {
    $("paySave").disabled = false;
  }
});
$("payTest").addEventListener("click", async () => {
  $("payTest").disabled = true;
  $("payResult").className = "key-result";
  $("payResult").textContent = "Test ediliyor…";
  try {
    const r = await api("/api/yonetim/paytr-test", {});
    $("payResult").className = `key-result ${r.ok ? "ok" : "bad"}`;
    $("payResult").textContent = `${r.ok ? "✓" : "✗"} ${r.mesaj}`;
  } catch (error) {
    $("payResult").className = "key-result bad";
    $("payResult").textContent = error.message;
  } finally {
    $("payTest").disabled = false;
  }
});
$("payClear").addEventListener("click", async () => {
  if (!confirm("PayTR mağaza bilgileri silinsin mi? Ödeme kapanır.")) return;
  try {
    renderPaytr((await api("/api/yonetim/paytr", { temizle: true })).paytr);
    toast("Mağaza bilgileri silindi; ödeme kapalı.");
  } catch (error) {
    toast(error.message);
  }
});
$("cpMake").addEventListener("click", async () => {
  $("cpMake").disabled = true;
  try {
    const r = await api("/api/yonetim/kupon-uret", { kontor: Number($("cpValue").value), adet: Number($("cpCount").value), notu: $("cpNote").value });
    renderKuponlar(r.kuponlar);
    $("cpNewTitle").textContent = `${r.kodlar.length} yeni kupon · ${sayi(r.kontor)} kontör`;
    $("cpCodes").value = r.kodlar.join("\n");
    $("cpNew").hidden = false;
    $("cpNote").value = "";
  } catch (error) {
    toast(error.message);
  } finally {
    $("cpMake").disabled = false;
  }
});
$("cpCopy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("cpCodes").value);
    toast("Kodlar kopyalandı.");
  } catch {
    $("cpCodes").select();
  }
});

// --- Başlangıç ---

async function yukle() {
  veri = await api("/api/yonetim/durum");
  renderOzet();
  renderAyarlar();
  renderGecmis();
}

$("refresh").addEventListener("click", async () => {
  if (Object.keys(taslak).length && !confirm("Kaydedilmemiş değişiklikler silinsin mi?")) return;
  await yukle().catch((e) => toast(e.message));
  if (!$("tab-kullanicilar").hidden) kullanicilariYukle();
  toast("Yenilendi.");
});

window.addEventListener("beforeunload", (e) => { if (Object.keys(taslak).length) { e.preventDefault(); e.returnValue = ""; } });

(async () => {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) { window.location.replace("/login?next=%2Fyonetim"); return; }
  $("topbarUser").textContent = me.user.email;
  try {
    await yukle();
  } catch (error) {
    document.querySelector(".admin").replaceChildren(el("p", { className: "section-note", textContent: "Bu sayfaya erişimin yok." }));
    return;
  }
  const hedef = location.hash.slice(1);
  if (["ozet", "ayarlar", "kullanicilar", "fiyatlar", "uzmanlar", "odeme", "anahtarlar", "gecmis"].includes(hedef)) sekme(hedef);
})();
