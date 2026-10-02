// Astroloji bölümünün sunucu uçları: günlük yorum, doğum haritası yorumu ve Alev'in sesi (Piper).
// Yapay zekâ ve ses isteğe bağlıdır: LLM_URL/LLM_TOKEN/LLM_MODEL ve Piper sesi yoksa sabit metinler kullanılır.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const Astro = require("./astro");
const Veri = require("./astroloji-veri");

const llm = {
  url: (process.env.LLM_URL || "").trim(),
  token: (process.env.LLM_TOKEN || "").trim(),
  model: (process.env.LLM_MODEL || "gpt-4.1-mini").trim(),
};
const llmEnabled = Boolean(llm.url && llm.token);

const HARITA_GUNLUK_SINIR = 20;
const TIME_ZONE = "Europe/Istanbul";

function setup(dataDir) {
  const base = path.join(dataDir, "astroloji");
  const piperBin = process.env.PIPER_BIN || "/opt/piper/piper";
  const piperVoice = process.env.PIPER_VOICE || path.join(dataDir, "piper", "tr_TR-alev-medium.onnx");
  return { base, piperBin, piperVoice };
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
      return value;
    } catch (error) {
      console.error("Günlük yorum üretilemedi:", error.message);
      return { tarih, metin: sabitGunluk(burc), kaynak: "gok" };
    }
  });
}

// --- Doğum haritası yorumu ---

const BODY_KEYS = Astro.BODIES;
function haritaDogrula(body) {
  const yerlesim = {};
  for (const key of BODY_KEYS) {
    const sign = String(body?.yerlesim?.[key] || "");
    if (!Astro.SIGN_KEYS.includes(sign)) return null;
    yerlesim[key] = sign;
  }
  const yukselen = body?.yukselen ? String(body.yukselen) : "";
  if (yukselen && !Astro.SIGN_KEYS.includes(yukselen)) return null;
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

const haritaSayaci = new Map();
async function haritaYorum(cfg, harita, userId) {
  const id = haritaId(harita);
  const file = path.join(cfg.base, "harita", `${id}.json`);
  if (!llmEnabled) {
    // Sesli dinleme önbellekten okur; sabit yorum da kaydedilir.
    const value = { id, metin: sabitHarita(harita), kaynak: "sabit", harita };
    await writeCache(file, value);
    return value;
  }
  const cached = await readCache(file);
  if (cached) return cached;

  const sayacKey = `${userId}:${bugun()}`;
  const count = haritaSayaci.get(sayacKey) || 0;
  if (count >= HARITA_GUNLUK_SINIR) return { id, metin: sabitHarita(harita), kaynak: "sabit", sinir: true };
  haritaSayaci.set(sayacKey, count + 1);

  return once(`harita:${id}`, async () => {
    const satirlar = BODY_KEYS.map((k) => `${Veri.gezegenler[k].ad}: ${Veri.burclar[harita.yerlesim[k]].ad}`).join(", ");
    const kullanici =
      `Doğum haritası yerleşimleri: ${satirlar}.` +
      `${harita.yukselen ? ` Yükselen: ${Veri.burclar[harita.yukselen].ad}.` : " Doğum saati bilinmiyor, yükselen yok."}\n` +
      "Bu kişiye hitaben (sen diliyle) kişisel bir harita yorumu yaz: 180-240 kelime, üç paragraf. " +
      "Birinci paragraf Güneş, Ay ve yükselenin birlikte çizdiği karakter; ikinci paragraf aşk ve ilişkiler (Venüs, Mars); üçüncüsü yetenekler ve yol (Merkür, Jüpiter, Satürn). Sıcak ve güçlendirici bitir.";
    try {
      const metin = await askLlm(ASTROLOG_SISTEM, kullanici);
      const value = { id, metin, kaynak: "ai", harita };
      await writeCache(file, value);
      return value;
    } catch (error) {
      console.error("Harita yorumu üretilemedi:", error.message);
      return { id, metin: sabitHarita(harita), kaynak: "sabit" };
    }
  });
}

// --- Ses (Piper, Alev) ---

const sesVar = (cfg) => fs.existsSync(cfg.piperBin) && fs.existsSync(cfg.piperVoice);

function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 120_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} ${code}: ${stderr.slice(-200)}`));
    });
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

// Sesli okumada sembol, emoji ve kısaltmalar takılmasın.
const sesMetni = (text) =>
  text
    .replace(/[♈-♓☉☽☿♀♂♃♄♅♆♇℞]/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

async function sesDosyasi(cfg, text) {
  const clean = sesMetni(text).slice(0, 4000);
  const hash = crypto.createHash("sha1").update(`alev|${clean}`).digest("hex");
  const dir = path.join(cfg.base, "ses");
  const mp3 = path.join(dir, `${hash}.mp3`);
  const wav = path.join(dir, `${hash}.wav`);
  if (fs.existsSync(mp3)) return mp3;
  if (fs.existsSync(wav)) return wav;
  return once(`ses:${hash}`, async () => {
    await fs.promises.mkdir(dir, { recursive: true });
    const tmpWav = `${wav}.${process.pid}.tmp.wav`;
    await run(cfg.piperBin, ["--model", cfg.piperVoice, "--output_file", tmpWav, "--length_scale", "1.05", "--sentence_silence", "0.35"], `${clean}\n`);
    try {
      await run("lame", ["--quiet", "-b", "64", tmpWav, mp3]);
      await fs.promises.unlink(tmpWav).catch(() => {});
      return mp3;
    } catch {
      await fs.promises.rename(tmpWav, wav);
      return wav;
    }
  });
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
      "GET /api/astroloji/durum": async () => sendJson(response, 200, { ai: llmEnabled, ses: sesVar(cfg) }),
      "GET /api/astroloji/gunluk": async () => sendJson(response, 200, await gunlukYorum(cfg, burcParam())),
      "POST /api/astroloji/harita": async () => {
        const harita = haritaDogrula(await readJson(request));
        if (!harita) throw Object.assign(new Error("Harita bilgisi eksik."), { status: 400 });
        sendJson(response, 200, await haritaYorum(cfg, harita, user.id));
      },
      "GET /api/astroloji/ses": async () => {
        if (!sesVar(cfg)) throw Object.assign(new Error("Seslendirme henüz hazır değil."), { status: 503 });
        const tur = url.searchParams.get("tur");
        let text;
        if (tur === "burc") text = burcSesMetni(burcParam());
        else if (tur === "gunluk") {
          const burc = burcParam();
          text = `${Veri.burclar[burc].ad} burcu için bugün. ${(await gunlukYorum(cfg, burc)).metin}`;
        } else if (tur === "harita") {
          const id = String(url.searchParams.get("id") || "");
          if (!/^[0-9a-f]{16}$/.test(id)) throw Object.assign(new Error("Geçersiz harita."), { status: 400 });
          const cached = await readCache(path.join(cfg.base, "harita", `${id}.json`));
          if (!cached) throw Object.assign(new Error("Önce haritanı hesapla."), { status: 404 });
          text = cached.metin;
        } else throw Object.assign(new Error("Geçersiz istek."), { status: 400 });
        const file = await sesDosyasi(cfg, text);
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

module.exports = { createHandler, sabitHarita, haritaId };
