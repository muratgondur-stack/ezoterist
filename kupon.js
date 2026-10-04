// Kupon kodları (Murat 2026-10-04). İki tür:
// 1) Yönetici kuponu: yönetim panelinde üretilir, kodu giren kontör kazanır.
// 2) Hediye kupon: üye kartla satın alır (PayTR), üç tasarımdan birini seçer, arkadaşına bizim üzerimizden e-postayla
//    gider. Arkadaş 30 gün içinde kullanmazsa kontör satın alan üyenin bakiyesine devredilir; ikisine de e-posta gider.
// Kayıtlar DATA_DIR/kupon/kuponlar.json'da; hediye görselleri DATA_DIR/kupon/resim/<KOD>.jpg.
// Hediye durumları: bekliyor (ödeme yapılmadı, kullanılamaz) → aktif → kullanildi | devredildi.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { dataDir } = require("./ayarlar");
const { epostaYolla, htmlKacis } = require("./eposta");

const dosya = path.join(dataDir, "kupon", "kuponlar.json");
const resimDizini = path.join(dataDir, "kupon", "resim");
// Karışan harfler (0/O, 1/I/L) yok.
const ALFABE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const HEDIYE_SURESI = 30 * 86400000;
const SABLONLAR = ["a", "b", "c"];
const SITE = "https://ezoter.ist";

let bellek = null;
let kuyruk = Promise.resolve();
function hepsi() {
  if (!bellek) {
    try { bellek = JSON.parse(fs.readFileSync(dosya, "utf8")); } catch { bellek = {}; }
  }
  return bellek;
}
// tazele: başka bir sürecin yazdıklarını da görmek için önce diskten yeniden okunur.
function isle(fn, { tazele = false } = {}) {
  const is = kuyruk.then(async () => {
    if (tazele) bellek = null;
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
const yeniKod = (k) => { let kod; do kod = kodUret(); while (k[kod]); return kod; };

// --- Yönetici kuponları ---

function uret({ kontor, adet, notu, olusturan }) {
  const miktar = Math.trunc(Number(kontor));
  const sayi = Math.trunc(Number(adet));
  if (!(miktar >= 1 && miktar <= 10000)) return Promise.reject(hata("Kupon değeri 1–10000 kontör olmalı."));
  if (!(sayi >= 1 && sayi <= 500)) return Promise.reject(hata("Bir seferde 1–500 kupon üretilebilir."));
  const parti = `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}-${miktar}`;
  return isle((k) => {
    const kodlar = [];
    while (kodlar.length < sayi) {
      const kod = yeniKod(k);
      k[kod] = { kontor: miktar, parti, notu: String(notu || "").trim().slice(0, 120), olusturma: Date.now(), olusturan, kullanan: null, kullanma: null };
      kodlar.push(kod);
    }
    return { parti, kontor: miktar, kodlar };
  });
}

// Panel listesi: ödemesi yapılmamış hediye taslakları gösterilmez.
const liste = () => Object.entries(hepsi()).filter(([, v]) => !v.hediye || v.hediye.durum !== "bekliyor")
  .map(([kod, v]) => ({ kod, ...v })).sort((a, b) => b.olusturma - a.olusturma || a.kod.localeCompare(b.kod));

const sil = (kodHam) => isle((k) => {
  const kod = kodNormalle(kodHam);
  if (!k[kod]) throw hata("Kupon bulunamadı.", 404);
  if (k[kod].hediye) throw hata("Hediye kuponlar silinemez; kullanılmazsa 30 gün sonra gönderenin bakiyesine döner.");
  if (k[kod].kullanan) throw hata("Kullanılmış kupon silinemez.");
  delete k[kod];
});

// --- E-postalar ---

const tlYaz = (n) => new Intl.NumberFormat("tr-TR").format(n);
const tarihYaz = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date(ms));

function kuponEpostasi({ baslik, govde, resim, dugme, alt }) {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#070914;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:24px 14px;color:#f3efe6">
    <p style="margin:0 0 14px;text-align:center;font-size:12px;letter-spacing:3px;color:#f3c26b">EZOTER.IST</p>
    ${resim ? `<a href="${dugme?.url || SITE}"><img src="${resim}" alt="Ezoter.ist hediye kupon" width="612" style="display:block;width:100%;height:auto;border-radius:14px;border:1px solid #3a3020"></a>` : ""}
    <h1 style="margin:22px 0 10px;font-size:21px;color:#f3c26b;font-family:Georgia,serif">${baslik}</h1>
    <div style="font-size:15px;line-height:1.65;color:#e9e4d8">${govde}</div>
    ${dugme ? `<p style="margin:22px 0 6px"><a href="${dugme.url}" style="display:inline-block;background:#f3c26b;color:#070914;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:800">${dugme.yazi}</a></p>` : ""}
    <p style="margin:26px 0 0;font-size:11px;line-height:1.6;color:#8d8778">${alt || "Ezoter.ist · Vücut Destek Sistem Medikal Tic. Ltd. Şti. · bilgi@ezoter.ist"}</p>
  </div></body></html>`;
}

async function arkadasaGonder(kod, kupon) {
  const h = kupon.hediye;
  const kimden = htmlKacis(h.gonderenAd);
  const url = `${SITE}/kupon/${kod}`;
  return epostaYolla({
    kime: h.kimeEposta,
    konu: `${h.gonderenAd} sana Ezoter.ist hediye kuponu gönderdi 🎁`,
    metin: `Merhaba ${h.kimeAd},\n\n${h.gonderenAd} sana Ezoter.ist'te kullanabileceğin ${kupon.kontor} kontörlük bir hediye kupon gönderdi.${h.not ? `\n\nNotu: "${h.not}"` : ""}\n\nKupon kodu: ${kod}\nKullanmak için: ${url}\n\nKupon ${tarihYaz(h.sonGun)} tarihine kadar geçerlidir; bu tarihe kadar kullanılmazsa kontörler gönderene geri döner.\n\nEzoter.ist`,
    html: kuponEpostasi({
      baslik: `${htmlKacis(h.kimeAd)}, sana bir hediye var ✨`,
      resim: `${SITE}/kupon/resim/${kod}.jpg`,
      govde: `<p><b>${kimden}</b> sana Ezoter.ist'te astroloji, tarot, fal, rüya yorumu ve daha fazlası için kullanabileceğin <b>${tlYaz(kupon.kontor)} kontörlük</b> bir hediye kupon gönderdi.</p>
        ${h.not ? `<p style="font-style:italic;color:#f3d58a">“${htmlKacis(h.not)}”</p>` : ""}
        <p>Kupon kodun: <b style="font-family:Menlo,monospace;letter-spacing:2px;color:#fff">${kod}</b></p>
        <p style="font-size:13px;color:#b9b2a3">Aşağıdaki düğmeye bas; üye değilsen ücretsiz üye ol, kod otomatik dolar. Kupon <b>${tarihYaz(h.sonGun)}</b> tarihine kadar geçerli; bu tarihe kadar kullanılmazsa kontörler gönderene geri döner.</p>`,
      dugme: { url, yazi: "Kuponu kullan" },
      alt: `Bu e-postayı ${kimden} ezoter.ist üzerinden senin için gönderdi. Ezoter.ist · bilgi@ezoter.ist`,
    }),
  });
}

function gonderenBilgisi(kod, kupon, olay) {
  const h = kupon.hediye;
  const kime = htmlKacis(h.kimeAd);
  const metinler = {
    gonderildi: {
      konu: `Hediye kuponun ${h.kimeAd} kişisine gönderildi 🎁`,
      baslik: "Hediyen yola çıktı ✨",
      govde: `<p><b>${tlYaz(kupon.kontor)} kontörlük</b> hediye kuponun ödemesi alındı ve <b>${kime}</b> (${htmlKacis(h.kimeEposta)}) adresine gönderildi.</p><p>Kupon kodu: <b style="font-family:Menlo,monospace">${kod}</b>. ${kime} kuponu <b>${tarihYaz(h.sonGun)}</b> tarihine kadar kullanmazsa ${tlYaz(kupon.kontor)} kontör senin bakiyene geçer.</p>`,
    },
    kullanildi: {
      konu: `${h.kimeAd} hediye kuponunu kullandı 💛`,
      baslik: "Hediyen ulaştı 💛",
      govde: `<p><b>${kime}</b> gönderdiğin <b>${tlYaz(kupon.kontor)} kontörlük</b> hediye kuponu kullandı. Güzel bir hediye için teşekkür ederiz!</p>`,
    },
    devredildi: {
      konu: `Hediye kuponun kullanılmadı: ${kupon.kontor} kontör bakiyene eklendi`,
      baslik: "Kontörlerin bakiyene geçti",
      govde: `<p><b>${kime}</b> için gönderdiğin hediye kupon (${kod}) 30 gün içinde kullanılmadı. <b>${tlYaz(kupon.kontor)} kontör</b> senin bakiyene eklendi; Kişisel Arşiv → Kontörüm'de görebilirsin.</p>`,
    },
  }[olay];
  return epostaYolla({
    kime: h.gonderenEposta,
    konu: metinler.konu,
    metin: metinler.govde.replace(/<[^>]+>/g, ""),
    html: kuponEpostasi({ baslik: metinler.baslik, govde: metinler.govde, resim: olay === "gonderildi" ? `${SITE}/kupon/resim/${kod}.jpg` : null, dugme: { url: `${SITE}/arsiv#kontor`, yazi: "Kişisel Arşiv'e git" } }),
  });
}

function arkadasaDevirBilgisi(kod, kupon) {
  const h = kupon.hediye;
  return epostaYolla({
    kime: h.kimeEposta,
    konu: "Ezoter.ist hediye kuponunun süresi doldu",
    metin: `Merhaba ${h.kimeAd}, ${h.gonderenAd} kişisinin sana gönderdiği ${kupon.kontor} kontörlük hediye kuponun (${kod}) 30 günlük süresi doldu ve kontörler gönderene geri döndü.`,
    html: kuponEpostasi({
      baslik: "Hediye kuponunun süresi doldu",
      govde: `<p>Merhaba ${htmlKacis(h.kimeAd)}, <b>${htmlKacis(h.gonderenAd)}</b> kişisinin sana gönderdiği <b>${tlYaz(kupon.kontor)} kontörlük</b> hediye kuponun (${kod}) 30 günlük süresi doldu; kontörler gönderene geri döndü.</p><p>Ezoter.ist'i yine de ücretsiz deneyebilirsin: astroloji, tarot, rüya yorumu ve daha fazlası seni bekliyor.</p>`,
      dugme: { url: SITE, yazi: "Ezoter.ist'e göz at" },
    }),
  });
}

// --- Hediye kupon ---

const temizMetin = (v, en) => String(v || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, en);

// 1. adım: üye tasarımı ve bilgileri seçer, kod ayrılır (ödeme yapılana kadar kullanılamaz).
function hediyeHazirla(user, { kontor, tutar, sablon, kimeAd, kimeEposta, not }) {
  const ad = temizMetin(kimeAd, 40);
  const eposta = String(kimeEposta || "").trim().toLowerCase().slice(0, 120);
  if (!ad) return Promise.reject(hata("Arkadaşının adını yaz."));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) return Promise.reject(hata("Arkadaşının e-posta adresini kontrol et."));
  if (eposta === String(user.email).toLowerCase()) return Promise.reject(hata("Hediye kuponu kendine gönderemezsin; kontör için paket alabilirsin."));
  if (!SABLONLAR.includes(sablon)) return Promise.reject(hata("Bir kupon tasarımı seç."));
  return isle((k) => {
    // Kullanıcının bir günden eski, ödenmemiş taslakları temizlenir; aynı anda en çok 5 taslak.
    const taslaklar = Object.entries(k).filter(([, v]) => v.hediye?.durum === "bekliyor" && v.hediye.gonderenId === user.id);
    taslaklar.filter(([, v]) => Date.now() - v.olusturma > 86400000).forEach(([kod]) => { delete k[kod]; fs.promises.rm(path.join(resimDizini, `${kod}.jpg`), { force: true }); });
    if (taslaklar.filter(([, v]) => Date.now() - v.olusturma <= 86400000).length >= 5) throw hata("Çok fazla tamamlanmamış hediye var. Biraz sonra tekrar dene.", 429);
    const kod = yeniKod(k);
    k[kod] = {
      kontor, parti: "hediye", notu: `Hediye · ${user.email} → ${eposta}`, olusturma: Date.now(), olusturan: user.email, kullanan: null, kullanma: null,
      hediye: { durum: "bekliyor", tutar, sablon, gonderenId: user.id, gonderenEposta: user.email, gonderenAd: temizMetin(user.name, 40) || "Bir arkadaşın", kimeAd: ad, kimeEposta: eposta, not: temizMetin(not, 140) },
    };
    return { kod, kontor, kimden: k[kod].hediye.gonderenAd };
  });
}

// 2. adım: tarayıcıda çizilen görsel kaydedilir (yalnız JPEG, en çok 2 MB).
async function hediyeResmi(user, kodHam, resim) {
  const kod = kodNormalle(kodHam);
  const kupon = hepsi()[kod];
  if (!kupon?.hediye || kupon.hediye.gonderenId !== user.id || kupon.hediye.durum !== "bekliyor") throw hata("Hediye bulunamadı.", 404);
  if (!Buffer.isBuffer(resim) || resim.length < 5000 || resim.length > 2 * 1024 * 1024 || resim[0] !== 0xff || resim[1] !== 0xd8) throw hata("Kupon görseli oluşturulamadı. Sayfayı yenileyip tekrar dene.");
  await fs.promises.mkdir(resimDizini, { recursive: true });
  await fs.promises.writeFile(path.join(resimDizini, `${kod}.jpg`), resim);
  return kupon;
}

// Ödeme bildirimi geldiğinde (odeme.js): kupon etkinleşir, arkadaşa ve gönderene e-posta gider.
async function hediyeEtkinlestir(kodHam, oid) {
  const kod = kodNormalle(kodHam);
  const kupon = await isle((k) => {
    const v = k[kod];
    if (!v?.hediye || v.hediye.durum !== "bekliyor") return null;
    const simdi = Date.now();
    Object.assign(v.hediye, { durum: "aktif", oid, aktiflesme: simdi, sonGun: simdi + HEDIYE_SURESI });
    return JSON.parse(JSON.stringify(v));
  });
  if (!kupon) return;
  // E-postalar beklenmez: PayTR bildirimine hemen "OK" dönülür.
  arkadasaGonder(kod, kupon)
    .then((gitti) => isle((k) => { if (k[kod]) k[kod].hediye.eposta = gitti ? Date.now() : null; }))
    .catch((error) => console.error("Hediye kupon e-postası:", error));
  gonderenBilgisi(kod, kupon, "gonderildi");
}

// Üyenin gönderdiği hediyeler (Kişisel Arşiv).
const hediyelerim = (userId) => Object.entries(hepsi())
  .filter(([, v]) => v.hediye?.gonderenId === userId && v.hediye.durum !== "bekliyor")
  .map(([kod, v]) => ({ kod, kontor: v.kontor, tutar: v.hediye.tutar, kimeAd: v.hediye.kimeAd, kimeEposta: v.hediye.kimeEposta, durum: v.hediye.durum, aktiflesme: v.hediye.aktiflesme, sonGun: v.hediye.sonGun, kullanma: v.kullanma, devir: v.hediye.devir || null, epostaGitti: Boolean(v.hediye.eposta) }))
  .sort((a, b) => b.aktiflesme - a.aktiflesme);

// Herkese açık kupon sayfası (/kupon/KOD) için: yalnız ödenmiş hediye kuponlar.
function hediyeBilgisi(kodHam) {
  const kod = kodNormalle(kodHam);
  const v = hepsi()[kod];
  if (!v?.hediye || v.hediye.durum === "bekliyor") return null;
  return { kod, kontor: v.kontor, sablon: v.hediye.sablon, kimden: v.hediye.gonderenAd, kimeAd: v.hediye.kimeAd, not: v.hediye.not, durum: v.hediye.durum, sonGun: v.hediye.sonGun };
}
const hediyeResimYolu = (kodHam) => {
  const b = hediyeBilgisi(kodHam);
  return b ? path.join(resimDizini, `${b.kod}.jpg`) : null;
};

// Süresi dolan hediyeler gönderenin bakiyesine devredilir. Saatte bir ve açılışta çalışır.
async function devirleriYap(defter) {
  const devredilenler = await isle(async (k) => {
    const sonuc = [];
    for (const [kod, v] of Object.entries(k)) {
      if (v.hediye?.durum !== "aktif" || v.kullanan || v.hediye.sonGun > Date.now()) continue;
      await defter.hareketEkle(v.hediye.gonderenId, { miktar: v.kontor, tur: "iade", aciklama: `Kullanılmayan hediye kupon (${v.hediye.kimeAd}) · ${kod}`, ref: `hediye-devir:${kod}` });
      v.hediye.durum = "devredildi";
      v.hediye.devir = Date.now();
      sonuc.push([kod, JSON.parse(JSON.stringify(v))]);
    }
    return sonuc;
  }, { tazele: true });
  for (const [kod, v] of devredilenler) {
    gonderenBilgisi(kod, v, "devredildi");
    arkadasaDevirBilgisi(kod, v);
  }
  return devredilenler.length;
}
function devirZamanlayici(defter) {
  const calistir = () => devirleriYap(defter).catch((error) => console.error("Hediye kupon devri:", error));
  setTimeout(calistir, 60 * 1000);
  setInterval(calistir, 60 * 60 * 1000).unref();
}

// --- Kod kullanma ---

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
    if (!kupon || kupon.hediye?.durum === "bekliyor") throw yanlis("Böyle bir kupon yok. Kodu kontrol et.", 404);
    if (kupon.kullanan) throw yanlis(kupon.kullanan.id === user.id ? "Bu kuponu zaten kullandın." : "Bu kupon daha önce kullanılmış.", 409);
    if (kupon.hediye?.durum === "devredildi") throw hata("Bu hediye kuponun süresi dolmuş; kontörler gönderene geri döndü.", 410);
    if (kupon.hediye?.gonderenId === user.id) throw hata("Kendi gönderdiğin hediye kuponu kullanamazsın.");
    const aciklama = kupon.hediye ? `Hediye kupon · ${kupon.hediye.gonderenAd} · ${kod}` : `Kupon ${kod}`;
    const hareket = await kontorDefteri.hareketEkle(user.id, { miktar: kupon.kontor, tur: "kupon", aciklama, ref: `kupon:${kod}` });
    kupon.kullanan = { id: user.id, eposta: user.email };
    kupon.kullanma = Date.now();
    if (kupon.hediye) {
      kupon.hediye.durum = "kullanildi";
      gonderenBilgisi(kod, JSON.parse(JSON.stringify(kupon)), "kullanildi");
    }
    return { kod, kontor: kupon.kontor, bakiye: hareket.bakiyeSonra, hediye: Boolean(kupon.hediye) };
  });
}

module.exports = { SABLONLAR, HEDIYE_SURESI, uret, liste, sil, kullan, kodNormalle, hediyeHazirla, hediyeResmi, hediyeEtkinlestir, hediyelerim, hediyeBilgisi, hediyeResimYolu, devirleriYap, devirZamanlayici };
