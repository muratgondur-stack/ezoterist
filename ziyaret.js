// Ana sayfanın alt satırındaki ziyaretçi sayacı (quiz.ist'teki gibi, Murat 2026-10-03).
// Her ana sayfa açılışında POST /api/ziyaret: bugünkü açılış +1; tarayıcı kimliği bugün ilk kez görülüyorsa tekil +1.
// Kimlik tarayıcıda üretilen rastgele bir değerin özetidir; IP ya da kişisel veri tutulmaz. DATA_DIR/ziyaret.json.
const crypto = require("node:crypto");
const path = require("node:path");
const { yardimci } = require("./astroloji-api");

const { sendJson, readJson, readCache, writeCache, bugun } = yardimci;

function createHandler({ dataDir }) {
  const dosya = path.join(dataDir, "ziyaret.json");
  let durum = null;
  let yazma = Promise.resolve();

  async function yukle() {
    if (!durum) durum = (await readCache(dosya)) || { gun: bugun(), acilis: 0, tekil: 0, toplam: 0, gorulen: [] };
    if (durum.gun !== bugun()) Object.assign(durum, { gun: bugun(), acilis: 0, tekil: 0, gorulen: [] });
    return durum;
  }
  const ozet = (d) => ({ bugun: d.tekil, acilis: d.acilis, toplam: d.toplam });

  return function handleZiyaretRequest(request, response, url) {
    if (url.pathname !== "/api/ziyaret") return false;
    Promise.resolve()
      .then(async () => {
        const d = await yukle();
        if (request.method === "POST") {
          const body = await readJson(request).catch(() => ({}));
          const kimlik = String(body?.kimlik || "").slice(0, 64);
          d.acilis += 1;
          const iz = kimlik ? crypto.createHash("sha256").update(`${d.gun}:${kimlik}`).digest("hex").slice(0, 16) : "";
          if (iz && !d.gorulen.includes(iz) && d.gorulen.length < 200000) {
            d.gorulen.push(iz);
            d.tekil += 1;
            d.toplam += 1;
          }
          yazma = yazma.then(() => writeCache(dosya, d)).catch(() => {});
        }
        sendJson(response, 200, ozet(d));
      })
      .catch(() => sendJson(response, 500, { error: "Sayaç okunamadı." }));
    return true;
  };
}

module.exports = { createHandler };
