// Resim üretimi (Murat 2026-10-04): önce evdeki Acer'daki FLUX.2 klein (ücretsiz, 400×400 ~2 sn), Acer kapalıysa,
// sırası doluysa (429) ya da zaman aşımına düşerse quiz.ist üzerinden OpenAI. Motor ve boyut yönetim panelinden
// (Resim grubu) seçilir. Acer ucu https://ses.quiz.ist/flux/resim, anahtar ACER_FLUX_ANAHTAR (Coolify ortam değişkeni).
const Ayarlar = require("./ayarlar");
const Olcum = require("./olcum");

const OPENAI = { url: (process.env.RESIM_URL || "").trim(), token: (process.env.RESIM_TOKEN || "").trim() };
const ACER = {
  url: (process.env.ACER_FLUX_URL || "https://ses.quiz.ist/flux/resim").trim(),
  anahtar: (process.env.ACER_FLUX_ANAHTAR || "").trim(),
};
const openaiVar = Boolean(OPENAI.url && OPENAI.token);
const acerVar = Boolean(ACER.url && ACER.anahtar);

// Bölümler resim isteyip istemeyeceğine buna bakar: iki motordan biri bile kuruluysa resim üretilir.
const var_ = () => openaiVar || acerVar;

async function acerdan(prompt) {
  const boyut = Ayarlar.get("resim.acerBoyut");
  const r = await fetch(ACER.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Flux-Anahtar": ACER.anahtar },
    body: JSON.stringify({ prompt, width: boyut, height: boyut, steps: 4 }),
    signal: AbortSignal.timeout(Ayarlar.get("resim.acerZamanAsimi") * 1000),
  });
  if (!r.ok) throw new Error(`acer ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1000) throw new Error("acer boş resim döndü");
  return buf;
}

async function openaidan(prompt) {
  const r = await fetch(OPENAI.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ezoterist-Token": OPENAI.token },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(200_000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.imageBase64) throw new Error(`openai ${r.status}: ${String(d.error || "").slice(0, 160)}`);
  return Buffer.from(d.imageBase64, "base64");
}

// prompt → { buf (JPEG), motor: "acer" | "openai" }. bolum verilirse OpenAI'a gidenler maliyet ölçümüne yazılır.
async function uret(prompt, bolum) {
  if (Ayarlar.get("resim.motor") === "acer" && acerVar) {
    try {
      return { buf: await acerdan(prompt), motor: "acer" };
    } catch (error) {
      if (!openaiVar) throw error;
      console.warn("Acer FLUX kullanılamadı, OpenAI'a geçiliyor:", error.message);
    }
  }
  if (!openaiVar) throw new Error("resim motoru yok");
  const buf = await openaidan(prompt);
  if (bolum) Olcum.gorsel(bolum);
  return { buf, motor: "openai" };
}

module.exports = { uret, var: var_ };
