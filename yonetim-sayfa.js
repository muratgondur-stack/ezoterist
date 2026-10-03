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
  $("userCount").textContent = `${liste.length} / ${kullanicilar.length}`;
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
  $("costInputs").replaceChildren(
    kutu("Dolar kuru (USD/TRY)", sayiGirdisi("maliyet.usdTry", veri.degerler["maliyet.usdTry"]), `Kullanılan: ${m.kur ? m.kur.toFixed(4) : "—"} (${m.kurKaynagi})${m.tcmb ? ` · TCMB: ${m.tcmb}` : ""} · 0 = otomatik`),
    kutu("1 kontör =", sayiGirdisi("fiyat.kontorTL", m.kontorTL), "TL"),
    kutu("gpt-4.1-mini girdi", sayiGirdisi("maliyet.metinGiris", m.birim.giris), "$ / 1M token"),
    kutu("gpt-4.1-mini çıktı", sayiGirdisi("maliyet.metinCikis", m.birim.cikis), "$ / 1M token"),
    kutu("Google TTS standart", sayiGirdisi("maliyet.ses", m.birim.ses), "$ / 1M karakter"),
    kutu("OpenAI görsel", sayiGirdisi("maliyet.gorsel", m.birim.gorsel, { adim: 0.001 }), "$ / görsel"),
  );
  $("costTable").querySelector("tbody").replaceChildren(...m.bolumler.map((b) => {
    const kontor = b.kontor == null ? el("span", { textContent: "—" }) : sayiGirdisi(`fiyat.${b.id}`, b.kontor, { adim: 1 });
    const kar = el("td", { className: `num ${b.kar == null ? "" : b.kar >= 0 ? "kar-arti" : "kar-eksi"}`, textContent: b.kar == null ? "—" : tl(b.kar) });
    const olcum = b.olculen ? `${sayi(b.islem)} işlem` : "tahmin";
    return el("tr", {},
      el("td", { textContent: b.ad }),
      el("td", { className: b.olculen ? "" : "tahmin", textContent: olcum }),
      el("td", { className: "num", textContent: `${sayi(b.ortalama.giris)} / ${sayi(b.ortalama.cikis)}${b.ortalama.gorsel ? ` · ${b.ortalama.gorsel} görsel` : ""}` }),
      el("td", { className: "num", textContent: tl(b.tl.metin, 4) }),
      el("td", { className: "num", textContent: tl(b.tl.ses, 4) }),
      el("td", { className: "num", textContent: tl(b.tl.gorsel, 4) }),
      el("td", { className: "num", textContent: tl(b.maliyet, 4) }),
      el("td", { className: "num" }, kontor),
      el("td", { className: "num", textContent: b.satis == null ? "—" : tl(b.satis) }),
      kar,
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
  if (["ozet", "ayarlar", "kullanicilar", "fiyatlar", "anahtarlar", "gecmis"].includes(hedef)) sekme(hedef);
})();
