// Kontör defteri: her kullanıcının bakiyesi ve hareketleri DATA_DIR/kontor/<userId>.json dosyasında tutulur.
// Bütün değişiklikler kullanıcı başına sıraya alınır; bakiye hiçbir zaman eksiye düşmez.
// Yükleme PayTR bildiriminden (odeme.js), kupon kupon.js'ten, hediye yönetim panelinden gelir; harcama henüz bağlı değil.
const crypto = require("node:crypto");
const path = require("node:path");
const { yardimci } = require("./astroloji-api");

const { readCache, writeCache } = yardimci;

const TURLER = { yukleme: "Kontör yükleme", kupon: "Kupon", harcama: "Harcama", hediye: "Hediye", iade: "İade" };

// Aynı klasör için tek defter: arşiv, yönetim ve ödeme aynı kuyruğu paylaşır.
const defterler = new Map();
function kontorDefteri(dataDir) {
  if (!defterler.has(dataDir)) defterler.set(dataDir, yeniDefter(dataDir));
  return defterler.get(dataDir);
}

function yeniDefter(dataDir) {
  const dosya = (userId) => path.join(dataDir, "kontor", `${String(userId).replace(/[^a-zA-Z0-9-]/g, "")}.json`);
  const kuyruk = new Map();

  async function oku(userId) {
    const d = await readCache(dosya(userId));
    return { bakiye: d?.bakiye || 0, hareketler: d?.hareketler || [] };
  }

  // miktar: + yükleme/hediye/iade, - harcama. Yetersiz bakiyede hata fırlatır.
  function hareketEkle(userId, { miktar, tur, aciklama = "", ref = "" }) {
    if (!Number.isInteger(miktar) || miktar === 0 || !TURLER[tur]) return Promise.reject(new Error("Geçersiz kontör hareketi"));
    const is = (kuyruk.get(userId) || Promise.resolve()).then(async () => {
      const d = await oku(userId);
      if (d.bakiye + miktar < 0) throw Object.assign(new Error("Kontör bakiyen yetersiz."), { status: 402 });
      const hareket = { id: crypto.randomBytes(6).toString("hex"), tarih: Date.now(), tur, miktar, aciklama: String(aciklama).slice(0, 160), ref: String(ref).slice(0, 80), bakiyeSonra: d.bakiye + miktar };
      d.bakiye += miktar;
      d.hareketler.unshift(hareket);
      await writeCache(dosya(userId), d);
      return hareket;
    });
    kuyruk.set(userId, is.catch(() => {}));
    return is;
  }

  return { oku, hareketEkle };
}

module.exports = { kontorDefteri, TURLER };
