// Numeroloji bölümünün sunucu uçları: kişisel gün yorumu, numeroloji profili ve seslendirme.
// Astrolojiyle aynı kurallar: günlük yorum her sayı için günde bir kez; profil kullanıcıya kaydedilir,
// farklı bilgilerle yeni profil 3 günde bir. Yorumlar V100'deki Gemma'dan, ses Piper'dan gelir.
const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const Numeroloji = require("./numeroloji-hesap");
const Veri = require("./numeroloji-veri");
const { yardimci } = require("./astroloji-api");

const { sendJson, readJson, readCache, writeCache, sesDosyasi, sesVar, kullaniciDosyasi, askLlm, once, bugun, llmEnabled } = yardimci;

const PROFIL_ARALIK_MS = 3 * 24 * 60 * 60 * 1000;
const NUMEROLOG_SISTEM =
  "Sen Ezoter.ist'in baş numeroloğusun. Türkçe, sıcak, akıcı ve umut veren bir dille yazarsın; metnin sesli okunacak. " +
  "Kesin kehanetlerde bulunma, korkutma; sağlık, hukuk ve para konularında kesin tavsiye verme. " +
  "Başlık, madde işareti, emoji, yıldız ya da markdown kullanma; düz paragraflar yaz. Sana verilen sayılara sadık kal, yeni sayı uydurma.";

const hata = (message, status = 400) => Object.assign(new Error(message), { status });
const sayiAdi = (n) => `${n} (${Veri.sayilar[n].ad})`;

// --- Kişisel gün ---

async function gunlukYorum(cfg, sayi) {
  const tarih = bugun();
  const sabit = { tarih, sayi, metin: Veri.gunEnerjisi[sayi], kaynak: "sabit" };
  if (!llmEnabled) return sabit;
  const file = path.join(cfg.base, "gunluk", tarih, `${sayi}.json`);
  const cached = await readCache(file);
  if (cached) return cached;
  return once(`num-gunluk:${tarih}:${sayi}`, async () => {
    const b = Numeroloji.bugun();
    const evrensel = Numeroloji.evrenselGun(b.gun, b.ay, b.yil);
    const kullanici =
      `Bugün ${tarih}; evrensel gün sayısı ${evrensel}. Okuyucunun kişisel gün sayısı ${sayi}: ${Veri.gunEnerjisi[sayi]}\n` +
      `Kişisel günü ${sayi} olan biri için bugünün numeroloji yorumunu yaz: 90-130 kelime, iki kısa paragraf. ` +
      "Günün enerjisini anlat, sonra aşk ve iş için birer somut öneri ver. Son cümle kısa bir günün tavsiyesi olsun.";
    try {
      const value = { tarih, sayi, metin: await askLlm(NUMEROLOG_SISTEM, kullanici), kaynak: "ai" };
      await writeCache(file, value);
      eskiGunleriSil(cfg).catch(() => {});
      return value;
    } catch (error) {
      console.error("Numeroloji günlük yorum üretilemedi:", error.message);
      return sabit;
    }
  });
}

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

// --- Profil ---

function girdiDogrula(body) {
  const g = body?.girdi || {};
  const adSoyad = String(g.adSoyad || "").replace(/\s+/g, " ").trim();
  const tarih = String(g.tarih || "");
  if (adSoyad.length < 3 || adSoyad.length > 80 || !/^[\p{L}' -]+$/u.test(adSoyad)) return null;
  if (adSoyad.split(" ").length < 2) return null;
  const yil = Number(tarih.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih) || yil < 1900 || yil > 2049) return null;
  return { adSoyad, tarih };
}

const ayniGirdi = (a, b) => Boolean(a && b) && a.adSoyad.toLocaleLowerCase("tr-TR") === b.adSoyad.toLocaleLowerCase("tr-TR") && a.tarih === b.tarih;

function sabitProfil(p) {
  const s = p.sayilar;
  const yy = Veri.sayilar[s.yasamYolu];
  return [
    `Yaşam yolu sayın ${sayiAdi(s.yasamYolu)}. ${yy.ozet}`,
    `Kader sayın ${s.kader}: ${Veri.sayilar[s.kader].anahtar.join(", ")}. Ruh güdün ${s.ruh}: ${Veri.sayilar[s.ruh].anahtar.join(", ")}.`,
    `Bu yıl kişisel yılın ${s.kisiselYil}. ${Veri.kisiselYil[s.kisiselYil]}`,
  ].join(" ");
}

// Aynı sayılara sahip profiller yorumu paylaşır (isim metne girmez).
async function profilMetni(cfg, p) {
  const anahtar = JSON.stringify([p.sayilar, p.eksik, p.karmikBorclar]);
  const id = crypto.createHash("sha1").update(anahtar).digest("hex").slice(0, 16);
  const file = path.join(cfg.base, "profil", `${id}.json`);
  const cached = await readCache(file);
  if (cached) return cached;
  if (!llmEnabled) return { id, metin: sabitProfil(p), kaynak: "sabit" };
  return once(`num-profil:${id}`, async () => {
    const s = p.sayilar;
    const kullanici =
      `Numeroloji profili: Yaşam Yolu ${sayiAdi(s.yasamYolu)}, Kader ${sayiAdi(s.kader)}, Ruh Güdüsü ${sayiAdi(s.ruh)}, ` +
      `Kişilik ${sayiAdi(s.kisilik)}, Doğum Günü ${s.dogumGunu}, Olgunluk ${s.olgunluk}, bu yılın Kişisel Yılı ${s.kisiselYil}.` +
      `${p.karmikBorclar.length ? ` Karmik borçlar: ${p.karmikBorclar.join(", ")}.` : ""}` +
      `${p.eksik.length ? ` Adında eksik sayılar: ${p.eksik.join(", ")}.` : ""}\n` +
      "Bu kişiye hitaben (sen diliyle) kişisel bir numeroloji yorumu yaz: 200-260 kelime, üç paragraf. " +
      "Birinci paragraf Yaşam Yolu ile Kader'in birlikte çizdiği karakter ve hayat amacı; ikinci paragraf Ruh Güdüsü ve Kişilik üzerinden iç dünya ile dışarıdan görünüş, aşk ve ilişkiler; " +
      "üçüncü paragraf bu yılın kişisel yılı, varsa karmik dersler ve eksik sayılar üzerinden önündeki fırsatlar. Sıcak ve güçlendirici bitir.";
    try {
      const value = { id, metin: await askLlm(NUMEROLOG_SISTEM, kullanici), kaynak: "ai" };
      await writeCache(file, value);
      return value;
    } catch (error) {
      console.error("Numeroloji profil yorumu üretilemedi:", error.message);
      return { id, metin: sabitProfil(p), kaynak: "sabit" };
    }
  });
}

// Kilit yalnız yapay zekâ yorumunda işler; bağlantı yokken üretilen sabit yorum yenilenebilir.
function profilCevabi(kayit, extra = {}) {
  const kilitBitis = kayit.kaynak === "ai" ? kayit.olusturma + PROFIL_ARALIK_MS : 0;
  return { ...kayit, yeniProfilTarihi: kilitBitis > Date.now() ? kilitBitis : null, ...extra };
}

async function profilOlustur(cfg, userId, girdi) {
  const file = kullaniciDosyasi(cfg, userId);
  const kayit = await readCache(file);
  if (kayit?.kaynak === "ai") {
    if (ayniGirdi(kayit.girdi, girdi)) return profilCevabi(kayit);
    if (Date.now() - kayit.olusturma < PROFIL_ARALIK_MS) return profilCevabi(kayit, { kilitli: true });
  }
  const p = Numeroloji.profil(girdi.adSoyad, girdi.tarih);
  const yorum = await profilMetni(cfg, p);
  const yeni = { id: yorum.id, girdi, sayilar: p.sayilar, eksik: p.eksik, karmikBorclar: p.karmikBorclar, metin: yorum.metin, kaynak: yorum.kaynak, olusturma: Date.now() };
  await writeCache(file, yeni);
  return profilCevabi(yeni);
}

function sayiSesMetni(n) {
  const s = Veri.sayilar[n];
  return `${n} sayısı, ${s.ad}. ${s.ozet} Güçlü yanları: ${s.guclu.join(", ")}. Aşkta: ${s.ask} İş hayatında: ${s.kariyer}`;
}

// --- Yönlendirme ---

function createHandler({ dataDir, currentUser, sendFile }) {
  const cfg = { base: path.join(dataDir, "numeroloji") };

  return function handleNumerolojiRequest(request, response, url) {
    if (!url.pathname.startsWith("/api/numeroloji/")) return false;
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Giriş yapmalısınız." });
      return true;
    }
    const sayiParam = (izin) => {
      const n = Number(url.searchParams.get("sayi"));
      if (!izin.includes(n)) throw hata("Geçersiz sayı.");
      return n;
    };
    const GUN_SAYILARI = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const TUM_SAYILAR = Object.keys(Veri.sayilar).map(Number);

    const routes = {
      "GET /api/numeroloji/gunluk": async () => sendJson(response, 200, await gunlukYorum(cfg, sayiParam(GUN_SAYILARI))),
      "GET /api/numeroloji/profil": async () => {
        const kayit = await readCache(kullaniciDosyasi(cfg, user.id));
        sendJson(response, 200, kayit ? profilCevabi(kayit) : {});
      },
      "POST /api/numeroloji/profil": async () => {
        const girdi = girdiDogrula(await readJson(request));
        if (!girdi) throw hata("Doğumdaki tam adını (ad ve soyad) ve doğum tarihini gir.");
        sendJson(response, 200, await profilOlustur(cfg, user.id, girdi));
      },
      "GET /api/numeroloji/ses": async () => {
        if (!sesVar()) throw hata("Seslendirme henüz hazır değil.", 503);
        const tur = url.searchParams.get("tur");
        let file;
        if (tur === "sayi") {
          const n = sayiParam(TUM_SAYILAR);
          file = await sesDosyasi(sayiSesMetni(n), path.join(cfg.base, "ses"), `sayi-${n}`);
        } else if (tur === "gunluk") {
          const n = sayiParam(GUN_SAYILARI);
          const gunluk = await gunlukYorum(cfg, n);
          file = await sesDosyasi(`Kişisel günün ${n}. ${gunluk.metin}`, path.join(cfg.base, "gunluk", gunluk.tarih), `gun-${n}`);
        } else if (tur === "profil") {
          const kayit = await readCache(kullaniciDosyasi(cfg, user.id));
          if (!kayit) throw hata("Önce numeroloji profilini çıkar.", 404);
          file = await sesDosyasi(kayit.metin, path.join(cfg.base, "profil"), kayit.id);
        } else throw hata("Geçersiz istek.");
        sendFile(request, response, file);
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
        if (status === 500) console.error("Numeroloji:", error);
        sendJson(response, status, { error: status === 500 ? "Bir sorun oluştu. Lütfen tekrar deneyin." : error.message });
      });
    return true;
  };
}

module.exports = { createHandler, numerolojiKullaniciDosyasi: (dataDir, userId) => kullaniciDosyasi({ base: path.join(dataDir, "numeroloji") }, userId) };
