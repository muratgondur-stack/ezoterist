// Astroloji bölümünün sunucu uçları: günlük yorum, doğum haritası yorumu ve seslendirme (Piper, arabella sesi).
// Yapay zekâ ve ses isteğe bağlıdır: LLM_URL/LLM_TOKEN/LLM_MODEL ve TTS_URL yoksa sabit metin, ses yok.
// İkisi de V100'de (ses2.quiz.ist): Gemma /llm/v1/chat/completions, Piper /tts/synthesize; ezoter.ist'e özel anahtarla.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Astro = require("./astro");
const Veri = require("./astroloji-veri");

const llm = {
  url: (process.env.LLM_URL || "").trim(),
  token: (process.env.LLM_TOKEN || "").trim(),
  model: (process.env.LLM_MODEL || "gpt-4.1-mini").trim(),
};
const llmEnabled = Boolean(llm.url && llm.token);

const tts = {
  url: (process.env.TTS_URL || "").trim(),
  token: (process.env.TTS_TOKEN || process.env.LLM_TOKEN || "").trim(),
  voice: (process.env.TTS_VOICE || "arabella").trim(),
};

const TIME_ZONE = "Europe/Istanbul";

function setup(dataDir) {
  return { base: path.join(dataDir, "astroloji") };
}

const bugun = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 10 * 1024) {
        reject(Object.assign(new Error("Çok büyük istek"), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(Object.assign(new Error("Geçersiz JSON"), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

const readCache = (file) => fs.promises.readFile(file, "utf8").then(JSON.parse).catch(() => null);
async function writeCache(file, value) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(value));
  await fs.promises.rename(tmp, file);
}

// Aynı anda gelen aynı istekler tek bir üretimi bekler.
const inFlight = new Map();
function once(key, task) {
  if (!inFlight.has(key)) inFlight.set(key, task().finally(() => inFlight.delete(key)));
  return inFlight.get(key);
}

async function askLlm(system, user) {
  const body = {
    model: llm.model,
    temperature: 0.85,
    max_tokens: 700,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  };
  if (/^gemma/i.test(llm.model)) body.reasoning_effort = "none";
  const result = await fetch(llm.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${llm.token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await result.json().catch(() => null);
  if (!result.ok) throw new Error(`LLM ${result.status}: ${String(data?.error?.message || data?.error || "").slice(0, 160)}`);
  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("LLM boş cevap döndü");
  return text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
}

const ASTROLOG_SISTEM =
  "Sen Ezoter.ist'in astroloğusun. Türkçe, sıcak, akıcı ve umut veren bir dille yazarsın; metnin sesli okunacak. " +
  "Kesin kehanetlerde bulunma, korkutma; sağlık, hukuk ve para konularında kesin tavsiye verme. " +
  "Başlık, madde işareti, emoji, yıldız ya da markdown kullanma; düz paragraflar yaz. Sana verilen gökyüzü bilgilerine sadık kal, yeni gezegen konumu uydurma.";

// --- Gökyüzü özeti ---

function gokyuzu(date = new Date()) {
  const konumlar = Astro.positions(date);
  const evre = Astro.moonPhase(date);
  const ay = konumlar.find((k) => k.body === "moon");
  const geri = konumlar.filter((k) => k.retro).map((k) => Veri.gezegenler[k.body].ad);
  return { konumlar, evre, ay, geri };
}

function sabitGunluk(burc, date = new Date()) {
  const { ay, evre, geri } = gokyuzu(date);
  const aci = Astro.aspectBetween(burc, ay.sign);
  const parcalar = [
    `${Veri.elementDuygu[Veri.burclar[ay.sign].element]} ${evre.name} evresindeyiz.`,
    Veri.gunlukAcilar[aci],
  ];
  if (geri.includes("Merkür")) parcalar.push("Merkür geri hareket ediyor: imza atmadan önce iki kez oku, eski dostlarla yeniden bağ kurmak için güzel bir dönem.");
  return parcalar.join(" ");
}

async function gunlukYorum(cfg, burc) {
  const tarih = bugun();
  if (!llmEnabled) return { tarih, metin: sabitGunluk(burc), kaynak: "gok" };
  const file = path.join(cfg.base, "gunluk", tarih, `${burc}.json`);
  const cached = await readCache(file);
  if (cached) return cached;
  return once(`gunluk:${tarih}:${burc}`, async () => {
    const { konumlar, evre, ay, geri } = gokyuzu();
    const b = Veri.burclar[burc];
    const gokMetni = konumlar.map((k) => `${Veri.gezegenler[k.body].ad} ${Veri.burclar[k.sign].ad} ${Math.floor(k.degree)}°${k.retro ? " (geri)" : ""}`).join(", ");
    const kullanici =
      `Bugün ${tarih}. Gökyüzü: ${gokMetni}. Ay evresi: ${evre.name}. ` +
      `${geri.length ? `Geri hareket edenler: ${geri.join(", ")}. ` : ""}` +
      `Ay'ın ${b.ad} burcuna göre açısı: ${Astro.aspectBetween(burc, ay.sign)}.\n` +
      `${b.ad} burcu için bugünün yorumunu yaz: 110-150 kelime, iki paragraf. Önce günün genel enerjisi, sonra aşk ve iş için birer somut öneri. ` +
      `Son cümle kısa bir "günün tavsiyesi" olsun.`;
    try {
      const metin = await askLlm(ASTROLOG_SISTEM, kullanici);
      const value = { tarih, metin, kaynak: "ai" };
      await writeCache(file, value);
      eskiGunleriSil(cfg).catch(() => {});
      return value;
    } catch (error) {
      console.error("Günlük yorum üretilemedi:", error.message);
      return { tarih, metin: sabitGunluk(burc), kaynak: "gok" };
    }
  });
}

// --- Doğum haritası yorumu ---
// Her kullanıcının tek bir kayıtlı haritası olur. Tekrar girince kayıtlı yorum (ve sesi) gelir;
// farklı bilgilerle yeni harita ancak 3 günde bir üretilebilir.

const BODY_KEYS = Astro.BODIES;
const HARITA_ARALIK_MS = 3 * 24 * 60 * 60 * 1000;

function girdiDogrula(body) {
  const g = body?.girdi || {};
  const tarih = String(g.tarih || "");
  const saat = g.saatYok ? "" : String(g.saat || "");
  const sehir = String(g.sehir || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return null;
  if (saat && !/^\d{2}:\d{2}$/.test(saat)) return null;
  if (!Veri.sehirler.some((c) => c.ad === sehir)) return null;
  return { tarih, saat, saatYok: !saat, sehir };
}

// Yerleşimler sunucuda yeniden hesaplanır; istemciden gelen konuma güvenilmez.
function haritaHesapla(girdi) {
  const [year, month, day] = girdi.tarih.split("-").map(Number);
  const city = Veri.sehirler.find((c) => c.ad === girdi.sehir);
  const [hour, minute] = girdi.saatYok ? [12, 0] : girdi.saat.split(":").map(Number);
  const when = Astro.localToUtc(year, month, day, hour, minute, city.saatDilimi);
  const yerlesim = Object.fromEntries(Astro.positions(when).map((k) => [k.body, k.sign]));
  const yukselen = girdi.saatYok ? "" : Astro.signOf(Astro.angles(when, city.enlem, city.boylam).asc);
  return { yerlesim, yukselen };
}

const haritaId = ({ yerlesim, yukselen }) =>
  crypto.createHash("sha1").update(JSON.stringify([BODY_KEYS.map((k) => yerlesim[k]), yukselen])).digest("hex").slice(0, 16);

function sabitHarita({ yerlesim, yukselen }) {
  const gunes = Veri.burclar[yerlesim.sun];
  const parcalar = [
    `Güneş'in ${gunes.ad} burcunda. ${gunes.ozet}`,
    `Ay'ın ${Veri.burclar[yerlesim.moon].ad} burcunda. ${Veri.ayBurcunda[yerlesim.moon]}`,
  ];
  if (yukselen) parcalar.push(`Yükselenin ${Veri.burclar[yukselen].ad}. ${Veri.yukselenBurcunda[yukselen]}`);
  return parcalar.join(" ");
}

// Aynı yerleşimlere sahip haritalar (aynı gün doğanlar gibi) yorumu paylaşır.
async function haritaMetni(cfg, harita) {
  const id = haritaId(harita);
  const file = path.join(cfg.base, "harita", `${id}.json`);
  const cached = await readCache(file);
  if (cached) return cached;
  if (!llmEnabled) return { id, metin: sabitHarita(harita), kaynak: "sabit" };

  return once(`harita:${id}`, async () => {
    const satirlar = BODY_KEYS.map((k) => `${Veri.gezegenler[k].ad}: ${Veri.burclar[harita.yerlesim[k]].ad}`).join(", ");
    const kullanici =
      `Doğum haritası yerleşimleri: ${satirlar}.` +
      `${harita.yukselen ? ` Yükselen: ${Veri.burclar[harita.yukselen].ad}.` : " Doğum saati bilinmiyor, yükselen yok."}\n` +
      "Bu kişiye hitaben (sen diliyle) kişisel bir harita yorumu yaz: 180-240 kelime, üç paragraf. " +
      "Birinci paragraf Güneş, Ay ve yükselenin birlikte çizdiği karakter; ikinci paragraf aşk ve ilişkiler (Venüs, Mars); üçüncüsü yetenekler ve yol (Merkür, Jüpiter, Satürn). Sıcak ve güçlendirici bitir.";
    try {
      const value = { id, metin: await askLlm(ASTROLOG_SISTEM, kullanici), kaynak: "ai" };
      await writeCache(file, value);
      return value;
    } catch (error) {
      console.error("Harita yorumu üretilemedi:", error.message);
      return { id, metin: sabitHarita(harita), kaynak: "sabit" };
    }
  });
}

const kullaniciDosyasi = (cfg, userId) => path.join(cfg.base, "kullanici", `${String(userId).replace(/[^a-zA-Z0-9-]/g, "")}.json`);
const ayniGirdi = (a, b) => Boolean(a && b) && a.tarih === b.tarih && a.saat === b.saat && a.sehir === b.sehir;

// Kilit yalnız yapay zekâ yorumunda işler; bağlantı yokken üretilen sabit yorum yenilenebilir.
function haritaCevabi(kayit, extra = {}) {
  const kilitBitis = kayit.kaynak === "ai" ? kayit.olusturma + HARITA_ARALIK_MS : 0;
  return { ...kayit, yeniHaritaTarihi: kilitBitis > Date.now() ? kilitBitis : null, ...extra };
}

async function haritaOlustur(cfg, userId, girdi) {
  const file = kullaniciDosyasi(cfg, userId);
  const kayit = await readCache(file);
  if (kayit?.kaynak === "ai") {
    if (ayniGirdi(kayit.girdi, girdi)) return haritaCevabi(kayit);
    if (Date.now() - kayit.olusturma < HARITA_ARALIK_MS) return haritaCevabi(kayit, { kilitli: true });
  }
  const harita = haritaHesapla(girdi);
  const yorum = await haritaMetni(cfg, harita);
  const yeni = { id: yorum.id, girdi, ...harita, metin: yorum.metin, kaynak: yorum.kaynak, olusturma: Date.now() };
  await writeCache(file, yeni);
  return haritaCevabi(yeni);
}

// --- Ses (V100'deki Piper, arabella sesi) ---

const sesVar = () => Boolean(tts.url && tts.token);

// Sesli okumada sembol, emoji ve kısaltmalar takılmasın.
const sesMetni = (text) =>
  text
    .replace(/[♈-♓☉☽☿♀♂♃♄♅♆♇℞]/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

// Ses bir kez üretilip dosyaya yazılır; metin değişmedikçe V100'e tekrar gidilmez. Dosya adındaki kısa
// özet, metin değişirse (ör. yapay zekâ sonradan açılırsa) yeni sesin üretilmesini sağlar.
async function sesDosyasi(text, dir, name) {
  const clean = sesMetni(text).slice(0, 4000);
  const hash = crypto.createHash("sha1").update(`${tts.voice}|${clean}`).digest("hex").slice(0, 10);
  const mp3 = path.join(dir, `${name}-${hash}.mp3`);
  if (fs.existsSync(mp3)) return mp3;
  return once(`ses:${mp3}`, async () => {
    const result = await fetch(tts.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tts.token}` },
      body: JSON.stringify({ text: clean, voice: tts.voice, format: "mp3" }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!result.ok) throw new Error(`TTS ${result.status}`);
    if (!/audio\/mpeg/.test(result.headers.get("content-type") || "")) throw new Error("TTS mp3 döndürmedi");
    const audio = Buffer.from(await result.arrayBuffer());
    await fs.promises.mkdir(dir, { recursive: true });
    const tmp = `${mp3}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, audio);
    await fs.promises.rename(tmp, mp3);
    return mp3;
  });
}

// Günlük yorum klasörleri (metin + ses) bir hafta tutulur.
async function eskiGunleriSil(cfg) {
  const dir = path.join(cfg.base, "gunluk");
  const sinir = bugun(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const gunler = await fs.promises.readdir(dir).catch(() => []);
  await Promise.all(
    gunler
      .filter((g) => /^\d{4}-\d{2}-\d{2}$/.test(g) && g < sinir)
      .map((g) => fs.promises.rm(path.join(dir, g), { recursive: true, force: true })),
  );
}

function burcSesMetni(burc) {
  const b = Veri.burclar[burc];
  return `${b.ad} burcu. ${b.tarih.replace("–", "ile")} arası. ${b.ozet} Güçlü yanları: ${b.guclu.join(", ")}. Aşkta: ${b.ask} İş hayatında: ${b.kariyer}`;
}

// --- Yönlendirme ---

function createHandler({ dataDir, currentUser, sendFile }) {
  const cfg = setup(dataDir);

  return function handleAstrolojiRequest(request, response, url) {
    if (!url.pathname.startsWith("/api/astroloji/")) return false;
    const route = `${request.method} ${url.pathname}`;

    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Giriş yapmalısınız." });
      return true;
    }

    const fail = (error) => {
      if (response.headersSent) return response.destroy();
      const status = error.status || 500;
      if (status === 500) console.error("Astroloji:", error);
      sendJson(response, status, { error: status === 500 ? "Bir sorun oluştu. Lütfen tekrar deneyin." : error.message });
    };
    const burcParam = () => {
      const burc = url.searchParams.get("burc") || "";
      if (!Astro.SIGN_KEYS.includes(burc)) throw Object.assign(new Error("Geçersiz burç."), { status: 400 });
      return burc;
    };

    const routes = {
      "GET /api/astroloji/durum": async () => sendJson(response, 200, { ai: llmEnabled, ses: sesVar() }),
      "GET /api/astroloji/gunluk": async () => sendJson(response, 200, await gunlukYorum(cfg, burcParam())),
      "GET /api/astroloji/harita": async () => {
        const kayit = await readCache(kullaniciDosyasi(cfg, user.id));
        sendJson(response, 200, kayit ? haritaCevabi(kayit) : {});
      },
      "POST /api/astroloji/harita": async () => {
        const girdi = girdiDogrula(await readJson(request));
        if (!girdi) throw Object.assign(new Error("Doğum tarihi, saati ya da yeri eksik."), { status: 400 });
        sendJson(response, 200, await haritaOlustur(cfg, user.id, girdi));
      },
      // Günlük ses o günün klasörüne, burç tanıtımı kalıcı klasöre, harita sesi haritanın yanına yazılır.
      "GET /api/astroloji/ses": async () => {
        if (!sesVar()) throw Object.assign(new Error("Seslendirme henüz hazır değil."), { status: 503 });
        const tur = url.searchParams.get("tur");
        let file;
        if (tur === "burc") {
          const burc = burcParam();
          file = await sesDosyasi(burcSesMetni(burc), path.join(cfg.base, "ses"), `burc-${burc}`);
        } else if (tur === "gunluk") {
          const burc = burcParam();
          const gunluk = await gunlukYorum(cfg, burc);
          const text = `${Veri.burclar[burc].ad} burcu için bugün. ${gunluk.metin}`;
          file = await sesDosyasi(text, path.join(cfg.base, "gunluk", gunluk.tarih), burc);
        } else if (tur === "harita") {
          const kayit = await readCache(kullaniciDosyasi(cfg, user.id));
          if (!kayit) throw Object.assign(new Error("Önce haritanı hesapla."), { status: 404 });
          file = await sesDosyasi(kayit.metin, path.join(cfg.base, "harita"), kayit.id);
        } else throw Object.assign(new Error("Geçersiz istek."), { status: 400 });
        sendFile(request, response, file);
      },
    };

    const handler = routes[route];
    if (!handler) {
      sendJson(response, 404, { error: "Bulunamadı." });
      return true;
    }
    Promise.resolve().then(handler).catch(fail);
    return true;
  };
}

// Uzman talepleri (uzman-api.js) aynı önbellek, ses ve kayıt yardımcılarını kullanır.
module.exports = { createHandler, yardimci: { sendJson, readJson, readCache, writeCache, sesDosyasi, sesVar, kullaniciDosyasi, setup, Veri } };
