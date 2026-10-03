// Site ayarları: yönetim panelinden (/yonetim) değiştirilebilen bütün değerler. DATA_DIR/ayarlar.json'da tutulur,
// bellekte önbelleklenir; bölümler değerleri her istekte buradan okur, yani değişiklik yayın gerekmeden geçerli olur.
// Kayıtlı olmayan ayar şemadaki varsayılanı (çoğu zaman eski ortam değişkenini) kullanır.
const fs = require("node:fs");
const path = require("node:path");

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const dosya = path.join(dataDir, "ayarlar.json");

// Yönetim paneline yalnızca bu hesap girebilir (Murat 2026-10-03).
const YONETICI = "murat.gondur@gmail.com";
const yoneticiMi = (user) => Boolean(user?.email) && String(user.email).toLowerCase() === YONETICI;

// V100'deki Piper sunucusunun Türkçe sesleri.
const SESLER = ["arabella", "leyla", "alev", "fable", "lucien", "davis", "eren"];

// Bölümler: kimlik, ad, sayfa, API öneki, veri klasörü (ses seçimi için) ve günlük sınırın varsayılanı (0 = sınırsız).
const BOLUMLER = [
  { id: "astroloji", ad: "Astroloji", sayfa: "/astroloji", api: "/api/astroloji/", dizin: "astroloji", sinir: null },
  { id: "dogum-haritasi", ad: "Doğum Haritası", sayfa: "/dogum-haritasi", api: "/api/dogum-haritasi", dizin: "dogum-haritasi", sinir: null },
  { id: "numeroloji", ad: "Numeroloji", sayfa: "/numeroloji", api: "/api/numeroloji/", dizin: "numeroloji", sinir: null },
  { id: "ruya", ad: "Rüya Yorumu", sayfa: "/ruya", api: "/api/ruya/", dizin: "ruya", sinir: 3 },
  { id: "tarot", ad: "Tarot", sayfa: "/tarot", api: "/api/tarot/", dizin: "tarot", sinir: 3 },
  { id: "kahve-fali", ad: "Kahve Falı", sayfa: "/kahve-fali", api: "/api/fal/", dizin: "fal", sinir: 0 },
  { id: "el-fali", ad: "El Falı", sayfa: "/el-fali", api: "/api/el-fali/", dizin: "el-fali", sinir: 0 },
  { id: "yuz-okuma", ad: "Yüz Okuma", sayfa: "/yuz-okuma", api: "/api/yuz-okuma/", dizin: "yuz-okuma", sinir: 0 },
  { id: "fotograf-analizi", ad: "Fotoğraf Analizi", sayfa: "/fotograf-analizi", api: "/api/fotograf-analizi/", dizin: "fotograf-analizi", sinir: 0 },
  { id: "ask-uyumu", ad: "Aşk Uyumu", sayfa: "/ask-uyumu", api: "/api/ask-uyumu/", dizin: "ask-uyumu", sinir: 3 },
  { id: "melek-sayilari", ad: "Melek Sayıları", sayfa: "/melek-sayilari", api: "/api/melek/", dizin: "melek-sayilari", sinir: 5 },
  { id: "iching", ad: "I Ching", sayfa: "/iching", api: "/api/iching/", dizin: "iching", sinir: 3 },
  { id: "run-taslari", ad: "Rün Taşları", sayfa: "/run-taslari", api: "/api/run/", dizin: "run", sinir: 3 },
  { id: "ay-takvimi", ad: "Ay Takvimi", sayfa: "/ay-takvimi", api: "/api/ay/", dizin: "ay-takvimi", sinir: null },
  { id: "cakralar", ad: "Çakralar", sayfa: "/cakralar", api: "/api/cakra/", dizin: "cakra", sinir: 3 },
  { id: "kristaller", ad: "Kristaller", sayfa: "/kristaller", api: "/api/kristal/", dizin: "kristal", sinir: 5 },
  { id: "semboller", ad: "Semboller", sayfa: "/semboller", api: "/api/sembol/", dizin: "semboller", sinir: 5 },
  { id: "ruhsal-gunluk", ad: "Ruhsal Günlük", sayfa: "/ruhsal-gunluk", api: "/api/ruhsal/", dizin: "ruhsal-gunluk", sinir: 3 },
  { id: "asistan", ad: "Ezoterik Asistan", sayfa: "/asistan", api: "/api/asistan/", dizin: "asistan", sinir: 30 },
  { id: "dizim", ad: "Taşlarla Dizim", sayfa: "/tas", api: "/api/dizim/", dizin: "dizim", sinir: 5 },
];

const listeOrtam = (ad) => String(process.env[ad] || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

// Şema: tür, varsayılan ve sınırlar. Panel bu şemadan çizilir.
const SEMA = {
  "ses.acik": { grup: "Ses", ad: "Seslendirme açık", tur: "bool", vars: true },
  "ses.ses": { grup: "Ses", ad: "Varsayılan ses", tur: "secim", secenekler: SESLER, vars: SESLER.includes(process.env.TTS_VOICE) ? process.env.TTS_VOICE : "arabella" },
  "ses.hiz": { grup: "Ses", ad: "Konuşma hızı", tur: "sayi", min: 0.6, max: 1.6, adim: 0.05, vars: 1.2, birim: "×", aciklama: "1 = sesin kendi hızı (Murat 2026-10-03: 1.2×)" },
  "llm.model": { grup: "Yapay zekâ", ad: "Model", tur: "metin", vars: process.env.LLM_MODEL || "gemma4:26b-a4b-it-q4_K_M", aciklama: "V100'deki Ollama model adı" },
  "llm.zamanAsimi": { grup: "Yapay zekâ", ad: "Zaman aşımı", tur: "tam", min: 30, max: 300, vars: 120, birim: "sn" },
  "llm.yaraticilik": { grup: "Yapay zekâ", ad: "Yaratıcılık çarpanı", tur: "sayi", min: 0.5, max: 1.4, adim: 0.05, vars: 1, birim: "×", aciklama: "Bölümlerin sıcaklık değeri bununla çarpılır; düşük = tutarlı, yüksek = yaratıcı" },
  "sure.uzmanSaat": { grup: "Süreler", ad: "Uzman yanıt süresi", tur: "tam", min: 1, max: 336, vars: 48, birim: "saat" },
  "sure.haritaGun": { grup: "Süreler", ad: "Doğum haritası yenileme aralığı", tur: "tam", min: 0, max: 60, vars: 3, birim: "gün" },
  "sure.numerolojiGun": { grup: "Süreler", ad: "Numeroloji profili yenileme aralığı", tur: "tam", min: 0, max: 60, vars: 3, birim: "gün" },
  "sure.oturumGun": { grup: "Süreler", ad: "\"Beni hatırla\" oturum süresi", tur: "tam", min: 1, max: 365, vars: 30, birim: "gün" },
  "sinir.sesleAnlatma": { grup: "Günlük sınırlar", ad: "Sesle anlatma (yazıya çevirme)", tur: "tam", min: 0, max: 500, vars: 20, birim: "/gün", aciklama: "0 = sınırsız" },
  "izin.uzmanlar": { grup: "İzinler", ad: "Uzman e-postaları", tur: "epostalar", vars: listeOrtam("UZMAN_EPOSTA") },
  "genel.muzik": { grup: "Genel", ad: "Ana menü müzik seviyesi", tur: "sayi", min: 0, max: 0.5, adim: 0.01, vars: 0.1 },
};
BOLUMLER.forEach((b) => {
  SEMA[`bolum.${b.id}.acik`] = { grup: "Bölümler", ad: b.ad, tur: "bool", vars: true };
  SEMA[`bolum.${b.id}.ses`] = { grup: "Bölüm sesleri", ad: b.ad, tur: "secim", secenekler: ["", ...SESLER], vars: "", aciklama: "boş = varsayılan ses" };
  if (b.sinir !== null) SEMA[`sinir.${b.id}`] = { grup: "Günlük sınırlar", ad: b.ad, tur: "tam", min: 0, max: 1000, vars: b.sinir, birim: "/gün", aciklama: "0 = sınırsız" };
});

let kayitli = {};
try {
  kayitli = JSON.parse(fs.readFileSync(dosya, "utf8")) || {};
} catch (error) {
  if (error.code !== "ENOENT") console.error("Ayar dosyası okunamadı:", error.message);
}

function get(anahtar) {
  const s = SEMA[anahtar];
  if (!s) throw new Error(`Bilinmeyen ayar: ${anahtar}`);
  return Object.prototype.hasOwnProperty.call(kayitli, anahtar) ? kayitli[anahtar] : s.vars;
}

const hepsi = () => Object.fromEntries(Object.keys(SEMA).map((k) => [k, get(k)]));

function dogrula(anahtar, deger) {
  const s = SEMA[anahtar];
  if (!s) throw Object.assign(new Error(`Bilinmeyen ayar: ${anahtar}`), { status: 400 });
  const hataVer = (m) => { throw Object.assign(new Error(`${s.grup} · ${s.ad}: ${m}`), { status: 400 }); };
  switch (s.tur) {
    case "bool":
      if (typeof deger !== "boolean") hataVer("açık ya da kapalı olmalı");
      return deger;
    case "tam":
    case "sayi": {
      const n = Number(deger);
      if (!Number.isFinite(n)) hataVer("sayı olmalı");
      if (s.tur === "tam" && !Number.isInteger(n)) hataVer("tam sayı olmalı");
      if (n < s.min || n > s.max) hataVer(`${s.min} ile ${s.max} arasında olmalı`);
      return n;
    }
    case "secim":
      if (!s.secenekler.includes(deger)) hataVer("geçersiz seçim");
      return deger;
    case "metin": {
      const t = String(deger || "").trim();
      if (!t || t.length > 120 || !/^[\w.:\-/]+$/.test(t)) hataVer("geçersiz değer");
      return t;
    }
    case "epostalar": {
      const liste = (Array.isArray(deger) ? deger : String(deger || "").split(/[\s,;]+/)).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
      if (liste.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) hataVer("geçersiz e-posta adresi var");
      return [...new Set(liste)].slice(0, 30);
    }
    default:
      return hataVer("bilinmeyen tür");
  }
}

// Birden çok ayarı birlikte doğrular ve kaydeder; biri hatalıysa hiçbiri kaydedilmez.
let yazmaSirasi = Promise.resolve();
function kaydet(degisiklikler) {
  const temiz = {};
  for (const [k, v] of Object.entries(degisiklikler || {})) temiz[k] = dogrula(k, v);
  const is = yazmaSirasi.then(async () => {
    const yeni = { ...kayitli, ...temiz };
    await fs.promises.mkdir(dataDir, { recursive: true });
    const tmp = `${dosya}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(yeni, null, 2), { mode: 0o600 });
    await fs.promises.rename(tmp, dosya);
    kayitli = yeni;
    return hepsi();
  });
  yazmaSirasi = is.catch(() => {});
  return is;
}

// Bir ayarı varsayılanına döndürür.
function sifirla(anahtarlar) {
  const is = yazmaSirasi.then(async () => {
    const yeni = { ...kayitli };
    anahtarlar.filter((k) => SEMA[k]).forEach((k) => { delete yeni[k]; });
    await fs.promises.writeFile(dosya, JSON.stringify(yeni, null, 2), { mode: 0o600 });
    kayitli = yeni;
    return hepsi();
  });
  yazmaSirasi = is.catch(() => {});
  return is;
}

// Bölümlerin kullandığı kısa yollar.
const bolumBul = (id) => BOLUMLER.find((b) => b.id === id);
// Günlük sınır: 0 ise sınırsız (Infinity; JSON'da null olur, sayfalar bunu "sınırsız" sayar).
const sinir = (id) => { const n = get(`sinir.${id}`); return n > 0 ? n : Infinity; };
const bolumAcik = (id) => get(`bolum.${id}.acik`) !== false;
// Ses: veri klasörüne göre bölüm sesi, yoksa varsayılan.
function sesFor(dizin) {
  const b = BOLUMLER.find((x) => x.dizin === dizin);
  return (b && get(`bolum.${b.id}.ses`)) || get("ses.ses");
}
const bolumDizini = (klasor) => path.relative(dataDir, path.resolve(klasor)).split(path.sep)[0];

module.exports = { SEMA, BOLUMLER, SESLER, YONETICI, yoneticiMi, get, hepsi, kaydet, sifirla, sinir, bolumAcik, bolumBul, sesFor, bolumDizini, dataDir };
