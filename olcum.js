// Bölüm başına kaynak kullanımı ölçümü (Murat 2026-10-04): yönetim panelinde dış API'lerle (OpenAI gpt-4.1-mini,
// Google standart TTS, OpenAI görsel) çalışılsaydı maliyetin ne olacağını gerçek ortalamalardan hesaplamak için.
// Her istek server.js'te bölüm etiketiyle (AsyncLocalStorage) çalışır; askLlm token sayısını, sesDosyasi karakter
// sayısını, rüya görseli adedi buraya yazar. Toplamlar DATA_DIR/yonetim/olcum.json'da tutulur (birkaç sn'de bir).
const fs = require("node:fs");
const path = require("node:path");
const { AsyncLocalStorage } = require("node:async_hooks");
const { dataDir } = require("./ayarlar");

const baglam = new AsyncLocalStorage();
const dosya = path.join(dataDir, "yonetim", "olcum.json");
let veri = null;
let yazZamanlayici = null;

function oku() {
  if (!veri) {
    try { veri = JSON.parse(fs.readFileSync(dosya, "utf8")); } catch { veri = { baslangic: Date.now(), bolumler: {} }; }
  }
  return veri;
}
function yaz() {
  clearTimeout(yazZamanlayici);
  yazZamanlayici = setTimeout(async () => {
    try {
      await fs.promises.mkdir(path.dirname(dosya), { recursive: true });
      const gecici = `${dosya}.${process.pid}.tmp`;
      await fs.promises.writeFile(gecici, JSON.stringify(veri));
      await fs.promises.rename(gecici, dosya);
    } catch (error) {
      console.error("Ölçüm yazılamadı:", error.message);
    }
  }, 3000);
}
const kayit = (bolum) => {
  const v = oku();
  v.bolumler[bolum] ||= { islem: 0, llm: { n: 0, giris: 0, cikis: 0 }, tts: { n: 0, karakter: 0 }, gorsel: { n: 0 } };
  return v.bolumler[bolum];
};

// İsteği bölüm etiketiyle çalıştırır (server.js).
const calistir = (bolum, fn) => baglam.run({ bolum, llmSayildi: false }, fn);
const simdikiBolum = () => baglam.getStore()?.bolum || null;

function llm(giris, cikis) {
  const s = baglam.getStore();
  if (!s?.bolum) return;
  const k = kayit(s.bolum);
  if (!s.llmSayildi) { s.llmSayildi = true; k.islem += 1; } // bir kullanıcı işlemi = yapay zekâ çağıran bir istek
  k.llm.n += 1;
  k.llm.giris += Math.max(0, Number(giris) || 0);
  k.llm.cikis += Math.max(0, Number(cikis) || 0);
  yaz();
}
function tts(bolum, karakter) {
  const b = bolum || simdikiBolum();
  if (!b) return;
  const k = kayit(b);
  k.tts.n += 1;
  k.tts.karakter += Math.max(0, Number(karakter) || 0);
  yaz();
}
function gorsel(bolum) {
  const b = bolum || simdikiBolum();
  if (!b) return;
  kayit(b).gorsel.n += 1;
  yaz();
}
const ozet = () => JSON.parse(JSON.stringify(oku()));

module.exports = { calistir, simdikiBolum, llm, tts, gorsel, ozet };
