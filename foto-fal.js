// Fotoğrafla bakılan fallar için ortak altyapı (kahve falı, el falı): fotoğrafı al ve denetle, Gemma 4'e
// fotoğrafla birlikte sor, cevabı JSON'dan ayıkla, kullanıcının kendi günlüğüne fotoğraflarıyla kaydet.
// Kişi başı günlük hak ayrı sayılır (silmek hak vermez); konu dışı fotoğraf hak yemez. Seslendirme Piper.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { yardimci } = require("./astroloji-api");

const { sendJson, readJson, readCache, writeCache, sesDosyasi, sesVar, askLlm, bugun, llmEnabled } = yardimci;

const MAX_FOTO_BAYT = 2 * 1024 * 1024;
const MAX_GOVDE_BAYT = 9 * 1024 * 1024;

const hata = (message, status = 400) => Object.assign(new Error(message), { status });
const kisalt = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

function jsonAyikla(metin) {
  const bas = metin.indexOf("{");
  const son = metin.lastIndexOf("}");
  if (bas === -1 || son <= bas) throw new Error("Cevap JSON değil");
  // Model bazen görünmez boşluk (U+00A0 vb.) ya da sondaki fazladan virgül ekler; JSON.parse bunlara takılır.
  const temiz = metin.slice(bas, son + 1).replace(/[\u00a0\u2000-\u200b\u202f\u3000\ufeff]/g, " ").replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(temiz);
}

// Fotoğraflar tarayıcıda JPEG'e çevrilip küçültülür; burada yalnız biçim ve boyut denetlenir.
function fotoCoz(veri) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(veri || ""));
  if (!m) throw hata("Fotoğraf okunamadı; lütfen tekrar seç.");
  const buf = Buffer.from(m[1], "base64");
  if (buf.length > MAX_FOTO_BAYT) throw hata("Fotoğraf çok büyük.");
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) throw hata("Fotoğraf biçimi tanınmadı.");
  return buf;
}

/**
 * ayar: {
 *   ad: günlüklerde görünen ad, apiYolu: "/api/fal/", dizinAdi: "fal", gunlukSinir, maxFoto,
 *   sistem: sistem talimatı, istek(girdi) → fotoğraflarla gönderilecek metin (JSON kalıbı dahil),
 *   kontrolAlani: "fincanMi" gibi; false gelirse redMesaji ile 422,
 *   girdiAl(body, fotoSayisi) → kayda yazılacak girdi, temizle(ham) → yorum nesnesi, okunus(yorum) → sesli metin,
 *   mesajlar: { musaitDegil, sinir, okunamadi }
 * }
 */
function fotoFal(ayar) {
  const kullaniciDizini = (dataDir, userId) => path.join(dataDir, ayar.dizinAdi, String(userId).replace(/[^a-zA-Z0-9-]/g, ""));
  const gunlukOku = async (dataDir, userId) => (await readCache(path.join(kullaniciDizini(dataDir, userId), "gunluk.json"))) || [];
  const fotoYolu = (dataDir, userId, kayitId, n) => path.join(kullaniciDizini(dataDir, userId), `${kayitId}-${n}.jpg`);

  // Uzman yorumu için: kullanıcının seçtiği kayıt, okunuş metniyle (uzman-api.js kullanır).
  async function kayitOku(dataDir, userId, kayitId) {
    const kayit = (await gunlukOku(dataDir, userId)).find((k) => k.id === kayitId);
    return kayit ? { ...kayit, metin: ayar.okunus(kayit.fal) } : null;
  }

  function createHandler({ dataDir, currentUser, sendFile }) {
    const dizin = (userId) => kullaniciDizini(dataDir, userId);

    const kuyruk = new Map();
    function kayitGuncelle(userId, fn) {
      const is = (kuyruk.get(userId) || Promise.resolve()).then(async () => {
        const gunluk = await gunlukOku(dataDir, userId);
        const sonuc = fn(gunluk);
        await writeCache(path.join(dizin(userId), "gunluk.json"), gunluk);
        return sonuc;
      });
      kuyruk.set(userId, is.catch(() => {}));
      return is;
    }

    const sayacDosyasi = (userId) => path.join(dizin(userId), "sayac.json");
    async function bugunkuSayi(userId) {
      const sayac = await readCache(sayacDosyasi(userId));
      return sayac?.gun === bugun() ? sayac.adet : 0;
    }
    const sayacArttir = async (userId) => writeCache(sayacDosyasi(userId), { gun: bugun(), adet: (await bugunkuSayi(userId)) + 1 });

    async function govdeOku(request) {
      const parcalar = [];
      let boyut = 0;
      for await (const parca of request) {
        boyut += parca.length;
        if (boyut > MAX_GOVDE_BAYT) throw hata("Fotoğraflar çok büyük.", 413);
        parcalar.push(parca);
      }
      try {
        return JSON.parse(Buffer.concat(parcalar).toString("utf8") || "{}");
      } catch {
        throw hata("Geçersiz istek.");
      }
    }

    async function bak(user, body) {
      if (!llmEnabled) throw hata(ayar.mesajlar.musaitDegil, 503);
      if ((await bugunkuSayi(user.id)) >= ayar.gunlukSinir) throw hata(ayar.mesajlar.sinir, 429);
      const fotolar = (Array.isArray(body?.fotolar) ? body.fotolar : []).slice(0, ayar.maxFoto).map(fotoCoz);
      if (!fotolar.length) throw hata("Fotoğraf ekle.");
      const girdi = { ...ayar.girdiAl(body, fotolar.length), fotoSayisi: fotolar.length };

      const icerik = [
        { type: "text", text: ayar.istek(girdi) },
        ...fotolar.map((b) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b.toString("base64")}` } })),
      ];
      let ham;
      try {
        ham = jsonAyikla(await askLlm(ayar.sistem, icerik, { maxTokens: 1600, temperature: 0.8 }));
      } catch (error) {
        console.error(`${ayar.ad} bakılamadı:`, error.message);
        throw hata(ayar.mesajlar.okunamadi, 502);
      }
      if (ham[ayar.kontrolAlani] === false) throw hata(ayar.redMesaji, 422);

      const kayit = { id: crypto.randomBytes(8).toString("hex"), tarih: Date.now(), girdi, fal: ayar.temizle(ham) };
      await fs.promises.mkdir(dizin(user.id), { recursive: true });
      await Promise.all(fotolar.map((b, n) => fs.promises.writeFile(fotoYolu(dataDir, user.id, kayit.id, n), b)));
      await kayitGuncelle(user.id, (g) => { g.unshift(kayit); });
      await sayacArttir(user.id);
      return { kayit, kalan: Math.max(0, ayar.gunlukSinir - (await bugunkuSayi(user.id))) };
    }

    return function handleFotoFalRequest(request, response, url) {
      if (!url.pathname.startsWith(ayar.apiYolu)) return false;
      const user = currentUser(request);
      if (!user) {
        sendJson(response, 401, { error: "Giriş yapmalısınız." });
        return true;
      }
      const idParam = () => String(url.searchParams.get("id") || "").replace(/[^0-9a-f]/g, "");
      const kayitBul = async () => {
        const kayit = (await gunlukOku(dataDir, user.id)).find((k) => k.id === idParam());
        if (!kayit) throw hata("Kayıt bulunamadı.", 404);
        return kayit;
      };
      const yol = (ad) => `${ayar.apiYolu}${ad}`;

      const routes = {
        [`GET ${yol("gunluk")}`]: async () => {
          const gunluk = await gunlukOku(dataDir, user.id);
          sendJson(response, 200, { kayitlar: gunluk, kalan: Math.max(0, ayar.gunlukSinir - (await bugunkuSayi(user.id))), sinir: ayar.gunlukSinir, ses: sesVar(), ai: llmEnabled });
        },
        [`POST ${yol("bak")}`]: async () => sendJson(response, 201, await bak(user, await govdeOku(request))),
        [`POST ${yol("sil")}`]: async () => {
          const body = await readJson(request);
          const id = String(body?.id || "").replace(/[^0-9a-f]/g, "");
          const silinen = await kayitGuncelle(user.id, (g) => {
            const i = g.findIndex((k) => k.id === id);
            return i === -1 ? null : g.splice(i, 1)[0];
          });
          if (silinen) await Promise.all([...Array(silinen.girdi.fotoSayisi).keys()].map((n) => fs.promises.rm(fotoYolu(dataDir, user.id, id, n), { force: true })));
          sendJson(response, 200, { ok: true });
        },
        [`GET ${yol("foto")}`]: async () => {
          const kayit = await kayitBul();
          const n = Number(url.searchParams.get("n") || 0);
          if (!Number.isInteger(n) || n < 0 || n >= kayit.girdi.fotoSayisi) throw hata("Fotoğraf bulunamadı.", 404);
          sendFile(request, response, fotoYolu(dataDir, user.id, kayit.id, n));
        },
        [`GET ${yol("ses")}`]: async () => {
          if (!sesVar()) throw hata("Seslendirme henüz hazır değil.", 503);
          const kayit = await kayitBul();
          sendFile(request, response, await sesDosyasi(ayar.okunus(kayit.fal), dizin(user.id), `${kayit.id}-ses`));
        },
      };

      const handler = routes[`${request.method} ${url.pathname}`];
      if (!handler) {
        sendJson(response, 404, { error: "Bulunamadı." });
        return true;
      }
      Promise.resolve()
        .then(handler)
        .catch((error) => {
          if (response.headersSent) return response.destroy();
          const status = error.status || 500;
          if (status === 500) console.error(`${ayar.ad}:`, error);
          sendJson(response, status, { error: status === 500 ? "Bir sorun oluştu. Lütfen tekrar deneyin." : error.message });
        });
      return true;
    };
  }

  return { createHandler, kayitOku, fotoYolu };
}

module.exports = { fotoFal, kisalt };
