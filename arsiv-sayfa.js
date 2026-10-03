const $ = (id) => document.getElementById(id);
const { sehirler } = AstrolojiVeri;

let me = null;
let arsiv = { analizler: [], talepler: [], kontor: { bakiye: 0, hareketler: [], turler: {} } };
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3600);
};
const tarih = (ms, saatli = false) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", ...(saatli ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(ms));
const sayi = (n) => new Intl.NumberFormat("tr-TR").format(n);

async function post(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "İşlem yapılamadı.");
  return data;
}

// --- Sekmeler ---

function sekmeAc(ad, adresiGuncelle = true) {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === ad)));
  document.querySelectorAll(".tab-panel").forEach((p) => { p.hidden = p.id !== `tab-${ad}`; });
  if (adresiGuncelle) history.replaceState(null, "", `#${ad}`);
}
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => sekmeAc(b.dataset.tab)));
$("balanceChip").addEventListener("click", () => sekmeAc("kontor"));

// --- Hesap başlığı ---

function renderHeader() {
  const ad = me.name || me.email;
  $("avatar").textContent = ad.trim().charAt(0).toLocaleUpperCase("tr-TR");
  $("accountName").textContent = ad;
  $("topbarUser").textContent = ad;
  $("accountMeta").textContent = [me.email, me.createdAt ? `${tarih(Date.parse(me.createdAt))} tarihinden beri üye` : "", me.google ? "Google ile bağlı" : ""].filter(Boolean).join(" · ");
  $("balanceTop").textContent = sayi(arsiv.kontor.bakiye);
}

// --- Profil ---

const form = $("profileForm");
const CINSIYET = [["kadin", "Kadın"], ["erkek", "Erkek"], ["belirtmek-istemiyorum", "Belirtmek istemiyorum"]];
let cinsiyet = "";

function renderGender() {
  $("genderChips").replaceChildren(...CINSIYET.map(([k, ad]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ad;
    b.setAttribute("aria-pressed", String(k === cinsiyet));
    b.addEventListener("click", () => { cinsiyet = cinsiyet === k ? "" : k; renderGender(); });
    return b;
  }));
}

function fillCities() {
  const grup = (label, list) => {
    const g = document.createElement("optgroup");
    g.label = label;
    list.forEach((s) => g.append(new Option(s.ad, s.ad)));
    return g;
  };
  form.elements.dogumYeri.append(
    new Option("Seçilmedi", ""),
    grup("Türkiye", sehirler.filter((s) => s.saatDilimi === "Europe/Istanbul")),
    grup("Yurt dışı", sehirler.filter((s) => s.saatDilimi !== "Europe/Istanbul")),
  );
}

function fillProfile() {
  const p = me.profil || {};
  form.elements.name.value = me.name || "";
  form.elements.dogumTarihi.value = p.dogumTarihi || "";
  form.elements.dogumTarihi.max = new Date().toISOString().slice(0, 10);
  form.elements.dogumSaati.value = p.dogumSaati || "";
  form.elements.dogumYeri.value = p.dogumYeri || "";
  cinsiyet = p.cinsiyet || "";
  renderGender();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const b = $("profileSave");
  b.disabled = true;
  $("profileSaved").hidden = true;
  try {
    const data = await post("/api/profil", {
      name: form.elements.name.value.trim(),
      dogumTarihi: form.elements.dogumTarihi.value,
      dogumSaati: form.elements.dogumSaati.value,
      dogumYeri: form.elements.dogumYeri.value,
      cinsiyet,
    });
    me = data.user;
    renderHeader();
    $("profileSaved").hidden = false;
    setTimeout(() => { $("profileSaved").hidden = true; }, 3000);
  } catch (error) {
    toast(error.message);
  } finally {
    b.disabled = false;
  }
});

// --- Kontör ---

function renderWallet() {
  const k = arsiv.kontor;
  $("balanceBig").textContent = sayi(k.bakiye);
  $("balanceTop").textContent = sayi(k.bakiye);
  $("loadButton").disabled = !k.yuklemeAcik;
  const tbody = $("moves").querySelector("tbody");
  tbody.replaceChildren(...k.hareketler.map((h) => {
    const tr = document.createElement("tr");
    [tarih(h.tarih, true), h.aciklama || "—", k.turler[h.tur] || h.tur].forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v;
      tr.append(td);
    });
    const m = document.createElement("td");
    m.className = `num ${h.miktar > 0 ? "arti" : "eksi"}`;
    m.textContent = `${h.miktar > 0 ? "+" : "−"}${sayi(Math.abs(h.miktar))}`;
    const bk = document.createElement("td");
    bk.className = "num";
    bk.textContent = sayi(h.bakiyeSonra);
    tr.append(m, bk);
    return tr;
  }));
  $("moves").hidden = !k.hareketler.length;
  $("movesEmpty").hidden = Boolean(k.hareketler.length);
}

$("loadButton").addEventListener("click", async () => {
  try { await post("/api/kontor/yukle", {}); } catch (error) { toast(error.message); }
});

// --- Analizler ---

const DURUM = { sirada: "Sırada", inceleniyor: "İnceleniyor", hazir: "Hazır ✓" };
let filtre = "";
let gosterilen = 20;

function renderOrders() {
  const list = $("orders");
  if (!arsiv.talepler.length) {
    list.innerHTML = '<li class="empty">Henüz uzman yorumu istemedin. Her analizin altındaki uzman kartından isteyebilirsin.</li>';
    return;
  }
  list.replaceChildren(...arsiv.talepler.map((t) => {
    const uzman = Uzmanlar.find((u) => u.id === t.uzman);
    const li = document.createElement("li");
    li.innerHTML = `<img alt="" width="44" height="44" /><div><b></b><small></small></div><div><span class="status"></span> <a class="go"></a></div>`;
    li.querySelector("img").src = uzman?.resim || "/favicon.png";
    li.querySelector("b").textContent = `${t.bolumAdi.charAt(0).toLocaleUpperCase("tr-TR")}${t.bolumAdi.slice(1)}${t.baslik ? ` · ${t.baslik}` : ""}`;
    const ek = t.durum === "hazir" && t.cevap?.tarih ? `yanıt ${tarih(t.cevap.tarih)}` : t.sonTarih ? `en geç ${tarih(t.sonTarih, true)}` : "";
    li.querySelector("small").textContent = [`${uzman?.ad || "Uzman"} · ${tarih(t.olusturma)}`, ek].filter(Boolean).join(" · ");
    const s = li.querySelector(".status");
    s.className = `status ${t.durum}`;
    s.textContent = DURUM[t.durum] || t.durum;
    const a = li.querySelector(".go");
    a.href = t.link;
    a.textContent = t.durum === "hazir" ? "Oku →" : "Aç →";
    return li;
  }));
}

function renderAnalyses() {
  const sayim = new Map();
  arsiv.analizler.forEach((a) => sayim.set(a.bolum, (sayim.get(a.bolum) || 0) + 1));
  $("analysisNote").textContent = arsiv.analizler.length
    ? `${arsiv.analizler.length} analiz, ${sayim.size} bölümde. Birine dokun, o bölümde aç.`
    : "Henüz bir analizin yok. Ana menüden bir bölüm seçerek başlayabilirsin.";
  const chips = [["", `Hepsi · ${arsiv.analizler.length}`], ...[...sayim].map(([b, n]) => [b, `${b} · ${n}`])];
  $("analysisFilter").replaceChildren(...chips.map(([k, ad]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ad;
    b.setAttribute("aria-pressed", String(k === filtre));
    b.addEventListener("click", () => { filtre = k; gosterilen = 20; renderAnalyses(); });
    return b;
  }));
  $("analysisFilter").hidden = !arsiv.analizler.length;
  const liste = arsiv.analizler.filter((a) => !filtre || a.bolum === filtre);
  $("analyses").replaceChildren(...liste.slice(0, gosterilen).map((a) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = a.link;
    link.innerHTML = `<span class="ikon" aria-hidden="true"></span><div><b></b><small></small></div><span class="go">Aç →</span>`;
    link.querySelector(".ikon").textContent = a.ikon;
    link.querySelector("b").textContent = a.baslik;
    link.querySelector("small").textContent = `${a.bolum} · ${tarih(a.tarih, true)}`;
    li.append(link);
    return li;
  }));
  $("moreButton").hidden = liste.length <= gosterilen;
}

$("moreButton").addEventListener("click", () => { gosterilen += 20; renderAnalyses(); });

// --- Güvenlik ---

const pform = $("passwordForm");

function renderPasswordForm() {
  const ilk = !me.sifreVar;
  $("currentWrap").hidden = ilk;
  $("passwordTitle").textContent = ilk ? "Şifre belirle" : "Şifremi değiştir";
  $("passwordNote").textContent = ilk
    ? "Hesabın Google ile açıldı. İstersen bir şifre belirleyip e-posta adresinle de giriş yapabilirsin."
    : "Şifreni değiştirdiğinde diğer cihazlardaki oturumların kapanır ve sana bilgi e-postası gönderilir.";
  $("passwordSave").textContent = ilk ? "Şifremi belirle" : "Şifremi değiştir";
}

$("showPass").addEventListener("change", (e) => {
  pform.querySelectorAll("input[name]").forEach((i) => { i.type = e.target.checked ? "text" : "password"; });
});

pform.addEventListener("submit", async (e) => {
  e.preventDefault();
  const yeni = pform.elements.yeni.value;
  if (yeni !== pform.elements.tekrar.value) { toast("Yeni şifreler birbirini tutmuyor."); return; }
  if (yeni.length < 8) { toast("Yeni şifre en az 8 karakter olmalı."); return; }
  const b = $("passwordSave");
  b.disabled = true;
  $("passwordSaved").hidden = true;
  try {
    const data = await post("/api/sifre", { mevcut: pform.elements.mevcut.value, yeni });
    me = data.user;
    pform.reset();
    renderPasswordForm();
    $("passwordSaved").hidden = false;
    setTimeout(() => { $("passwordSaved").hidden = true; }, 4000);
  } catch (error) {
    toast(error.message);
  } finally {
    b.disabled = false;
  }
});

$("logoutButton").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  window.location.href = "/";
});

// --- Başlangıç ---

async function init() {
  const data = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!data?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/arsiv")}`);
    return;
  }
  me = data.user;
  const a = await fetch("/api/arsiv", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (a) arsiv = a;
  else toast("Arşiv bilgileri alınamadı.");
  renderHeader();
  fillProfile();
  renderWallet();
  renderOrders();
  renderAnalyses();
  renderPasswordForm();
  const hedef = window.location.hash.slice(1);
  if (["profil", "kontor", "analizler", "guvenlik"].includes(hedef)) sekmeAc(hedef, false);
}

fillCities();
init();
