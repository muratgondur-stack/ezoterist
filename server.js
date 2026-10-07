const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
require("./bellek-fs"); // ziyaretçi verisi diske yazılmaz, yalnız bellekte durur
const { handleRehberRequest } = require("./rehber");
const { reklamEkle } = require("./reklam");
const { handleAuthRequest, dataDir, currentUser, kullaniciListesi, kullaniciSil } = require("./auth");
const Ayarlar = require("./ayarlar");
const Olcum = require("./olcum");
const { createHandler: createYonetimHandler } = require("./yonetim-api");
const { createHandler: createAstrolojiHandler } = require("./astroloji-api");
const { createHandler: createUzmanHandler, yorumcuAnahtari } = require("./uzman-api");
const UzmanKayit = require("./uzman-kayit");
const Promptlar = require("./uzman-promptlari");
const { createHandler: createNumerolojiHandler } = require("./numeroloji-api");
const { createHandler: createRuyaHandler } = require("./ruya-api");
const { createHandler: createFalHandler } = require("./fal-api");
const { createHandler: createElFaliHandler } = require("./el-fali-api");
const { createHandler: createTarotHandler } = require("./tarot-api");
const { createHandler: createYuzHandler } = require("./yuz-okuma-api");
const { createHandler: createAnalizHandler } = require("./fotograf-analiz-api");
const { createHandler: createAskHandler } = require("./ask-uyumu-api");
const { createHandler: createDogumHandler } = require("./dogum-haritasi-api");
const { createHandler: createMelekHandler } = require("./melek-sayilari-api");
const { createHandler: createIChingHandler } = require("./iching-api");
const { createHandler: createRunHandler } = require("./run-api");
const { createHandler: createAyHandler } = require("./ay-takvimi-api");
const { createHandler: createCakraKristalHandler } = require("./cakra-kristal-api");
const { createHandler: createArsivHandler } = require("./arsiv-api");
const { createHandler: createRuhsalHandler } = require("./ruhsal-gunluk-api");
const { createHandler: createSembolHandler } = require("./sembol-api");
const { createHandler: createAsistanHandler } = require("./asistan-api");
const { createHandler: createDizimHandler } = require("./dizim-api");
const { createHandler: createYuzMuzigiHandler } = require("./yuz-muzigi-api");
const { createHandler: createEbcedCifirHandler } = require("./ebced-cifir-api");

const configuredPort = Number.parseInt(process.env.PORT || "", 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
const root = __dirname;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
};

// iOS Safari probes video with `Range: bytes=0-1` and refuses to play unless the
// server answers 206. Returns null to serve the whole file, or "invalid" for 416.
function parseRange(header, size) {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start;
  let end;

  if (rawStart === "") {
    const suffixLength = Number(rawEnd);
    if (suffixLength === 0) return "invalid";
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }

  if (!Number.isInteger(start) || !Number.isInteger(end)) return "invalid";
  if (start > end || start >= size) return "invalid";

  return { start, end };
}

// HTML sayfaları okunup reklam kodu (yönetim → Reklam ayarları) eklenerek gönderilir; değişiklik hemen geçerli olsun
// diye 304 kullanılmaz (sayfalar küçük, zaten "no-cache").
function sendHtml(request, response, filePath) {
  fs.readFile(filePath, "utf8", (error, html) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    const govde = Buffer.from(reklamEkle(html, request.url));
    response.writeHead(200, { "Content-Type": contentTypes[".html"], "Cache-Control": "no-cache", "Content-Length": govde.length });
    response.end(request.method === "HEAD" ? undefined : govde);
  });
}

function sendFile(request, response, filePath) {
  if (path.extname(filePath) === ".html") return sendHtml(request, response, filePath);
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      const notFound = !error || error.code === "ENOENT";
      response.writeHead(notFound ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(notFound ? "Not found" : "Server error");
      return;
    }

    const range = parseRange(request.headers.range, stats.size);

    if (range === "invalid") {
      response.writeHead(416, {
        "Content-Range": `bytes */${stats.size}`,
        "Accept-Ranges": "bytes",
      });
      response.end();
      return;
    }

    const headers = {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      // HTML, CSS ve JS her açılışta sunucuya sorulur (değişmediyse 304, gövdesiz). Yayın sırasında eski
      // stil dosyası yeni sürüm adıyla 1 saat önbellekte kalıp sayfayı bozuyordu (2026-10-02).
      "Cache-Control": [".html", ".css", ".js"].includes(path.extname(filePath)) ? "no-cache" : "public, max-age=3600",
      "Accept-Ranges": "bytes",
      "Last-Modified": stats.mtime.toUTCString(),
    };

    const since = Date.parse(request.headers["if-modified-since"] || "");
    if (!range && !Number.isNaN(since) && Math.floor(stats.mtimeMs / 1000) <= Math.floor(since / 1000)) {
      response.writeHead(304, headers);
      response.end();
      return;
    }

    if (range) {
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${stats.size}`;
      headers["Content-Length"] = range.end - range.start + 1;
      response.writeHead(206, headers);
    } else {
      headers["Content-Length"] = stats.size;
      response.writeHead(200, headers);
    }

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath, range ? { start: range.start, end: range.end } : undefined);
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  });
}

const pageRoutes = {
  "/login": "login.html",
  "/register": "login.html",
  "/forgot-password": "login.html",
  "/astroloji": "astroloji.html",
  "/uzman": "uzman.html",
  "/numeroloji": "numeroloji.html",
  "/ruya": "ruya.html",
  "/kahve-fali": "fal.html",
  "/el-fali": "el-fali.html",
  "/tarot": "tarot.html",
  "/yuz-okuma": "yuz-okuma.html",
  "/fotograf-analizi": "fotograf-analizi.html",
  "/ask-uyumu": "ask-uyumu.html",
  "/dogum-haritasi": "dogum-haritasi.html",
  "/melek-sayilari": "melek-sayilari.html",
  "/iching": "iching.html",
  "/run-taslari": "run-taslari.html",
  "/ay-takvimi": "ay-takvimi.html",
  "/cakralar": "cakralar.html",
  "/kristaller": "kristaller.html",
  "/arsiv": "arsiv.html",
  "/ruhsal-gunluk": "ruhsal-gunluk.html",
  "/semboller": "semboller.html",
  "/asistan": "asistan.html",
  "/taslarla-dizim": "dizim.html",
  "/yuz-muzigi": "yuz-muzigi.html",
  "/ebced": "ebced.html",
  "/cifir": "cifir.html",
  "/gizlilik": "gizlilik.html",
  "/kullanim-kosullari": "kullanim-kosullari.html",
  "/fiyatlar": "fiyatlar.html",
  "/on-bilgilendirme": "on-bilgilendirme.html",
  "/mesafeli-satis": "mesafeli-satis.html",
  "/iptal-iade": "iptal-iade.html",
  "/bilgilendirme": "bilgilendirme.html",
};

// --- Üyeliksiz ziyaretçi (Murat 2026-10-07): üyelik ve tahsilat kaldırıldı. Her tarayıcıya bir ziyaretçi kimliği
// (çerez ezo_z; ileride tarayıcı başına günlük sınır için) verilir; bölümler bu kimlikle çalışır. Ziyaretçinin
// yorumları ve fotoğrafları diske hiç yazılmaz: bellek-fs.js "z-" kimlikli yolları bellekte tutar. Yönetici normal girişle çalışır.
const crypto = require("node:crypto");
const ziyaretciKimligi = (request) => /(?:^|;\s*)ezo_z=([a-f0-9]{16})(?:;|$)/.exec(request.headers.cookie || "")?.[1] || null;
function kullaniciVeyaZiyaretci(request) {
  const user = currentUser(request);
  if (user && Ayarlar.yoneticiMi(user)) return user; // eski üye oturumları da ziyaretçi sayılır
  const id = ziyaretciKimligi(request);
  return id ? { id: `z-${id}`, email: "", name: "", profil: {}, anonim: true } : null;
}
// Tarayıcı başına günlük yorum sınırı (Murat 2026-10-07): bütün bölümlerdeki yapay zekâ işlemleri toplamı, ziyaretçi
// çerezine göre; çerezi silerek aşmaya karşı aynı internet adresine daha geniş bir sınır. Yalnız sayılar bellekte
// tutulur (içerik yok); gün İstanbul saatine göre döner, sunucu yeniden başlarsa sayaçlar sıfırlanır. Yönetici sınırsız.
const hakSayaci = { gun: "", tarayici: new Map(), ip: new Map(), bolum: new Map() };
const bugunTR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
const istemciIp = (request) => String(request.headers["x-forwarded-for"] || "").split(",")[0].trim() || request.socket.remoteAddress || "";
// API yolu → yönetim panelindeki bölüm kimliği (Özet tablosu için).
const HAK_BOLUM = { fal: "kahve-fali", melek: "melek-sayilari", run: "run-taslari", ay: "ay-takvimi", cakra: "cakralar", kristal: "kristaller", sembol: "semboller" };
// Yönetim paneli Özet: bugünkü kullanım (yalnız sayılar).
function hakDurumu() {
  const gunBugun = hakSayaci.gun === bugunTR();
  const sinir = Ayarlar.sinir("tarayiciGunluk");
  const sayilar = gunBugun ? [...hakSayaci.tarayici.values()] : [];
  return {
    tarayici: sayilar.filter((n) => n > 0).length,
    yorum: sayilar.reduce((a, b) => a + b, 0),
    sinirda: sayilar.filter((n) => n >= sinir).length,
    ip: gunBugun ? [...hakSayaci.ip.values()].filter((n) => n > 0).length : 0,
    bolum: gunBugun ? Object.fromEntries(hakSayaci.bolum) : {},
  };
}
function hakKullan(request, response, ziyaretci) {
  const gun = bugunTR();
  if (hakSayaci.gun !== gun) Object.assign(hakSayaci, { gun, tarayici: new Map(), ip: new Map(), bolum: new Map() });
  const json = (kod, error) => {
    response.writeHead(kod, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ error }));
    return false;
  };
  if (!ziyaretci) return json(403, "Tarayıcında çerezler kapalı görünüyor. Yorum alabilmek için bu siteye çerez izni ver ve sayfayı yenile.");
  const ip = istemciIp(request);
  const sinir = Ayarlar.sinir("tarayiciGunluk");
  const ipSinir = Ayarlar.sinir("ipGunluk");
  const t = hakSayaci.tarayici.get(ziyaretci) || 0;
  const i = hakSayaci.ip.get(ip) || 0;
  if (t >= sinir) return json(429, `Bugünkü ${sinir} ücretsiz yorum hakkını kullandın. Yarın yeniden bekleriz.`);
  if (i >= ipSinir) return json(429, "Bu internet bağlantısından bugün çok sayıda yorum istendi. Yarın yeniden bekleriz.");
  hakSayaci.tarayici.set(ziyaretci, t + 1);
  hakSayaci.ip.set(ip, i + 1);
  const bolum = HAK_BOLUM[String(request.url).split("/")[2]] || String(request.url).split("/")[2];
  hakSayaci.bolum.set(bolum, (hakSayaci.bolum.get(bolum) || 0) + 1);
  if (Number.isFinite(sinir)) response.setHeader("X-Kalan-Hak", `${sinir - t - 1}/${sinir}`);
  // Başarısız işlem hak yemesin.
  response.on("finish", () => {
    if (response.statusCode < 400 || hakSayaci.gun !== gun) return;
    hakSayaci.tarayici.set(ziyaretci, Math.max(0, (hakSayaci.tarayici.get(ziyaretci) || 1) - 1));
    hakSayaci.ip.set(ip, Math.max(0, (hakSayaci.ip.get(ip) || 1) - 1));
    hakSayaci.bolum.set(bolum, Math.max(0, (hakSayaci.bolum.get(bolum) || 1) - 1));
  });
  return true;
}

// Kaldırılan özellikler (tahsilat, üyelik, arşiv, harici uzman, ruhsal günlük): yönetici dışındakilere kapalı.
const KAPALI_API = /^\/api\/(kontor|arsiv|odeme|kupon|uzman|ruhsal|register|forgot-password|reset-password|profil|sifre|ruya\/dinle)(\/|$)/; // ruya/dinle: sesle anlatma (yazıya çevirme) kaldırıldı
const KAPALI_SAYFA = /^\/(arsiv|uzman|fiyatlar|mesafeli-satis|on-bilgilendirme|iptal-iade|ruhsal-gunluk|register|forgot-password|kupon\/[A-Za-z0-9-]+)$/; // kupon/ altındaki resimler (logo) açık kalır

const handleAstrolojiRequest = createAstrolojiHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleUzmanRequest = createUzmanHandler({ dataDir, currentUser, sendFile });
const handleNumerolojiRequest = createNumerolojiHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleRuyaRequest = createRuyaHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleFalRequest = createFalHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleElFaliRequest = createElFaliHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleTarotRequest = createTarotHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleYuzRequest = createYuzHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleAnalizRequest = createAnalizHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleAskRequest = createAskHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleDogumRequest = createDogumHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleMelekRequest = createMelekHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleIChingRequest = createIChingHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleRunRequest = createRunHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleAyRequest = createAyHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleCakraKristalRequest = createCakraKristalHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleArsivRequest = createArsivHandler({ dataDir, currentUser, sendFile });
const handleRuhsalRequest = createRuhsalHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleSembolRequest = createSembolHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleAsistanRequest = createAsistanHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleDizimRequest = createDizimHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleYuzMuzigiRequest = createYuzMuzigiHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci });
const handleEbcedCifirRequest = createEbcedCifirHandler({ dataDir, currentUser: kullaniciVeyaZiyaretci, sendFile });
const handleYonetimRequest = createYonetimHandler({ dataDir, currentUser, kullaniciListesi, kullaniciSil, hakDurumu });

// Her istek ait olduğu bölümün etiketiyle çalışır; yapay zekâ/ses kullanımı o bölüme yazılır (olcum.js).
function istekBolumu(adres) {
  const yol = String(adres || "").split("?")[0];
  if (yol.startsWith("/api/uzman/")) return "uzman";
  return Ayarlar.BOLUMLER.find((b) => yol.startsWith(b.api))?.id || null;
}

// Müşterinin bu bölüm için seçtiği sanal uzman (çerez "ezoy_<bölüm>"; seçim kutusu ust-cubuk.js'te). Ses her istekte,
// üslup yalnız kişisel yapay zekâ yorumlarında uygulanır (ortak önbelleğe giden üretimlere karakter karışmasın).
// Yeni yorum (kişisel POST) seçili uzmanla (ezoy_) yazılır; dinleme gibi diğer isteklerde ekranda açık yorumun
// yazarı (ezoyk_, ust-cubuk.js yorum açılınca koyar) önceliklidir; böylece eski yorum kendi yazarının sesiyle okunur.
function yorumcuBul(request, bolum) {
  if (!bolum) return null;
  const b = bolum.replace(/[^a-z-]/g, "");
  const cerez = (ad) => new RegExp(`(?:^|;\\s*)${ad}_${b}=([0-9a-f]{10})`).exec(request.headers.cookie || "")?.[1];
  const yol = String(request.url || "").split("?")[0];
  const kisisel = request.method === "POST" && YAPAY_ZEKA_ISLEMI.test(yol) && !/^\/api\/(asistan|ruhsal)\//.test(yol);
  if (!kisisel) {
    const yazar = UzmanKayit.bul(cerez("ezoyk"));
    if (yazar?.tip === "sanal") return { id: yazar.id, ad: yazar.ad, ses: yazar.ses || "", uslup: "" };
  }
  const kart = UzmanKayit.bul(cerez("ezoy"));
  const anahtar = yorumcuAnahtari(bolum);
  if (!kart || kart.tip !== "sanal" || !UzmanKayit.vitrindeMi(kart) || !anahtar || !kart.bolumler.includes(anahtar)) return null;
  return { id: kart.id, ad: kart.ad, ses: kart.ses || "", uslup: kisisel ? Promptlar.karakterMetni(kart) : "" };
}

const server = http.createServer((request, response) => {
  const bolum = istekBolumu(request.url);
  Olcum.calistir(bolum, () => anaIsleyici(request, response), { yorumcu: yorumcuBul(request, bolum) });
});

// Yapay zekâ işlemleri en az belli bir sürede cevaplanır (Murat 2026-10-04; varsayılan 8 sn, asistan 2 sn): yorum
// önbellekten hemen hazır olsa da başarılı cevap bu süre dolmadan gönderilmez. Hata cevapları (eksik bilgi, günlük hak vb.) bekletilmez.
const YAPAY_ZEKA_ISLEMI = /^\/api\/(astroloji\/harita|dogum-haritasi\/yorum|numeroloji\/profil|ruya\/yorum|tarot\/cek|(fal|el-fali|yuz-okuma|fotograf-analizi)\/bak|ask-uyumu\/hesapla|melek\/yorum|iching\/yorum|run\/cek|ay\/rehber|cakra\/test|kristal\/oner|sembol\/sor|ruhsal\/(yansima|ozet)|asistan\/mesaj|dizim\/(analiz|karsilastir)|ebced\/yorum|cifir\/yorum|uzman\/sanal)$/;
// Derin raporlar daha uzun bekler (Süreler → "derin raporlar"); geri kalan yapay zekâ işleri "hafif işler".
const DERIN_RAPOR = /^\/api\/(astroloji\/harita|dogum-haritasi\/yorum|numeroloji\/profil|ruya\/yorum|(fal|el-fali|yuz-okuma|fotograf-analizi)\/bak|ask-uyumu\/hesapla|ay\/rehber|ruhsal\/ozet|dizim\/(analiz|karsilastir)|cifir\/yorum)$/;
// Süreler yönetim panelinden (Süreler → "en az bekleme"); asistanın kendi süresi var.
function enAzBeklet(response, sn) {
  const bitis = Date.now() + sn * 1000;
  const asilHead = response.writeHead.bind(response);
  const asilEnd = response.end.bind(response);
  let bas = null;
  response.writeHead = (...a) => { bas = a; return response; };
  response.end = (...a) => {
    const kod = bas ? Number(bas[0]) : response.statusCode;
    const gonder = () => { if (bas) asilHead(...bas); asilEnd(...a); };
    const kalan = bitis - Date.now();
    if (kod < 400 && kalan > 0) setTimeout(gonder, kalan);
    else gonder();
    return response;
  };
}

// Sunucu tarafı modüller (require edilen ve hiçbir sayfanın /dosya.js diye yüklemediği dosyalar) ile paket
// bilgileri dışarıya verilmez (2026-10-07). Tarayıcının da kullandığı veri dosyaları (*-veri.js) açık kalır.
let sunucuDosyalari = null;
function sunucuDosyasi(dosya) {
  if (!sunucuDosyalari) {
    const istemci = fs.readdirSync(root).filter((f) => /\.(html|js)$/.test(f) && !require.cache[path.join(root, f)])
      .map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
    sunucuDosyalari = new Set([
      ...Object.keys(require.cache).filter((f) => path.dirname(f) === root && !istemci.includes(`/${path.basename(f)}`)),
      ...["package.json", "README.md", "Dockerfile", "Procfile", "railway.toml", "AGENTS.md", "CLAUDE.md"].map((f) => path.join(root, f)),
    ]);
  }
  return sunucuDosyalari.has(dosya);
}

function anaIsleyici(request, response) {
  const istekYolu = String(request.url || "").split("?")[0];
  // Tek adres (arama motorları için): www.ezoter.ist → ezoter.ist
  if (/^www\./i.test(String(request.headers.host || ""))) {
    response.writeHead(301, { Location: `https://${String(request.headers.host).slice(4)}${request.url || "/"}` });
    response.end();
    return;
  }
  const oturum = currentUser(request);
  if (!Ayarlar.yoneticiMi(oturum)) {
    if (KAPALI_API.test(istekYolu)) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: "Bu özellik kaldırıldı." }));
      return;
    }
    if (KAPALI_SAYFA.test(istekYolu)) {
      response.writeHead(302, { Location: "/", "Cache-Control": "no-store" });
      response.end();
      return;
    }
  }
  const cereziVardi = ziyaretciKimligi(request);
  if (!Ayarlar.yoneticiMi(oturum) && !ziyaretciKimligi(request)) {
    const id = crypto.randomBytes(8).toString("hex");
    request.headers.cookie = `${request.headers.cookie ? `${request.headers.cookie}; ` : ""}ezo_z=${id}`;
    const guvenli = String(request.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
    response.setHeader("Set-Cookie", `ezo_z=${id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${guvenli}`);
  }
  // Tek kural (Murat 2026-10-07): bölümlerin kendi günlük sınırları kapalı (0); cevaplardaki "kalan/sinir"
  // tarayıcının ortak günlük hakkıyla değiştirilir, böylece her sayfa aynı hakkı gösterir.
  if (istekYolu.startsWith("/api/") && !/^\/api\/(yonetim|ayarlar|me|login|logout)\b/.test(istekYolu)) {
    const asilEnd = response.end.bind(response);
    response.end = (govde, ...geri) => {
      if (typeof govde === "string" && govde.startsWith("{") && /"(kalan|sinir)":/.test(govde)) {
        try {
          const veri = JSON.parse(govde);
          const sinir = Ayarlar.sinir("tarayiciGunluk");
          const sinirsiz = Ayarlar.yoneticiMi(oturum) || !Number.isFinite(sinir);
          const kullanilan = hakSayaci.gun === bugunTR() ? hakSayaci.tarayici.get(cereziVardi) || 0 : 0;
          if ("sinir" in veri) veri.sinir = sinirsiz ? 99 : sinir;
          if ("kalan" in veri) veri.kalan = sinirsiz ? 99 : Math.max(0, sinir - kullanilan);
          govde = JSON.stringify(veri);
        } catch { /* JSON değilse dokunma */ }
      }
      return asilEnd(govde, ...geri);
    };
  }
  if (request.method === "POST" && YAPAY_ZEKA_ISLEMI.test(istekYolu)) {
    if (!Ayarlar.yoneticiMi(oturum) && !hakKullan(request, response, cereziVardi)) return;
    const sn = Ayarlar.get(istekYolu === "/api/asistan/mesaj" ? "sure.asistanBekleme" : DERIN_RAPOR.test(istekYolu) ? "sure.derinBekleme" : "sure.enAzBekleme");
    if (sn > 0) enAzBeklet(response, sn);
  }
  let url;
  let requestPath;
  try {
    url = new URL(request.url, "http://localhost");
    requestPath = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid URL");
    return;
  }

  // Yönetim panelinden kapatılan bölüm: sayfası menüye döner, API'si 503 verir. Yönetici her zaman girebilir.
  // Rüya bölümündeki ses→yazı ucu günlük ve asistan tarafından da kullanıldığından kapatılmaz.
  const kapali = Ayarlar.BOLUMLER.find((b) => !Ayarlar.bolumAcik(b.id) && (requestPath === b.sayfa || (url.pathname.startsWith(b.api) && url.pathname !== "/api/ruya/dinle")));
  if (kapali && !Ayarlar.yoneticiMi(currentUser(request))) {
    if (url.pathname.startsWith("/api/")) {
      response.writeHead(503, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: `${kapali.ad} bölümü şu an bakımda. Lütfen daha sonra tekrar dene.` }));
    } else {
      response.writeHead(302, { Location: `/?kapali=${encodeURIComponent(kapali.id)}`, "Cache-Control": "no-store" });
      response.end();
    }
    return;
  }

  // Yönetim paneli sayfası yalnızca yöneticiye; giriş yapmamışsa girişe, başkasına ana sayfa gösterilir.
  if (requestPath === "/yonetim" || requestPath === "/yonetim.html") {
    const user = currentUser(request);
    if (!user) {
      response.writeHead(302, { Location: "/login?next=%2Fyonetim", "Cache-Control": "no-store" });
      response.end();
    } else {
      sendFile(request, response, path.join(root, Ayarlar.yoneticiMi(user) ? "yonetim.html" : "index.html"));
    }
    return;
  }

  if (handleYonetimRequest(request, response, url)) return;
  if (handleAstrolojiRequest(request, response, url)) return;
  if (handleUzmanRequest(request, response, url)) return;
  if (handleNumerolojiRequest(request, response, url)) return;
  if (handleRuyaRequest(request, response, url)) return;
  if (handleFalRequest(request, response, url)) return;
  if (handleElFaliRequest(request, response, url)) return;
  if (handleTarotRequest(request, response, url)) return;
  if (handleYuzRequest(request, response, url)) return;
  if (handleAnalizRequest(request, response, url)) return;
  if (handleAskRequest(request, response, url)) return;
  if (handleDogumRequest(request, response, url)) return;
  if (handleMelekRequest(request, response, url)) return;
  if (handleIChingRequest(request, response, url)) return;
  if (handleRunRequest(request, response, url)) return;
  if (handleAyRequest(request, response, url)) return;
  if (handleCakraKristalRequest(request, response, url)) return;
  if (handleArsivRequest(request, response, url)) return;
  if (handleRuhsalRequest(request, response, url)) return;
  if (handleSembolRequest(request, response, url)) return;
  if (handleAsistanRequest(request, response, url)) return;
  if (handleDizimRequest(request, response, url)) return;
  if (handleYuzMuzigiRequest(request, response, url)) return;
  if (handleEbcedCifirRequest(request, response, url)) return;
  if (handleAuthRequest(request, response, url)) return;

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  if (pageRoutes[requestPath]) {
    sendFile(request, response, path.join(root, pageRoutes[requestPath]));
    return;
  }
  if (handleRehberRequest(request, response, url)) return;

  const requestedFile = path.resolve(root, `.${requestPath}`);

  if (requestedFile !== root && !requestedFile.startsWith(root + path.sep)) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid path");
    return;
  }

  // Kullanıcı verisini, gizli dosyaları ve sunucunun kendi program dosyalarını asla statik olarak sunma.
  const isPrivate =
    sunucuDosyasi(requestedFile) ||
    requestedFile === dataDir ||
    requestedFile.startsWith(dataDir + path.sep) ||
    requestPath.split("/").some((segment) => segment.startsWith("."));
  if (isPrivate) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  fs.stat(requestedFile, (error, stats) => {
    if (!error && stats.isFile()) return sendFile(request, response, requestedFile);
    if (requestPath === "/") return sendFile(request, response, path.join(root, "index.html"));
    // Bilinmeyen adres: ana sayfa gösterilir ama 404 koduyla (arama motorları boş sayfaları dizine eklemesin).
    fs.readFile(path.join(root, "index.html"), (hata, veri) => {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      response.end(hata ? "Not found" : veri);
    });
  });
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Ezoterist server listening on port ${port}`);
});
