// PayTR ile kontör satışı (Murat 2026-10-04; quiz.ist'teki hattın aynısı). Mağaza bilgileri yönetim panelinden
// girilir, DATA_DIR/yonetim/paytr.json'da (yalnız sahibinin okuyabileceği izinle) saklanır; panele gizli anahtarın
// tamamı hiç gönderilmez. Siparişler DATA_DIR/odeme/siparisler.json'da.
// Token imzası: base64(HMAC-SHA256(merchant_key, merchant_id + user_ip + merchant_oid + email + payment_amount
//   + user_basket + no_installment + max_installment + currency + test_mode + merchant_salt)).
// Bildirim imzası: base64(HMAC-SHA256(merchant_key, merchant_oid + merchant_salt + status + total_amount)).
// PayTR'nin kuralı: dönüş adresine güvenilmez; kontör YALNIZ bildirim isteğinde eklenir ve o isteğe düz "OK" dönülür.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Ayarlar = require("./ayarlar");

const { dataDir } = Ayarlar;
const ayarDosyasi = path.join(dataDir, "yonetim", "paytr.json");
const siparisDosyasi = path.join(dataDir, "odeme", "siparisler.json");

const TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
const ODEME_SAYFASI = "https://www.paytr.com/odeme/guvenli/";
const BILDIRIM_YOLU = "/api/odeme/paytr/bildirim";
// Kontör paketleri (TL). Kontör miktarı = tutar / "1 kontörün TL değeri" (Fiyatlar).
const PAKETLER = [50, 100, 250, 500];

const paketKontoru = (tutar) => Math.round(tutar / (Ayarlar.get("fiyat.kontorTL") || 1));
const paketler = () => PAKETLER.map((tutar) => ({ tutar, kontor: paketKontoru(tutar) }));

async function atomikYaz(dosya, veri, mode) {
  await fs.promises.mkdir(path.dirname(dosya), { recursive: true });
  const gecici = `${dosya}.${process.pid}.tmp`;
  await fs.promises.writeFile(gecici, JSON.stringify(veri), mode ? { mode } : undefined);
  await fs.promises.rename(gecici, dosya);
}

// --- Mağaza ayarları ---

let ayarBellek = null;
function ayar() {
  if (!ayarBellek) {
    try { ayarBellek = JSON.parse(fs.readFileSync(ayarDosyasi, "utf8")); } catch { ayarBellek = {}; }
  }
  const temiz = (v) => (typeof v === "string" ? v.trim() : "");
  const mod = ayarBellek.mod === "canli" ? "canli" : "test";
  return { magazaNo: temiz(ayarBellek.magazaNo), parola: temiz(ayarBellek.parola), gizli: temiz(ayarBellek.gizli), mod, testMode: mod === "canli" ? "0" : "1" };
}
const hazir = (a = ayar()) => Boolean(a.magazaNo && a.parola && a.gizli);
// Test modunda yalnız yönetici satın alabilir (gerçek para çekilmez); canlıda herkes.
const acikMi = (user) => hazir() && (ayar().mod === "canli" || Ayarlar.yoneticiMi(user));

async function ayarKaydet({ magazaNo, parola, gizli, mod, temizle }) {
  const yeni = temizle ? {} : { ...ayar() };
  delete yeni.testMode;
  const tek = (v) => String(v || "").trim();
  if (!temizle) {
    if (tek(magazaNo)) {
      if (!/^\d{3,12}$/.test(tek(magazaNo))) throw Object.assign(new Error("Mağaza no yalnız rakamlardan oluşur."), { status: 400 });
      yeni.magazaNo = tek(magazaNo);
    }
    for (const [ad, deger] of [["parola", parola], ["gizli", gizli]]) {
      if (!tek(deger)) continue;
      if (/\s/.test(tek(deger)) || tek(deger).length < 8 || tek(deger).length > 64) throw Object.assign(new Error("Parola ve gizli anahtar boşluksuz, 8–64 karakter olmalı. Yalnız değerin kendisini yapıştır."), { status: 400 });
      yeni[ad] = tek(deger);
    }
    if (mod === "canli" || mod === "test") yeni.mod = mod;
  }
  await atomikYaz(ayarDosyasi, yeni, 0o600);
  ayarBellek = yeni;
}

// Panel için: parola ve gizli anahtarın yalnız son 3 karakteri.
const ayarOzeti = (taban) => {
  const a = ayar();
  return { magazaNo: a.magazaNo, parolaSon: a.parola ? a.parola.slice(-3) : "", gizliSon: a.gizli ? a.gizli.slice(-3) : "", mod: a.mod, hazir: hazir(a), bildirimAdresi: taban + BILDIRIM_YOLU };
};

// --- Siparişler ---

let siparisBellek = null;
let siparisKuyruk = Promise.resolve();
function siparisler() {
  if (!siparisBellek) {
    try { siparisBellek = JSON.parse(fs.readFileSync(siparisDosyasi, "utf8")); } catch { siparisBellek = {}; }
  }
  return siparisBellek;
}
// Sipariş değişiklikleri sıraya alınır (aynı bildirim iki kez gelirse ikincisi işlenmiş kaydı görür).
function siparisIsle(fn) {
  const is = siparisKuyruk.then(async () => {
    const sonuc = await fn(siparisler());
    await atomikYaz(siparisDosyasi, siparisBellek);
    return sonuc;
  });
  siparisKuyruk = is.catch(() => {});
  return is;
}
const sonSiparisler = (adet = 100) => Object.values(siparisler()).sort((a, b) => b.tarih - a.tarih).slice(0, adet);

// --- PayTR ---

const kurus = (tl) => String(Math.round(Number(tl) * 100));
const siparisNo = (userId) => `ez${String(userId).replace(/[^A-Za-z0-9]/g, "").slice(0, 16)}${Date.now()}`.slice(0, 64);
// PayTR e-postada Türkçe harf kabul etmiyor.
const asciiEposta = (e) => String(e || "").replace(/ı/g, "i").replace(/İ/g, "I").replace(/ğ/g, "g").replace(/Ğ/g, "G").replace(/ş/g, "s").replace(/Ş/g, "S")
  .replace(/ç/g, "c").replace(/Ç/g, "C").replace(/ö/g, "o").replace(/Ö/g, "O").replace(/ü/g, "u").replace(/Ü/g, "U").replace(/[^\x20-\x7E]/g, "").slice(0, 100);
const istemciIp = (request) => String(request.headers["x-forwarded-for"] || "").split(",")[0].trim() || String(request.socket.remoteAddress || "").replace(/^::ffff:/, "") || "127.0.0.1";
const siteTabani = (request) => {
  const host = String(request.headers.host || "");
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? `http://${host}` : "https://ezoter.ist";
};

async function tokenAl(a, { oid, eposta, tutar, ip, ad, urun, okUrl, failUrl }) {
  const odemeTutari = kurus(tutar);
  const sepet = Buffer.from(JSON.stringify([[urun.slice(0, 100), Number(tutar).toFixed(2), 1]])).toString("base64");
  const taksitYok = "1";
  const enCokTaksit = "0";
  const paraBirimi = "TL";
  const imza = crypto.createHmac("sha256", a.parola)
    .update(a.magazaNo + ip + oid + eposta + odemeTutari + sepet + taksitYok + enCokTaksit + paraBirimi + a.testMode + a.gizli, "utf8").digest("base64");
  const form = new URLSearchParams({
    merchant_id: a.magazaNo, user_ip: ip, merchant_oid: oid, email: eposta, payment_amount: odemeTutari, paytr_token: imza,
    user_basket: sepet, debug_on: "1", no_installment: taksitYok, max_installment: enCokTaksit, currency: paraBirimi,
    test_mode: a.testMode, user_name: String(ad || "Ezoterist Uyesi").slice(0, 60), user_address: "Dijital hizmet - ezoter.ist",
    user_phone: "0000000000", merchant_ok_url: okUrl, merchant_fail_url: failUrl, timeout_limit: "30", lang: "tr",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString(), signal: AbortSignal.timeout(30000) });
  const metin = await r.text();
  let veri;
  try { veri = JSON.parse(metin); } catch { veri = { status: "failed", reason: metin.slice(0, 300) }; }
  return { httpDurum: r.status, veri };
}

// Kullanıcı paket seçer: sipariş kaydı + PayTR oturumu; dönen güvenli ödeme adresine yönlendirilir.
async function odemeBaslat(request, user, tutar) {
  if (!acikMi(user)) throw Object.assign(new Error("Ödeme henüz açık değil."), { status: 503 });
  if (!PAKETLER.includes(tutar)) throw Object.assign(new Error("Geçersiz paket."), { status: 400 });
  const a = ayar();
  const oid = siparisNo(user.id);
  const kontor = paketKontoru(tutar);
  const eposta = asciiEposta(user.email) || `${user.id}@ezoter.ist`;
  await siparisIsle((s) => {
    s[oid] = { oid, userId: user.id, eposta, tutar, kontor, mod: a.mod, durum: "basladi", tarih: Date.now() };
  });
  const taban = siteTabani(request);
  const { httpDurum, veri } = await tokenAl(a, {
    oid, eposta, tutar, ip: istemciIp(request), ad: user.name, urun: `${kontor} kontor paketi`,
    okUrl: `${taban}/arsiv?odeme=basarili#kontor`, failUrl: `${taban}/arsiv?odeme=hata#kontor`,
  });
  if (veri?.status !== "success" || !veri?.token) {
    const mesaj = `${veri?.reason || "PayTR ödeme oturumu açılamadı"} (HTTP ${httpDurum})`;
    await siparisIsle((s) => { Object.assign(s[oid], { durum: "acilamadi", hata: mesaj.slice(0, 300) }); });
    throw Object.assign(new Error(mesaj), { status: 502 });
  }
  await siparisIsle((s) => { s[oid].durum = "bekliyor"; });
  return { odemeAdresi: ODEME_SAYFASI + String(veri.token) };
}

// Bağlantı testi: 1 TL'lik ödeme oturumu açar (para çekilmez; oturum kullanılmadan düşer).
async function baglantiTesti(request, user) {
  const a = ayar();
  if (!hazir(a)) return { ok: false, mesaj: "Önce mağaza no, parola ve gizli anahtarı kaydet." };
  const taban = siteTabani(request);
  try {
    const { httpDurum, veri } = await tokenAl(a, {
      oid: siparisNo("test"), eposta: asciiEposta(user.email), tutar: 1, ip: istemciIp(request), ad: "Baglanti Testi", urun: "Baglanti testi",
      okUrl: `${taban}/arsiv?odeme=basarili#kontor`, failUrl: `${taban}/arsiv?odeme=hata#kontor`,
    });
    if (veri?.status === "success" && veri?.token) return { ok: true, mesaj: `PayTR (${a.mod === "canli" ? "canlı" : "test"}) bağlantısı başarılı; ödeme oturumu açıldı.` };
    return { ok: false, mesaj: `${veri?.reason || "PayTR hata döndü"} (HTTP ${httpDurum})` };
  } catch (error) {
    return { ok: false, mesaj: `Bağlanılamadı: ${error.message}` };
  }
}

function formOku(request) {
  return new Promise((resolve, reject) => {
    let boyut = 0;
    const parcalar = [];
    request.on("data", (p) => {
      boyut += p.length;
      if (boyut > 32 * 1024) { reject(new Error("Çok büyük istek")); request.destroy(); return; }
      parcalar.push(p);
    });
    request.on("end", () => resolve(Object.fromEntries(new URLSearchParams(Buffer.concat(parcalar).toString("utf8")))));
    request.on("error", reject);
  });
}

// PayTR sunucusunun bildirimi. Kontör yalnız burada eklenir; aynı sipariş iki kez işlenmez.
async function bildirimIsle(request, kontor) {
  const g = await formOku(request);
  const oid = String(g.merchant_oid || "").trim();
  const durum = String(g.status || "").trim();
  const toplam = String(g.total_amount || "").trim();
  const a = ayar();
  if (!oid || !hazir(a)) return { kod: 400, metin: "PAYTR notification failed: bad request" };
  const beklenen = crypto.createHmac("sha256", a.parola).update(oid + a.gizli + durum + toplam, "utf8").digest("base64");
  const gelen = Buffer.from(String(g.hash || ""));
  const dogru = Buffer.from(beklenen);
  if (gelen.length !== dogru.length || !crypto.timingSafeEqual(gelen, dogru)) return { kod: 400, metin: "PAYTR notification failed: bad hash" };

  await siparisIsle(async (s) => {
    const sip = s[oid];
    // Bilinmeyen ya da zaten işlenmiş sipariş: PayTR tekrar denemesin diye yine OK, bakiyeye dokunulmaz.
    if (!sip || sip.durum === "odendi") return;
    sip.bildirim = Date.now();
    if (durum !== "success") {
      sip.durum = "basarisiz";
      sip.hata = String(g.failed_reason_msg || g.failed_reason_code || "Ödeme tamamlanmadı").slice(0, 300);
      return;
    }
    await kontor.hareketEkle(sip.userId, { miktar: sip.kontor, tur: "yukleme", aciklama: `${sip.tutar} ₺ kontör paketi · PayTR${sip.mod === "test" ? " (test)" : ""}`, ref: oid });
    sip.durum = "odendi";
    sip.odenen = Number(toplam) / 100 || sip.tutar;
  });
  return { kod: 200, metin: "OK" };
}

module.exports = { PAKETLER, BILDIRIM_YOLU, paketler, hazir, acikMi, ayar, ayarKaydet, ayarOzeti, siteTabani, sonSiparisler, odemeBaslat, baglantiTesti, bildirimIsle };
