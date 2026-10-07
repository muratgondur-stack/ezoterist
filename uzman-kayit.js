// Uzman kadrosu (Murat 2026-10-04). İki tür kayıt, DATA_DIR/uzman/uzmanlar.json:
// - gercek: üyeler arasından yönetim panelinde uzman yapılan kişi. Hangi bölümlere yorum yazacağını, fotoğrafını,
//   unvanını ve tanıtımını kendi panelinden seçer; isterse kendi adıyla da vitrinde görünür (vitrinde). Hakediş oranı
//   ve açık/kapalı yöneticidedir.
// - sanal: yapay zekâ karakteri (resimler uzman/sanal/s1..8.webp, yeşil perdesi silinmiş). Müşteri seçince yorum
//   hemen, karakterin promptu ve sesiyle yazılır; sipariş, bekleme ve hakediş yoktur (Murat 2026-10-04).
// Siparişler (48 saat) yalnız gerçek uzmanlara gider: kendi adıyla vitrinde olana ya da "havuz"a (o bölümü seçmiş
// bütün gerçek uzmanlar; ilk "Üstlen" diyen cevaplar).
// Fotoğraf yüklemeleri DATA_DIR/uzman/foto/<id>.jpg|png|webp.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { dataDir, SESLER } = require("./ayarlar");
const Promptlar = require("./uzman-promptlari");

const dizin = path.join(dataDir, "uzman");
const dosya = path.join(dizin, "uzmanlar.json");
const fotoDizini = path.join(dizin, "foto");
const SANAL_RESIMLER = 8;
const hata = (message, status = 400) => Object.assign(new Error(message), { status });

let bellek = null;
let kuyruk = Promise.resolve();
function hepsi() {
  if (!bellek) {
    try { bellek = JSON.parse(fs.readFileSync(dosya, "utf8")); } catch { bellek = []; }
    // İlk açılışta hazır sanal karakterler isimsiz ve kapalı eklenir; yönetici adlandırıp açar.
    if (!bellek.some((u) => u.tip === "sanal")) {
      for (let i = 1; i <= SANAL_RESIMLER; i++) {
        bellek.push({ id: crypto.randomBytes(5).toString("hex"), tip: "sanal", ad: "", unvan: "", tanitim: "", bolumler: [], aktif: false, hazirResim: `/uzman/sanal/s${i}.webp?v=1`, foto: null, sabitUzman: null, sira: i, olusturma: Date.now() });
      }
    }
    bellek.forEach((u) => { u.tip ||= "gercek"; });
    // Hazır karakterlerin boş alanları resme uygun varsayılanlarla doldurulur (elle girilenlere dokunulmaz).
    bellek.filter((u) => u.tip === "sanal" && u.hazirResim).forEach((u) => {
      const k = Promptlar.varsayilanKimlik(u.hazirResim);
      if (u.prompt === undefined) u.prompt = Promptlar.varsayilanPrompt(u.hazirResim);
      if (!k) return;
      if (!u.ad) u.ad = k.ad;
      if (!u.unvan) u.unvan = k.unvan;
      if (!u.bolumler.length) u.bolumler = [...k.bolumler];
      if (u.ses === undefined) u.ses = k.ses;
    });
    // Sanal karakterler sipariş almadığı için hepsi açılır (bir kez; sonra panelden kapatılabilir).
    bellek.filter((u) => u.tip === "sanal" && (u.surum || 0) < 2).forEach((u) => { u.aktif = Boolean(u.ad); u.surum = 2; });
  }
  return bellek;
}
function isle(fn) {
  const is = kuyruk.then(async () => {
    const sonuc = await fn(hepsi());
    await fs.promises.mkdir(dizin, { recursive: true });
    const gecici = `${dosya}.${process.pid}.tmp`;
    await fs.promises.writeFile(gecici, JSON.stringify(bellek, null, 2));
    await fs.promises.rename(gecici, dosya);
    return sonuc;
  });
  kuyruk = is.catch(() => {});
  return is;
}

const temiz = (v, en) => String(v || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, en);
const bul = (id) => hepsi().find((u) => u.id === id) || null;
const gercekler = () => hepsi().filter((u) => u.tip === "gercek");
const kullanicininUzmanligi = (userId) => gercekler().find((u) => u.userId === userId) || null;
const uzmanMi = (user) => Boolean(user && gercekler().some((u) => u.userId === user.id && u.aktif));
const resimAdresi = (u) => (u.foto ? `/uzman-foto/${u.id}?v=${u.foto.surum}` : u.hazirResim || "");

// Vitrinde (müşterinin seçim kartında) görünenler.
const vitrindeMi = (u) => u.aktif && Boolean(u.ad) && u.bolumler.length > 0 && Boolean(resimAdresi(u)) && (u.tip === "sanal" || u.vitrinde);
// Müşteriye görünen hâli (e-posta, oran gibi iç bilgiler yok). Sayfalar bunu /uzmanlar.js ile alır.
const herkeseAcik = (u) => ({ id: u.id, tip: u.tip, ad: u.ad, unvan: u.unvan, tanitim: u.tanitim, resim: resimAdresi(u), bolumler: u.bolumler, aktif: u.aktif });
const vitrin = () => hepsi().filter(vitrindeMi).sort((a, b) => (a.sira || 99) - (b.sira || 99)).map(herkeseAcik);

// Sipariş için cevap verebilecek gerçek uzmanlar: "havuz" = o bölümü seçmiş herkes; gerçek kart = yalnız o.
// Sanal karakterler sipariş almaz.
const HAVUZ = "havuz";
function cevaplayanlar(kartId, bolum) {
  const uygun = (g) => g && g.tip === "gercek" && g.aktif && g.bolumler.includes(bolum);
  if (kartId === HAVUZ) return gercekler().filter(uygun);
  const kart = bul(kartId);
  return kart?.tip === "gercek" && uygun(kart) ? [kart] : [];
}
// Bölüm başına sipariş alabilen gerçek uzman sayısı (sayfa "Uzman ekibimiz" kartını buna göre gösterir).
const havuzSayilari = () => {
  const s = {};
  gercekler().filter((g) => g.aktif).forEach((g) => g.bolumler.forEach((b) => { s[b] = (s[b] || 0) + 1; }));
  return s;
};

// --- Yönetici ---

function ekle({ userId, email, ad, unvan, oran }) {
  return isle((l) => {
    if (l.some((u) => u.userId === userId)) throw hata("Bu üye zaten uzman.");
    const u = {
      id: crypto.randomBytes(5).toString("hex"), tip: "gercek", userId, email, ad: temiz(ad, 40) || "Uzman", unvan: temiz(unvan, 50) || "Uzman",
      tanitim: "", bolumler: [], oran: Math.min(100, Math.max(0, Number(oran) || 50)), aktif: true, vitrinde: false, foto: null, olusturma: Date.now(),
    };
    l.push(u);
    return u;
  });
}
function sanalEkle() {
  return isle((l) => {
    const u = { id: crypto.randomBytes(5).toString("hex"), tip: "sanal", ad: "", unvan: "", tanitim: "", bolumler: [], aktif: false, hazirResim: "", foto: null, sabitUzman: null, sira: l.filter((x) => x.tip === "sanal").length + 1, olusturma: Date.now() };
    l.push(u);
    return u;
  });
}
function yoneticiGuncelle(id, g, gecerliBolumler) {
  return isle((l) => {
    const u = l.find((x) => x.id === id);
    if (!u) throw hata("Uzman bulunamadı.", 404);
    if (g.ad !== undefined) u.ad = temiz(g.ad, 40);
    if (g.unvan !== undefined) u.unvan = temiz(g.unvan, 50);
    if (g.tanitim !== undefined) u.tanitim = temiz(g.tanitim, 400);
    if (g.aktif !== undefined) u.aktif = Boolean(g.aktif);
    // Yazılı cevabın seslendirileceği ses (karakterin cinsiyetine uygun); boş = bölümün sesi.
    if (g.ses !== undefined) u.ses = SESLER.includes(g.ses) ? g.ses : "";
    // Karakter promptu: boş gönderilirse resmin varsayılanına döner.
    if (u.tip === "sanal" && g.prompt !== undefined) u.prompt = String(g.prompt || "").replace(/[\u0000-\u0008]/g, "").trim().slice(0, 2500) || Promptlar.varsayilanPrompt(u.hazirResim);
    if (Array.isArray(g.bolumler)) u.bolumler = g.bolumler.filter((b) => gecerliBolumler.includes(b));
    if (u.tip === "gercek" && g.oran !== undefined) u.oran = Math.min(100, Math.max(0, Number(g.oran) || 0));
    if (u.tip === "sanal" && g.sabitUzman !== undefined) {
      const s = g.sabitUzman ? l.find((x) => x.id === g.sabitUzman && x.tip === "gercek") : null;
      u.sabitUzman = s ? s.id : null;
    }
    if (u.tip === "sanal" && g.sira !== undefined) u.sira = Math.max(1, Math.min(99, Number(g.sira) || 1));
    if (u.tip === "sanal" && u.aktif && !u.ad) throw hata("Karakteri açmadan önce bir isim ver.");
    return u;
  });
}
function sil(id) {
  return isle((l) => {
    const i = l.findIndex((x) => x.id === id && x.tip === "sanal");
    if (i < 0) throw hata("Yalnız sanal karakterler silinebilir; gerçek uzmanı kapatabilirsin.", 400);
    l.splice(i, 1);
    l.forEach((x) => { if (x.sabitUzman === id) x.sabitUzman = null; });
  });
}

// Gerçek uzmanı listeden çıkarır (üyeliği kalır). Kayıt ve fotoğraf DATA_DIR/silinenler/uzmanlar/ altına taşınır;
// teslim edilmiş cevaplar ve hakedişler taleplerde durur.
function gercekCikar(id) {
  return isle(async (l) => {
    const i = l.findIndex((x) => x.id === id && x.tip === "gercek");
    if (i < 0) throw hata("Uzman bulunamadı.", 404);
    const u = l[i];
    const yedek = path.join(dataDir, "silinenler", "uzmanlar");
    await fs.promises.mkdir(yedek, { recursive: true });
    await fs.promises.writeFile(path.join(yedek, `${u.id}-${Date.now()}.json`), JSON.stringify(u, null, 2));
    if (u.foto) await fs.promises.rename(path.join(fotoDizini, `${u.id}.${u.foto.uzanti}`), path.join(yedek, `${u.id}.${u.foto.uzanti}`)).catch(() => {});
    l.splice(i, 1);
    l.forEach((x) => { if (x.sabitUzman === id) x.sabitUzman = null; });
    return u;
  });
}

// --- Uzmanın kendisi ---

function profilGuncelle(userId, { unvan, tanitim, bolumler, vitrinde }, gecerliBolumler) {
  return isle((l) => {
    const u = l.find((x) => x.tip === "gercek" && x.userId === userId);
    if (!u) throw hata("Uzman kaydın bulunamadı.", 404);
    if (unvan !== undefined) u.unvan = temiz(unvan, 50) || u.unvan;
    if (tanitim !== undefined) u.tanitim = temiz(tanitim, 400);
    if (Array.isArray(bolumler)) u.bolumler = bolumler.filter((b) => gecerliBolumler.includes(b));
    if (vitrinde !== undefined) u.vitrinde = Boolean(vitrinde);
    return u;
  });
}

const FOTO_TURLERI = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
async function fotoKaydet(id, tur, veri) {
  const uzanti = FOTO_TURLERI[tur];
  if (!uzanti) throw hata("Fotoğraf JPG, PNG ya da WEBP olmalı.");
  if (!Buffer.isBuffer(veri) || veri.length < 2000 || veri.length > 3 * 1024 * 1024) throw hata("Fotoğraf en çok 3 MB olabilir.");
  await fs.promises.mkdir(fotoDizini, { recursive: true });
  return isle(async (l) => {
    const u = l.find((x) => x.id === id);
    if (!u) throw hata("Uzman bulunamadı.", 404);
    if (u.foto) await fs.promises.rm(path.join(fotoDizini, `${u.id}.${u.foto.uzanti}`), { force: true });
    await fs.promises.writeFile(path.join(fotoDizini, `${u.id}.${uzanti}`), veri);
    u.foto = { uzanti, surum: Date.now().toString(36) };
    return u;
  });
}
const fotoYolu = (id) => {
  const u = bul(String(id || ""));
  return u?.foto ? path.join(fotoDizini, `${u.id}.${u.foto.uzanti}`) : null;
};

module.exports = { gercekCikar, HAVUZ, havuzSayilari, hepsi, bul, gercekler, kullanicininUzmanligi, uzmanMi, herkeseAcik, vitrin, vitrindeMi, cevaplayanlar, resimAdresi, ekle, sanalEkle, yoneticiGuncelle, sil, profilGuncelle, fotoKaydet, fotoYolu };
