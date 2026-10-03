// Yüz Müziği (Murat 2026-10-03): kişinin yüz ölçümlerinden tarayıcıda üretilen uyku/rahatlama müziği.
// Sunucu yalnız ölçümleri verir: Yüz Okuma kayıtlarındaki ölçümler + bu sayfada taranıp kaydedilen son yüz
// (fotoğraf saklanmaz, yalnız sayılar). Müzik ve animasyon tamamen tarayıcıda üretilir; yapay zekâ ya da GPU kullanılmaz.
const path = require("node:path");
const { yardimci } = require("./astroloji-api");

const { sendJson, readJson, readCache, writeCache } = yardimci;
const SEKILLER = ["oval", "yuvarlak", "kare", "kalp", "uzun", "elmas"];
const hata = (message, status = 400) => Object.assign(new Error(message), { status });
const temizId = (id) => String(id).replace(/[^a-zA-Z0-9-]/g, "");

function olcumAl(o) {
  if (!o || typeof o !== "object") return null;
  const sayi = (v, min, max) => (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max ? Math.round(Number(v) * 100) / 100 : null);
  const olcum = {
    oran: sayi(o.oran, 0.8, 2.2),
    altinUyum: sayi(o.altinUyum, 0, 100),
    sekil: SEKILLER.includes(o.sekil) ? o.sekil : "",
    alinCene: sayi(o.alinCene, 0.5, 2),
    elmacikCene: sayi(o.elmacikCene, 0.5, 2),
    gozAraligi: sayi(o.gozAraligi, 0.4, 2),
  };
  return olcum.oran && olcum.sekil ? olcum : null;
}

function createHandler({ dataDir, currentUser }) {
  const kendiDosyasi = (userId) => path.join(dataDir, "yuz-muzigi", `${temizId(userId)}.json`);
  const yuzGunlugu = (userId) => path.join(dataDir, "yuz-okuma", temizId(userId), "gunluk.json");

  return function handleYuzMuzigiRequest(request, response, url) {
    if (!url.pathname.startsWith("/api/yuz-muzigi/")) return false;
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Giriş yapmalısınız." });
      return true;
    }
    const routes = {
      // Kullanılabilecek yüzler: önce bu sayfada taranan, sonra Yüz Okuma kayıtları (yeniden eskiye).
      "GET /api/yuz-muzigi/yuzler": async () => {
        const kendi = await readCache(kendiDosyasi(user.id));
        const gunluk = (await readCache(yuzGunlugu(user.id))) || [];
        const yuzler = [
          ...(kendi?.olcumler ? [{ id: "tarama", ad: "Bu sayfada taranan yüzün", tarih: kendi.tarih, olcumler: kendi.olcumler }] : []),
          ...gunluk
            .filter((k) => olcumAl(k.girdi?.olcumler))
            .slice(0, 12)
            .map((k) => ({ id: k.id, ad: k.fal?.baslik || "Yüz okuman", tarih: k.tarih, olcumler: olcumAl(k.girdi.olcumler) })),
        ];
        sendJson(response, 200, { yuzler });
      },
      "POST /api/yuz-muzigi/tarama": async () => {
        const body = await readJson(request);
        const olcumler = olcumAl(body?.olcumler);
        if (!olcumler) throw hata("Yüz ölçülemedi. Yüzün tam karşıdan ve aydınlık görünsün, tekrar dene.");
        await writeCache(kendiDosyasi(user.id), { tarih: Date.now(), olcumler });
        sendJson(response, 200, { yuz: { id: "tarama", ad: "Bu sayfada taranan yüzün", tarih: Date.now(), olcumler } });
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
        if (status === 500) console.error("Yüz müziği:", error);
        sendJson(response, status, { error: status === 500 ? "Bir sorun oluştu. Lütfen tekrar deneyin." : error.message });
      });
    return true;
  };
}

module.exports = { createHandler };
