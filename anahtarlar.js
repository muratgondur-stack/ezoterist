// Dış servis API anahtarları (Murat 2026-10-03): Google (Gemini / Cloud Text-to-Speech), xAI Grok, OpenAI.
// Yönetim panelinden girilir, DATA_DIR/yonetim/anahtarlar.json'da (yalnız sahibinin okuyabileceği izinle) saklanır.
// Panele hiçbir zaman tamamı gönderilmez; yalnız son 4 karakteri ve "test" sonucu gösterilir.
const fs = require("node:fs");
const path = require("node:path");
const { dataDir } = require("./ayarlar");

const dosya = path.join(dataDir, "yonetim", "anahtarlar.json");

const SAGLAYICILAR = {
  google: { ad: "Google (Gemini · Cloud Text-to-Speech)", ipucu: "AIza… ile başlar" },
  grok: { ad: "Grok (xAI)", ipucu: "xai-… ile başlar" },
  openai: { ad: "OpenAI", ipucu: "sk-… ile başlar" },
};

let bellek = null;
function oku() {
  if (!bellek) {
    try {
      bellek = JSON.parse(fs.readFileSync(dosya, "utf8"));
    } catch {
      bellek = {};
    }
  }
  return bellek;
}

async function kaydet(saglayici, deger) {
  if (!SAGLAYICILAR[saglayici]) throw Object.assign(new Error("Bilinmeyen servis."), { status: 400 });
  const temiz = String(deger || "").trim();
  if (temiz && (temiz.length < 20 || temiz.length > 300 || /\s/.test(temiz))) {
    throw Object.assign(new Error("Anahtar biçimi geçersiz. Yalnız anahtarın kendisini yapıştır (boşluksuz)."), { status: 400 });
  }
  const yeni = { ...oku() };
  if (temiz) yeni[saglayici] = { deger: temiz, tarih: Date.now() };
  else delete yeni[saglayici];
  await fs.promises.mkdir(path.dirname(dosya), { recursive: true });
  const gecici = `${dosya}.${process.pid}.tmp`;
  await fs.promises.writeFile(gecici, JSON.stringify(yeni), { mode: 0o600 });
  await fs.promises.rename(gecici, dosya);
  bellek = yeni;
}

const anahtar = (saglayici) => oku()[saglayici]?.deger || "";

// Panel için: anahtarın kendisi yok, yalnız var mı, son 4 karakter, ne zaman girildi.
const ozet = () =>
  Object.entries(SAGLAYICILAR).map(([id, s]) => {
    const k = oku()[id];
    return { id, ad: s.ad, ipucu: s.ipucu, var: Boolean(k), son4: k ? k.deger.slice(-4) : "", tarih: k?.tarih || null };
  });

async function istek(url, secenek = {}) {
  const r = await fetch(url, { ...secenek, signal: AbortSignal.timeout(15000) });
  const d = await r.json().catch(() => ({}));
  const mesaj = d?.error?.message || d?.error || "";
  return { ok: r.ok, durum: r.status, d, mesaj: typeof mesaj === "string" ? mesaj.slice(0, 160) : "" };
}

// Ücretsiz uçlarla doğrular (model / ses listesi); para harcayan çağrı yapılmaz.
async function test(saglayici) {
  const k = anahtar(saglayici);
  if (!k) return { ok: false, mesaj: "Anahtar girilmemiş." };
  try {
    if (saglayici === "openai") {
      const r = await istek("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${k}` } });
      return r.ok ? { ok: true, mesaj: `Geçerli · ${r.d.data?.length || 0} model erişilebilir` } : { ok: false, mesaj: `OpenAI ${r.durum}: ${r.mesaj}` };
    }
    if (saglayici === "grok") {
      const r = await istek("https://api.x.ai/v1/models", { headers: { Authorization: `Bearer ${k}` } });
      return r.ok ? { ok: true, mesaj: `Geçerli · ${r.d.data?.length || 0} model erişilebilir` } : { ok: false, mesaj: `xAI ${r.durum}: ${r.mesaj}` };
    }
    if (saglayici === "google") {
      const [tts, gemini] = await Promise.all([
        istek(`https://texttospeech.googleapis.com/v1/voices?languageCode=tr-TR&key=${encodeURIComponent(k)}`),
        istek(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`),
      ]);
      const ttsMetin = tts.ok ? `Cloud TTS ✓ (${tts.d.voices?.length || 0} Türkçe ses)` : `Cloud TTS ✗ (${tts.durum}${tts.mesaj ? `: ${tts.mesaj}` : ""})`;
      const geminiMetin = gemini.ok ? `Gemini ✓ (${gemini.d.models?.length || 0} model)` : `Gemini ✗ (${gemini.durum}${gemini.mesaj ? `: ${gemini.mesaj}` : ""})`;
      return { ok: tts.ok || gemini.ok, mesaj: `${ttsMetin} · ${geminiMetin}` };
    }
    return { ok: false, mesaj: "Bilinmeyen servis." };
  } catch (error) {
    return { ok: false, mesaj: `Bağlanılamadı: ${error.message}` };
  }
}

module.exports = { SAGLAYICILAR, anahtar, ozet, kaydet, test };
