// Kişisel arşiv: kullanıcının bütün bölümlerdeki analizleri, uzman talepleri ve kontör hesabı tek yerde.
// Profil ve şifre değişikliği auth.js'tedir (/api/profil, /api/sifre).
const fs = require("node:fs");
const path = require("node:path");
const { yardimci } = require("./astroloji-api");
const { kullaniciTalepleri } = require("./uzman-api");
const { kontorDefteri, TURLER } = require("./kontor");

const { sendJson, readCache } = yardimci;
const temizId = (userId) => String(userId).replace(/[^a-zA-Z0-9-]/g, "");

// Günlük tutan bölümler: klasör adı, görünen ad, sayfa bağlantısı ve kayıttan başlık çıkarma.
const GUNLUKLER = [
  { dizin: "ruya", ad: "Rüya Yorumu", link: "/ruya#gunluk", ikon: "🌙" },
  { dizin: "fal", ad: "Kahve Falı", link: "/kahve-fali#gunluk", ikon: "☕" },
  { dizin: "el-fali", ad: "El Falı", link: "/el-fali#gunluk", ikon: "✋" },
  { dizin: "tarot", ad: "Tarot", link: "/tarot#gunluk", ikon: "🃏" },
  { dizin: "yuz-okuma", ad: "Yüz Okuma", link: "/yuz-okuma#gunluk", ikon: "🙂" },
  { dizin: "fotograf-analizi", ad: "Fotoğraf Analizi", link: "/fotograf-analizi#gunluk", ikon: "📷" },
  { dizin: "ask-uyumu", ad: "Aşk Uyumu", link: "/ask-uyumu#gunluk", ikon: "💞", baslik: (k) => `${k.sen?.ad} ♥ ${k.o?.ad} · %${k.sonuc?.toplam}` },
  { dizin: "melek-sayilari", ad: "Melek Sayıları", link: "/melek-sayilari#gunluk", ikon: "👼", baslik: (k) => `${k.sayi} · ${k.yorum?.baslik || ""}` },
  { dizin: "iching", ad: "I Ching", link: "/iching#gunluk", ikon: "☯", baslik: (k) => k.yorum?.baslik || k.soru },
  { dizin: "run", ad: "Rün Taşları", link: "/run-taslari#gunluk", ikon: "ᚱ" },
  { dizin: "cakra", ad: "Çakra Testi", link: "/cakralar#gunluk", ikon: "🌈" },
  { dizin: "kristal", ad: "Kristal Önerisi", link: "/kristaller#gunluk", ikon: "💎" },
];

const baslikBul = (k) => k.yorum?.baslik || k.fal?.baslik || k.fal?.ozet?.slice(0, 80) || "";

async function analizleriTopla(dataDir, userId) {
  const id = temizId(userId);
  const liste = [];
  await Promise.all(GUNLUKLER.map(async (g) => {
    const kayitlar = (await readCache(path.join(dataDir, g.dizin, id, "gunluk.json"))) || [];
    kayitlar.forEach((k) => {
      liste.push({ bolum: g.ad, ikon: g.ikon, link: g.link, tarih: k.tarih, baslik: (g.baslik ? g.baslik(k) : baslikBul(k)) || g.ad, ai: (k.kaynak || "ai") === "ai" });
    });
  }));

  // Tek kayıtlı bölümler: doğum haritası (astroloji) ve numeroloji profili.
  const harita = await readCache(path.join(dataDir, "astroloji", "kullanici", `${id}.json`));
  if (harita?.olusturma) liste.push({ bolum: "Doğum Haritası", ikon: "✨", link: "/dogum-haritasi", tarih: harita.olusturma, baslik: "Doğum haritam ve yorumu", ai: harita.kaynak === "ai" });
  const numeroloji = await readCache(path.join(dataDir, "numeroloji", "kullanici", `${id}.json`));
  if (numeroloji?.olusturma) liste.push({ bolum: "Numeroloji", ikon: "🔢", link: "/numeroloji", tarih: numeroloji.olusturma, baslik: `${numeroloji.girdi?.adSoyad || "Numeroloji"} profili`, ai: numeroloji.kaynak === "ai" });

  // Ruhsal günlük: yansıma alınmış sayfalar ve haftalık özetler.
  const ruhsal = await readCache(path.join(dataDir, "ruhsal-gunluk", id, "gunluk.json"));
  (ruhsal?.kayitlar || []).filter((k) => k.yansima).forEach((k) => liste.push({ bolum: "Ruhsal Günlük", ikon: "📖", link: "/ruhsal-gunluk#kayitlar", tarih: k.yansima.tarih, baslik: `${k.gun} sayfasına yansıma`, ai: true }));
  (ruhsal?.ozetler || []).forEach((o) => liste.push({ bolum: "Ruhsal Günlük", ikon: "📖", link: "/ruhsal-gunluk#ozet", tarih: o.tarih, baslik: `Haftalık özet · ${o.baslik}`, ai: true }));

  // Ay döngüsü rehberleri.
  const ayDizin = path.join(dataDir, "ay-takvimi", id);
  const ayDosyalar = (await fs.promises.readdir(ayDizin).catch(() => [])).filter((f) => /^rehber-.*\.json$/.test(f));
  for (const f of ayDosyalar) {
    const r = await readCache(path.join(ayDizin, f));
    if (r) liste.push({ bolum: "Ay Takvimi", ikon: "🌕", link: "/ay-takvimi#rehber", tarih: r.tarih, baslik: r.rehber?.baslik || "Ay döngüsü rehberi", ai: r.kaynak === "ai" });
  }
  return liste.filter((x) => x.tarih).sort((a, b) => b.tarih - a.tarih);
}

function createHandler({ dataDir, currentUser }) {
  const kontor = kontorDefteri(dataDir);

  return function handleArsivRequest(request, response, url) {
    if (url.pathname !== "/api/arsiv" && !url.pathname.startsWith("/api/kontor")) return false;
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Giriş yapmalısınız." });
      return true;
    }
    const routes = {
      "GET /api/arsiv": async () => {
        const [analizler, talepler, hesap] = await Promise.all([analizleriTopla(dataDir, user.id), kullaniciTalepleri(dataDir, user.id), kontor.oku(user.id)]);
        sendJson(response, 200, { analizler, talepler, kontor: { ...hesap, turler: TURLER, yuklemeAcik: false } });
      },
      "GET /api/kontor": async () => sendJson(response, 200, { ...(await kontor.oku(user.id)), turler: TURLER, yuklemeAcik: false }),
      // Ödeme altyapısı hazır olunca burada ödeme başlatılacak; şimdilik kapalı.
      "POST /api/kontor/yukle": async () => sendJson(response, 503, { error: "Kontör yükleme çok yakında açılacak." }),
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
        console.error("Arşiv:", error);
        sendJson(response, 500, { error: "Bir sorun oluştu. Lütfen tekrar deneyin." });
      });
    return true;
  };
}

module.exports = { createHandler };
