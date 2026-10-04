// Kupon kodları (Murat 2026-10-04; quiz.ist'teki gibi): yönetim panelinde üretilir, kullanıcı Kişisel Arşiv →
// Kontörüm'de kodu girer, kupon kadar kontör yüklenir. Her kod tek kullanımlıktır.
// Kayıtlar DATA_DIR/kupon/kuponlar.json'da: { KOD: { kontor, parti, notu, olusturma, olusturan, kullanan, kullanma } }.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { dataDir } = require("./ayarlar");

const dosya = path.join(dataDir, "kupon", "kuponlar.json");
// Karışan harfler (0/O, 1/I/L) yok.
const ALFABE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

let bellek = null;
let kuyruk = Promise.resolve();
function hepsi() {
  if (!bellek) {
    try { bellek = JSON.parse(fs.readFileSync(dosya, "utf8")); } catch { bellek = {}; }
  }
  return bellek;
}
function isle(fn) {
  const is = kuyruk.then(async () => {
    const sonuc = await fn(hepsi());
    await fs.promises.mkdir(path.dirname(dosya), { recursive: true });
    const gecici = `${dosya}.${process.pid}.tmp`;
    await fs.promises.writeFile(gecici, JSON.stringify(bellek));
    await fs.promises.rename(gecici, dosya);
    return sonuc;
  });
  kuyruk = is.catch(() => {});
  return is;
}

const hata = (message, status = 400) => Object.assign(new Error(message), { status });

function kodUret() {
  const b = crypto.randomBytes(12);
  let k = "";
  for (let i = 0; i < 12; i++) k += ALFABE[b[i] % ALFABE.length];
  return `${k.slice(0, 4)}-${k.slice(4, 8)}-${k.slice(8)}`;
}
// Girilen kodu saklanan biçime çevirir: büyük harf, boşluk/tire atılır, 4'erli gruplanır.
const kodNormalle = (ham) => {
  const k = String(ham || "").toLocaleUpperCase("en-US").replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return k.length === 12 ? `${k.slice(0, 4)}-${k.slice(4, 8)}-${k.slice(8)}` : "";
};

function uret({ kontor, adet, notu, olusturan }) {
  const miktar = Math.trunc(Number(kontor));
  const sayi = Math.trunc(Number(adet));
  if (!(miktar >= 1 && miktar <= 10000)) return Promise.reject(hata("Kupon değeri 1–10000 kontör olmalı."));
  if (!(sayi >= 1 && sayi <= 500)) return Promise.reject(hata("Bir seferde 1–500 kupon üretilebilir."));
  const parti = `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}-${miktar}`;
  return isle((k) => {
    const kodlar = [];
    while (kodlar.length < sayi) {
      const kod = kodUret();
      if (k[kod]) continue;
      k[kod] = { kontor: miktar, parti, notu: String(notu || "").trim().slice(0, 120), olusturma: Date.now(), olusturan, kullanan: null, kullanma: null };
      kodlar.push(kod);
    }
    return { parti, kontor: miktar, kodlar };
  });
}

const liste = () => Object.entries(hepsi()).map(([kod, v]) => ({ kod, ...v })).sort((a, b) => b.olusturma - a.olusturma || a.kod.localeCompare(b.kod));

const sil = (kodHam) => isle((k) => {
  const kod = kodNormalle(kodHam);
  if (!k[kod]) throw hata("Kupon bulunamadı.", 404);
  if (k[kod].kullanan) throw hata("Kullanılmış kupon silinemez.");
  delete k[kod];
});

// Deneme sınırı: kullanıcı başına saatte 10 yanlış kod.
const denemeler = new Map();
function denemeSiniri(userId) {
  const simdi = Date.now();
  const d = (denemeler.get(userId) || []).filter((t) => simdi - t < 3600 * 1000);
  denemeler.set(userId, d);
  return d;
}

// Kodu kullanılmış işaretler ve kontörü yükler. kontorDefteri dışarıdan verilir (kontor.js).
function kullan(user, kodHam, kontorDefteri) {
  if (denemeSiniri(user.id).length >= 10) return Promise.reject(hata("Çok fazla hatalı deneme. Bir saat sonra tekrar dene.", 429));
  const kod = kodNormalle(kodHam);
  const yanlis = (mesaj, status) => { denemeSiniri(user.id).push(Date.now()); return hata(mesaj, status); };
  if (!kod) return Promise.reject(yanlis("Kupon kodu 12 harf/rakamdan oluşur (örn. AB2C-DE3F-GH4J)."));
  return isle(async (k) => {
    const kupon = k[kod];
    if (!kupon) throw yanlis("Böyle bir kupon yok. Kodu kontrol et.", 404);
    if (kupon.kullanan) throw yanlis(kupon.kullanan.id === user.id ? "Bu kuponu zaten kullandın." : "Bu kupon daha önce kullanılmış.", 409);
    const hareket = await kontorDefteri.hareketEkle(user.id, { miktar: kupon.kontor, tur: "kupon", aciklama: `Kupon ${kod}`, ref: `kupon:${kod}` });
    kupon.kullanan = { id: user.id, eposta: user.email };
    kupon.kullanma = Date.now();
    return { kod, kontor: kupon.kontor, bakiye: hareket.bakiyeSonra };
  });
}

module.exports = { uret, liste, sil, kullan, kodNormalle };
