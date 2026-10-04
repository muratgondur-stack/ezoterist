const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { handleAuthRequest, dataDir, currentUser, kullaniciListesi } = require("./auth");
const Ayarlar = require("./ayarlar");
const Olcum = require("./olcum");
const { createHandler: createYonetimHandler } = require("./yonetim-api");
const { createHandler: createAstrolojiHandler } = require("./astroloji-api");
const { createHandler: createUzmanHandler } = require("./uzman-api");
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

const configuredPort = Number.parseInt(process.env.PORT || "", 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
const root = __dirname;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
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

function sendFile(request, response, filePath) {
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
  "/gizlilik": "gizlilik.html",
  "/kullanim-kosullari": "kullanim-kosullari.html",
};

const handleAstrolojiRequest = createAstrolojiHandler({ dataDir, currentUser, sendFile });
const handleUzmanRequest = createUzmanHandler({ dataDir, currentUser, sendFile });
const handleNumerolojiRequest = createNumerolojiHandler({ dataDir, currentUser, sendFile });
const handleRuyaRequest = createRuyaHandler({ dataDir, currentUser, sendFile });
const handleFalRequest = createFalHandler({ dataDir, currentUser, sendFile });
const handleElFaliRequest = createElFaliHandler({ dataDir, currentUser, sendFile });
const handleTarotRequest = createTarotHandler({ dataDir, currentUser, sendFile });
const handleYuzRequest = createYuzHandler({ dataDir, currentUser, sendFile });
const handleAnalizRequest = createAnalizHandler({ dataDir, currentUser, sendFile });
const handleAskRequest = createAskHandler({ dataDir, currentUser, sendFile });
const handleDogumRequest = createDogumHandler({ dataDir, currentUser, sendFile });
const handleMelekRequest = createMelekHandler({ dataDir, currentUser, sendFile });
const handleIChingRequest = createIChingHandler({ dataDir, currentUser, sendFile });
const handleRunRequest = createRunHandler({ dataDir, currentUser, sendFile });
const handleAyRequest = createAyHandler({ dataDir, currentUser, sendFile });
const handleCakraKristalRequest = createCakraKristalHandler({ dataDir, currentUser, sendFile });
const handleArsivRequest = createArsivHandler({ dataDir, currentUser });
const handleRuhsalRequest = createRuhsalHandler({ dataDir, currentUser, sendFile });
const handleSembolRequest = createSembolHandler({ dataDir, currentUser, sendFile });
const handleAsistanRequest = createAsistanHandler({ dataDir, currentUser, sendFile });
const handleDizimRequest = createDizimHandler({ dataDir, currentUser, sendFile });
const handleYuzMuzigiRequest = createYuzMuzigiHandler({ dataDir, currentUser });
const handleYonetimRequest = createYonetimHandler({ dataDir, currentUser, kullaniciListesi });

// Her istek ait olduğu bölümün etiketiyle çalışır; yapay zekâ/ses kullanımı o bölüme yazılır (olcum.js).
function istekBolumu(adres) {
  const yol = String(adres || "").split("?")[0];
  if (yol.startsWith("/api/uzman/")) return "uzman";
  return Ayarlar.BOLUMLER.find((b) => yol.startsWith(b.api))?.id || null;
}

const server = http.createServer((request, response) => Olcum.calistir(istekBolumu(request.url), () => anaIsleyici(request, response)));

// Yapay zekâ işlemleri en az belli bir sürede cevaplanır (Murat 2026-10-04; varsayılan 8 sn, asistan 3 sn): yorum
// önbellekten hemen hazır olsa da başarılı cevap bu süre dolmadan gönderilmez. Hata cevapları (eksik bilgi, günlük hak vb.) bekletilmez.
const YAPAY_ZEKA_ISLEMI = /^\/api\/(astroloji\/harita|dogum-haritasi\/yorum|numeroloji\/profil|ruya\/yorum|tarot\/cek|(fal|el-fali|yuz-okuma|fotograf-analizi)\/bak|ask-uyumu\/hesapla|melek\/yorum|iching\/yorum|run\/cek|ay\/rehber|cakra\/test|kristal\/oner|sembol\/sor|ruhsal\/(yansima|ozet)|asistan\/mesaj|dizim\/(analiz|karsilastir))$/;
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

function anaIsleyici(request, response) {
  const istekYolu = String(request.url || "").split("?")[0];
  if (request.method === "POST" && YAPAY_ZEKA_ISLEMI.test(istekYolu)) {
    const sn = Ayarlar.get(istekYolu === "/api/asistan/mesaj" ? "sure.asistanBekleme" : "sure.enAzBekleme");
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

  const requestedFile = path.resolve(root, `.${requestPath}`);

  if (requestedFile !== root && !requestedFile.startsWith(root + path.sep)) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid path");
    return;
  }

  // Kullanıcı verisini ve gizli dosyaları asla statik olarak sunma.
  const isPrivate =
    requestedFile === dataDir ||
    requestedFile.startsWith(dataDir + path.sep) ||
    requestPath.split("/").some((segment) => segment.startsWith("."));
  if (isPrivate) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  fs.stat(requestedFile, (error, stats) => {
    const filePath = !error && stats.isFile() ? requestedFile : path.join(root, "index.html");
    sendFile(request, response, filePath);
  });
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Ezoterist server listening on port ${port}`);
});
