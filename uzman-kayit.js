// Uzman kadrosu (Murat 2026-10-04). İki tür kayıt, DATA_DIR/uzman/uzmanlar.json:
// - gercek: üyeler arasından yönetim panelinde uzman yapılan kişi. Hangi bölümlere yorum yazacağını, fotoğrafını,
//   unvanını ve tanıtımını kendi panelinden seçer; isterse kendi adıyla da vitrinde görünür (vitrinde). Hakediş oranı
//   ve açık/kapalı yöneticidedir.
// - sanal: müşterinin seçtiği karakter (resimler uzman/sanal/s1..8.webp, yeşil perdesi silinmiş). Adını, unvanını ve
//   hangi bölümlerde görüneceğini yönetici belirler. Talep, o bölümü seçmiş bütün gerçek uzmanlara gider; ilk
//   "Üstlen" diyen cevaplar. Yönetici bir karaktere sabit bir uzman atarsa talep yalnız ona gider.
// Fotoğraf yüklemeleri DATA_DIR/uzman/foto/<id>.jpg|png|webp.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { dataDir } = require("./ayarlar");

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

// Bir kart + bölüm için cevap verebilecek gerçek uzmanlar.
function cevaplayanlar(kartId, bolum) {
  const kart = bul(kartId);
  if (!kart) return [];
  const uygun = (g) => g && g.tip === "gercek" && g.aktif && g.bolumler.includes(bolum);
  if (kart.tip === "gercek") return uygun(kart) ? [kart] : [];
  if (kart.sabitUzman) return uygun(bul(kart.sabitUzman)) ? [bul(kart.sabitUzman)] : [];
  return gercekler().filter(uygun);
}

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

module.exports = { hepsi, bul, gercekler, kullanicininUzmanligi, uzmanMi, herkeseAcik, vitrin, vitrindeMi, cevaplayanlar, resimAdresi, ekle, sanalEkle, yoneticiGuncelle, sil, profilGuncelle, fotoKaydet, fotoYolu };
