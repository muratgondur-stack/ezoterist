// Uzman paneli: talepler (üstlen, yazılı / sesli / videolu cevap), profil (fotoğraf, unvan, tanıtım, bölümler) ve
// hakedişler. Uzman yalnız kendi üstlendiği ya da üstlenebileceği talepleri görür; yönetici hepsini görür.
const $ = (id) => document.getElementById(id);
const DURUM = { sirada: "Sırada", inceleniyor: "İnceleniyor", hazir: "Teslim edildi" };

let veri = null;
let talepler = [];
let seciliId = null;
let aktifKaydedici = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3600);
};

const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
const tl = (n) => `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)} ₺`;
const kisiAdi = (t) => t.userName || "Üyemiz";

function kalanSure(ms) {
  const fark = ms - Date.now();
  const saat = Math.round(Math.abs(fark) / 3600000);
  return fark >= 0 ? `${saat} saat kaldı` : `${saat} saat gecikti`;
}

async function postJson(url, govde) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(govde) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "İşlem yapılamadı.");
  return d;
}

// --- Sekmeler ---

function sekme(ad) {
  document.querySelectorAll("#uzSekmeler button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === ad)));
  document.querySelectorAll(".uz-panel").forEach((p) => { p.hidden = p.id !== `tab-${ad}`; });
  history.replaceState(null, "", `#${ad}`);
  if (ad !== "talepler") aktifKaydedici?.kapat();
}
document.querySelectorAll("#uzSekmeler button").forEach((b) => b.addEventListener("click", () => sekme(b.dataset.tab)));

// --- Ses ---

const voice = $("voice");
function dinle(button, url) {
  if (!voice.paused) {
    voice.pause();
    button.textContent = "🔊 Sesli dinle";
    return;
  }
  button.textContent = "⏳ Ses hazırlanıyor…";
  voice.src = url;
  voice.play().then(() => { button.textContent = "⏹ Durdur"; }).catch(() => {
    button.textContent = "🔊 Sesli dinle";
    toast("Ses çalınamadı.");
  });
  voice.onended = () => { button.textContent = "🔊 Sesli dinle"; };
}

// --- Liste ---

function renderList() {
  const acik = talepler.filter((t) => t.durum !== "hazir" && (t.benim || veri.yonetici)).length;
  const havuz = talepler.filter((t) => t.ustlenilebilir).length;
  $("panelSummary").textContent = [acik ? `${acik} talep yorumunu bekliyor.` : "Bekleyen talebin yok.", havuz ? `${havuz} talep üstlenilmeyi bekliyor.` : ""].filter(Boolean).join(" ");
  $("panelList").replaceChildren(...talepler.map((t) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "panel-item";
    button.setAttribute("aria-current", String(t.id === seciliId));
    const chip = t.ustlenilebilir ? '<span class="chip chip-havuz">Üstlenilmedi</span>' : `<span class="chip chip-${t.durum}">${DURUM[t.durum]}</span>`;
    button.innerHTML = `${chip}<b></b><small></small><small></small>`;
    const [ad, ozet, sure] = button.querySelectorAll("b, small");
    ad.textContent = kisiAdi(t);
    ozet.textContent = `${t.bolumAdi[0].toLocaleUpperCase("tr-TR")}${t.bolumAdi.slice(1)} · ${t.uzmanAdi}${veri.yonetici && t.cevaplayanAdi ? ` → ${t.cevaplayanAdi}` : ""}`;
    if (t.durum === "hazir") sure.textContent = `Teslim: ${tarih(t.cevap.tarih)}`;
    else {
      sure.textContent = `Son teslim ${tarih(t.sonTarih)} · ${kalanSure(t.sonTarih)}`;
      if (t.sonTarih < Date.now()) sure.classList.add("late");
    }
    button.addEventListener("click", () => sec(t.id));
    li.append(button);
    return li;
  }));
}

// --- Ayrıntı ---

async function sec(id) {
  aktifKaydedici?.kapat();
  seciliId = id;
  renderList();
  let t = talepler.find((x) => x.id === id);
  if (t.durum === "sirada" && (t.benim || veri.yonetici) && t.cevaplayan) {
    // Açılan talep "inceleniyor" olur; kullanıcı da bunu görür.
    try {
      const d = await postJson("/api/uzman/panel/incele", { id });
      t = { ...t, durum: d.talep.durum };
      talepler = talepler.map((x) => (x.id === id ? t : x));
      renderList();
    } catch {}
  }
  renderDetail(t);
}

function medyaOynatici(t, taslak = false) {
  const tur = taslak ? t.taslakMedya?.tur : t.cevap?.medya?.tur;
  if (!tur) return null;
  const e = document.createElement(tur === "video" ? "video" : "audio");
  e.controls = true;
  e.preload = "metadata";
  e.playsInline = true;
  e.className = "cevap-medya";
  e.src = `/api/uzman/medya?id=${t.id}${taslak ? "&taslak=1" : ""}&v=${(taslak ? t.taslakMedya : t.cevap.medya).tarih || ""}`;
  return e;
}

function renderDetail(t) {
  const node = $("detailTemplate").content.cloneNode(true);
  const f = (name) => node.querySelector(`[data-f="${name}"]`);

  f("durum").textContent = `${t.ustlenilebilir ? "Üstlenilmedi" : DURUM[t.durum]} · ${t.bolumAdi} · kart: ${t.uzmanAdi}${t.cevaplayanAdi ? ` · cevaplayan: ${t.cevaplayanAdi}` : ""}`;
  f("kisi").textContent = kisiAdi(t);
  f("dogum").textContent = t.kaynak.girdiMetni;
  f("sure").textContent = t.durum === "hazir" ? `Teslim edildi: ${tarih(t.cevap.tarih)}` : `Son teslim: ${tarih(t.sonTarih)}\n${kalanSure(t.sonTarih)}`;
  f("harita").textContent = t.kaynak.ozet;
  if (t.kaynak.fotoSayisi) {
    f("fotolar").replaceChildren(...[...Array(t.kaynak.fotoSayisi).keys()].map((n) => {
      const a = document.createElement("a");
      a.href = `/api/uzman/foto?id=${t.id}&n=${n}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = `<img src="/api/uzman/foto?id=${t.id}&n=${n}" alt="Fotoğraf ${n + 1}" loading="lazy" />`;
      return a;
    }));
  } else if (t.kaynak.kartlar) {
    f("fotoKutu").querySelector("h4").textContent = "Kartlar";
    f("fotolar").replaceChildren(...t.kaynak.kartlar.map((c) => {
      const img = document.createElement("img");
      img.src = `/tarot/kart/${c.id}.webp`;
      img.alt = c.id;
      img.className = "tarot-mini";
      if (c.ters) img.style.transform = "rotate(180deg)";
      return img;
    }));
  } else f("fotoKutu").remove();
  if (t.soru) f("soru").textContent = t.soru;
  else f("soruKutu").remove();
  f("ai").textContent = t.kaynak.aiMetin;

  // Havuzdaki talep: önce üstlenilir.
  if (t.ustlenilebilir) {
    f("form").remove();
    f("teslimKutu").remove();
    f("ustlen").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        const d = await postJson("/api/uzman/panel/ustlen", { id: t.id });
        toast("Talep artık senin. Cevabını hazırlayabilirsin.");
        talepler = talepler.map((x) => (x.id === t.id ? { ...x, ...d.talep, ustlenilebilir: false, benim: true } : x));
        sec(t.id);
      } catch (error) {
        toast(error.message);
        await yukle();
      }
    });
    $("panelDetail").replaceChildren(node);
    return;
  }
  f("ustlenKutu").remove();

  if (t.durum === "hazir") {
    f("form").remove();
    f("cevap").textContent = t.cevap.metin || "";
    const m = medyaOynatici(t);
    if (m) f("cevapMedya").append(m);
    const dinleButon = f("dinle");
    if (t.cevap.metin) dinleButon.addEventListener("click", () => dinle(dinleButon, `/api/uzman/ses?id=${t.id}`));
    else dinleButon.remove();
    $("panelDetail").replaceChildren(node);
    return;
  }

  f("teslimKutu").remove();
  const form = f("form");
  const textarea = form.elements.metin;
  const kayitYeri = f("kayit");
  const medyaHazir = f("medyaHazir");
  const metinEtiket = f("metinEtiket");
  const sayac = f("sayac");
  const taslakKey = `ezo_uzman_taslak_${t.id}`;
  let tur = t.taslakMedya?.tur || "yazi";
  let medya = t.taslakMedya || null;
  try { textarea.value = localStorage.getItem(taslakKey) || ""; } catch {}
  const say = () => { sayac.textContent = `${textarea.value.trim().split(/\s+/).filter(Boolean).length} kelime`; };
  textarea.addEventListener("input", () => {
    say();
    try { localStorage.setItem(taslakKey, textarea.value); } catch {}
  });
  say();

  function medyaGoster() {
    medyaHazir.hidden = !medya || medya.tur !== tur;
    if (medyaHazir.hidden) return;
    medyaHazir.replaceChildren(`✓ ${medya.tur === "video" ? "Video" : "Ses"} kaydın yüklendi. Teslim edebilir ya da yeniden kaydedebilirsin.`);
    const m = medyaOynatici({ ...t, taslakMedya: medya }, true);
    if (m) medyaHazir.append(m);
  }

  function turSec(yeni) {
    aktifKaydedici?.kapat();
    tur = yeni;
    form.querySelectorAll(".cevap-turu button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tur === tur)));
    kayitYeri.hidden = tur === "yazi";
    metinEtiket.textContent = tur === "yazi" ? "Senin yorumun" : "Kısa yazılı not (isteğe bağlı)";
    textarea.rows = tur === "yazi" ? 12 : 4;
    if (tur !== "yazi") {
      aktifKaydedici = UzmanKaydedici.kur(kayitYeri, {
        tur,
        toast,
        bitince: (blob, mime) => yukleMedya(blob, mime),
      });
    }
    medyaGoster();
  }

  // Kayıt yüklenir (ilerleme çubuğuyla); teslimde cevaba eklenir.
  function yukleMedya(blob, mime) {
    const cubuk = document.createElement("progress");
    cubuk.max = 100;
    cubuk.className = "yukleme";
    kayitYeri.append(cubuk);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/uzman/panel/medya?id=${t.id}`);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) cubuk.value = (e.loaded / e.total) * 100; };
    xhr.onload = () => {
      cubuk.remove();
      const d = JSON.parse(xhr.responseText || "{}");
      if (xhr.status !== 200) { toast(d.error || "Kayıt yüklenemedi."); return; }
      medya = d.medya;
      talepler = talepler.map((x) => (x.id === t.id ? { ...x, taslakMedya: medya } : x));
      kayitYeri.replaceChildren();
      kayitYeri.hidden = true;
      medyaGoster();
      toast("Kayıt yüklendi. Şimdi teslim edebilirsin.");
    };
    xhr.onerror = () => { cubuk.remove(); toast("Bağlantı koptu, kayıt yüklenemedi. Tekrar dene."); };
    xhr.send(blob);
  }

  form.querySelectorAll(".cevap-turu button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.tur === tur) return;
    turSec(b.dataset.tur);
    if (b.dataset.tur !== "yazi" && medya?.tur === b.dataset.tur) { kayitYeri.hidden = true; aktifKaydedici?.kapat(); }
  }));
  turSec(tur);
  if (medya && medya.tur === tur) { kayitYeri.hidden = true; aktifKaydedici?.kapat(); medyaGoster(); }

  f("taslak").addEventListener("click", () => {
    if (textarea.value.trim() && !confirm("Yazdığın metin yapay zekâ yorumuyla değiştirilsin mi?")) return;
    textarea.value = t.kaynak.aiMetin;
    textarea.dispatchEvent(new Event("input"));
    textarea.focus();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (tur === "yazi" && textarea.value.trim().length < 40) { toast("Yazılı yorum en az birkaç cümle olmalı."); return; }
    if (tur !== "yazi" && medya?.tur !== tur) { toast(`Önce ${tur === "video" ? "videonu" : "ses kaydını"} kaydedip "Bu kaydı kullan"a bas.`); return; }
    if (!confirm(`${kisiAdi(t)} için ${tur === "yazi" ? "yazılı" : tur === "ses" ? "sesli" : "videolu"} yorumunu teslim edelim mi? Kullanıcıya e-posta gidecek.`)) return;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      // Yazılı teslimde önceden yüklenmiş bir kayıt varsa sunucu onu da ekler; yazılı seçildiyse kayıt istenmez.
      await postJson("/api/uzman/panel/teslim", { id: t.id, metin: textarea.value, tur });
      try { localStorage.removeItem(taslakKey); } catch {}
      toast("Yorum teslim edildi, kullanıcıya haber verildi.");
      await yukle();
      sec(t.id);
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });
  $("panelDetail").replaceChildren(node);
}

// --- Profil ---

function renderProfil() {
  const p = veri.profil;
  if (!p) { document.querySelector('[data-tab="profil"]').hidden = true; document.querySelector('[data-tab="hakedis"]').hidden = true; return; }
  $("profilAd").textContent = `${p.ad} · ${p.email}`;
  $("profilUnvan").value = p.unvan || "";
  $("profilTanitim").value = p.tanitim || "";
  $("profilVitrin").checked = Boolean(p.vitrinde);
  $("profilFoto").hidden = !p.resim;
  $("profilFotoBos").hidden = Boolean(p.resim);
  if (p.resim) $("profilFoto").src = p.resim;
  $("profilBolumler").replaceChildren(...veri.bolumListesi.map((b) => {
    const l = document.createElement("label");
    l.className = "uz-bolum";
    l.innerHTML = `<input type="checkbox" value="${b.id}" ${p.bolumler.includes(b.id) ? "checked" : ""} /><span></span>`;
    l.querySelector("span").textContent = b.ad;
    return l;
  }));
  const eksik = p.vitrinde && !p.gorunuyor ? (!p.resim ? " Kendi adınla görünmen için fotoğraf yükle." : !p.bolumler.length ? " Kendi adınla görünmen için bölüm seç." : "") : "";
  $("profilDurum").textContent = (p.bolumler.length ? `${p.bolumler.length} bölümde talep alıyorsun.` : "Henüz bölüm seçmedin; sana talep gelmez.") +
    (p.vitrinde && p.gorunuyor ? " Müşteriler seni kendi adınla da seçebiliyor." : eksik);
}
$("profilForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = await postJson("/api/uzman/profil", {
      unvan: $("profilUnvan").value, tanitim: $("profilTanitim").value, vitrinde: $("profilVitrin").checked,
      bolumler: [...$("profilBolumler").querySelectorAll("input:checked")].map((x) => x.value),
    });
    veri.profil = { ...veri.profil, ...d.profil };
    renderProfil();
    toast("Profilin kaydedildi.");
  } catch (error) { toast(error.message); }
});
$("profilFotoGirdi").addEventListener("change", async () => {
  const dosya = $("profilFotoGirdi").files[0];
  if (!dosya) return;
  try {
    const r = await fetch("/api/uzman/profil/foto", { method: "POST", headers: { "Content-Type": dosya.type }, credentials: "same-origin", body: dosya });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Fotoğraf yüklenemedi.");
    veri.profil.resim = d.resim;
    renderProfil();
    toast("Fotoğrafın güncellendi.");
  } catch (error) { toast(error.message); }
});

// --- Hakediş ---

function renderHakedis() {
  const h = veri.hakedis;
  if (!h) return;
  const kutu = (ad, deger, sinif = "") => { const d = document.createElement("div"); d.className = `uz-hk ${sinif}`; d.innerHTML = "<b></b><span></span>"; d.querySelector("b").textContent = deger; d.querySelector("span").textContent = ad; return d; };
  $("hkOzet").replaceChildren(kutu("Toplam hakediş", tl(h.toplam)), kutu("Ödenen", tl(h.odenen)), kutu("Ödenecek", tl(h.kalan), "kalan"), kutu("Teslim edilen cevap", String(h.adet)));
  $("hkNot").textContent = `Hakediş oranın %${h.oran}: her cevapta, o bölümün uzman değerlendirmesi fiyatının %${h.oran}'i hesabına yazılır.`;
  const benim = talepler.filter((t) => t.benim && t.hakedis).sort((a, b) => b.hakedis.tarih - a.hakedis.tarih);
  $("hkTablo").querySelector("tbody").replaceChildren(...benim.map((t) => {
    const tr = document.createElement("tr");
    [tarih(t.hakedis.tarih), t.bolumAdi, kisiAdi(t), { video: "🎬 Video", ses: "🎙️ Ses" }[t.cevap?.medya?.tur] || "✍️ Yazı"].forEach((v) => { const td = document.createElement("td"); td.textContent = v; tr.append(td); });
    const tutar = document.createElement("td"); tutar.className = "num"; tutar.textContent = tl(t.hakedis.tutar);
    const durum = document.createElement("td"); durum.className = t.hakedis.odemeId ? "arti" : ""; durum.textContent = t.hakedis.odemeId ? "Ödendi ✓" : "Bekliyor";
    tr.append(tutar, durum);
    return tr;
  }));
}

// --- Başlangıç ---

async function yukle() {
  const response = await fetch("/api/uzman/panel", { credentials: "same-origin" });
  if (response.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent("/uzman")}`);
    return false;
  }
  if (!response.ok) {
    $("panelDenied").hidden = false;
    $("panelSummary").textContent = "";
    return false;
  }
  veri = await response.json();
  talepler = veri.talepler;
  $("uzSekmeler").hidden = false;
  $("panelLayout").hidden = false;
  renderList();
  renderProfil();
  renderHakedis();
  return true;
}

(async () => {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (me?.user) $("topbarUser").textContent = me.user.name || me.user.email;
  if (await yukle()) {
    const hedef = location.hash.slice(1);
    if (["profil", "hakedis"].includes(hedef)) sekme(hedef);
    const ilk = talepler.find((t) => t.durum !== "hazir" && (t.benim || t.ustlenilebilir));
    if (ilk) sec(ilk.id);
  }
})();
