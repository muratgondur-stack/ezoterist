const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");
const { epostaYolla, epostaSablon, htmlKacis } = require("./eposta");
const { sehirler } = require("./astroloji-veri");
const Ayarlar = require("./ayarlar");

const scrypt = promisify(crypto.scrypt);

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const usersFile = path.join(dataDir, "users.json");

const SESSION_COOKIE = "ezo_session";
const STATE_COOKIE = "ezo_oauth_state";
const NEXT_COOKIE = "ezo_oauth_next";
// "Beni hatırla" oturum süresi yönetim panelinden (gün).
const sessionMaxAge = () => 60 * 60 * 24 * Ayarlar.get("sure.oturumGun");
// "Beni hatırla" seçilmezse oturum tarayıcı kapanınca biter, en geç 1 günde düşer.
const SHORT_SESSION_MAX_AGE = 60 * 60 * 24;
const MAX_BODY_BYTES = 10 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_COOLDOWN_MS = 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString("hex");
  console.warn("SESSION_SECRET tanımlı değil; oturumlar sunucu yeniden başlayınca sona erecek.");
}

const google = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
};
const googleEnabled = Boolean(google.clientId && google.clientSecret);

// --- Kullanıcı deposu (JSON dosyası) ---

function loadUsers() {
  try {
    const parsed = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Kullanıcı dosyası okunamadı:", error);
    return [];
  }
}

const users = loadUsers();
let writeQueue = Promise.resolve();

// Yazmaları sıraya koyar ve geçici dosya + rename ile dosyanın yarım kalmasını önler.
function saveUsers() {
  const snapshot = JSON.stringify(users, null, 2);
  const job = writeQueue.then(async () => {
    await fs.promises.mkdir(dataDir, { recursive: true });
    const tmpFile = `${usersFile}.tmp`;
    await fs.promises.writeFile(tmpFile, snapshot, { mode: 0o600 });
    await fs.promises.rename(tmpFile, usersFile);
  });
  writeQueue = job.catch(() => {});
  return job;
}

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const findUserByEmail = (email) => users.find((user) => user.email === email);
const findUserById = (id) => users.find((user) => user.id === id);
// Üyelere bir kez gösterilip onayı alınan bilgilendirme metni (bilgilendirme-metin.js). Metin değişirse sürüm
// artırılır; herkes yeni metni bir kez daha onaylar. Onay tarihi ve IP users.json'da saklanır.
const BILGILENDIRME_SURUMU = "2026-10-04";
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name || "",
  profil: user.profil || {},
  sifreVar: Boolean(user.passwordHash),
  google: Boolean(user.googleId),
  createdAt: user.createdAt || null,
  yonetici: Ayarlar.yoneticiMi(user),
  // Kullanıcı menüsünde "Uzman paneli" bağlantısı için (uzman-kayit.js).
  uzman: require("./uzman-kayit").uzmanMi(user),
  bilgilendirmeGerekli: user.bilgilendirmeOnay?.surum !== BILGILENDIRME_SURUMU,
  bilgilendirmeOnay: user.bilgilendirmeOnay?.tarih || null,
});

async function createUser({ email, name, passwordHash = null, googleId = null }) {
  const user = {
    id: crypto.randomUUID(),
    email,
    name: name || "",
    passwordHash,
    googleId,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await saveUsers();
  return user;
}

// --- Şifre ---

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// --- Oturum (imzalı çerez) ---

const sign = (value) => crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");

// Şifre değişince user.sessionVersion artar ve önceki oturumlar geçersiz olur.
function createSessionToken(user, maxAge) {
  const payload = `${user.id}.${user.sessionVersion || 0}.${Math.floor(Date.now() / 1000) + maxAge}`;
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, version, expires, signature] = parts;
  const expected = Buffer.from(sign(`${userId}.${version}.${expires}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  if (Number(expires) < Date.now() / 1000) return null;
  const user = findUserById(userId);
  if (!user || String(user.sessionVersion || 0) !== version) return null;
  return user;
}

function parseCookies(request) {
  const cookies = {};
  for (const part of (request.headers.cookie || "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      // Bozuk çerezi yok say.
    }
  }
  return cookies;
}

const isSecure = (request) =>
  request.socket.encrypted || (request.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";

function cookie(request, name, value, { maxAge, path: cookiePath = "/" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${cookiePath}`, "HttpOnly", "SameSite=Lax"];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (isSecure(request)) parts.push("Secure");
  return parts.join("; ");
}

const sessionCookie = (request, user, remember = true) =>
  remember
    ? cookie(request, SESSION_COOKIE, createSessionToken(user, sessionMaxAge()), { maxAge: sessionMaxAge() })
    : cookie(request, SESSION_COOKIE, createSessionToken(user, SHORT_SESSION_MAX_AGE));

// Girişten sonra dönülecek adres yalnızca site içi bir yol olabilir ("//" ile başlayan başka siteye gider).
const safeNext = (value) => {
  const next = String(value || "");
  return /^\/(?!\/)[A-Za-z0-9\-._~\/#?=&%]*$/.test(next) ? next : "/";
};

const currentUser = (request) => readSessionToken(parseCookies(request)[SESSION_COOKIE]);

// --- Basit deneme sınırlayıcı ---

const attempts = new Map();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function clientIp(request) {
  return (request.headers["x-forwarded-for"] || "").split(",")[0].trim() || request.socket.remoteAddress || "";
}

function isRateLimited(request) {
  const ip = clientIp(request);
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts) if (entry.resetAt < now) attempts.delete(ip);
}, ATTEMPT_WINDOW_MS).unref();

// --- HTTP yardımcıları ---

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function redirect(response, location, headers = {}) {
  response.writeHead(302, { Location: location, "Cache-Control": "no-store", ...headers });
  response.end();
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Body too large"), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

// --- E-posta ile kayıt / giriş ---

// --- E-postaya gönderilen 6 haneli kodlar (kayıt doğrulama ve şifre yenileme) ---

const registerPending = new Map();
const resetPending = new Map();

const newCode = () => String(crypto.randomInt(100000, 1000000));

const codeEmailHtml = (heading, intro, code, footer) =>
  epostaSablon(
    heading,
    `<p>${intro}</p>
     <p style="font-size:32px;letter-spacing:8px;font-weight:900;margin:14px 0">${code}</p>
     <p style="color:#666">${footer}</p>`,
  );

function storePending(pendingMap, email, entry) {
  const now = Date.now();
  pendingMap.set(email, { ...entry, expiresAt: now + CODE_TTL_MS, attempts: 0, sentAt: now });
  if (pendingMap.size > 5000) {
    for (const [key, value] of pendingMap) if (now > value.expiresAt) pendingMap.delete(key);
  }
}

const isCoolingDown = (pendingMap, email) => {
  const previous = pendingMap.get(email);
  return Boolean(previous && Date.now() - previous.sentAt < CODE_COOLDOWN_MS);
};

// Kodu doğrular; doğruysa bekleyen kaydı silip döner, değilse { error } döner.
function consumeCode(pendingMap, email, rawCode) {
  const code = String(rawCode || "").replace(/\D/g, "");
  const pending = pendingMap.get(email);
  if (!pending || code.length !== 6 || Date.now() > pending.expiresAt) {
    if (pending && Date.now() > pending.expiresAt) pendingMap.delete(email);
    return { error: "Kod hatalı veya süresi geçti." };
  }
  pending.attempts += 1;
  if (pending.attempts > CODE_MAX_ATTEMPTS) {
    pendingMap.delete(email);
    return { error: "Çok fazla yanlış deneme; yeni kod isteyin." };
  }
  if (pending.code !== code) return { error: "Kod hatalı veya süresi geçti." };
  pendingMap.delete(email);
  return { pending };
}

const COOLDOWN_ERROR = "Kod az önce gönderildi; 1 dakika sonra tekrar isteyebilirsiniz.";
const MAIL_ERROR = "E-posta gönderilemedi; lütfen biraz sonra tekrar deneyin.";

// --- E-posta ile kayıt: bilgiler → e-postaya kod → kod doğrulanınca hesap açılır (quiz.ist ile aynı akış) ---

async function handleRegister(request, response) {
  if (isRateLimited(request)) {
    sendJson(response, 429, { error: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." });
    return;
  }

  const body = await readJsonBody(request);
  const email = normalizeEmail(body.email);
  const name = String(body.name || "").trim().slice(0, 100);
  const password = String(body.password || "");

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    sendJson(response, 400, { error: "Geçerli bir e-posta adresi girin." });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    sendJson(response, 400, { error: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.` });
    return;
  }
  const existing = findUserByEmail(email);
  if (existing) {
    sendJson(response, 409, {
      error: existing.passwordHash
        ? "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin."
        : "Bu e-posta Google hesabıyla kayıtlı. Lütfen \"Google ile giriş yap\" seçeneğini kullanın.",
    });
    return;
  }
  if (isCoolingDown(registerPending, email)) {
    sendJson(response, 429, { error: COOLDOWN_ERROR });
    return;
  }

  const code = newCode();
  const firstName = name.split(" ")[0] || "Merhaba";
  const sent = await epostaYolla({
    kime: email,
    konu: `Ezoter.ist doğrulama kodun: ${code}`,
    metin: `${firstName}, Ezoter.ist kaydını tamamlamak için kodun: ${code}\n10 dakika geçerli. Bu isteği sen yapmadıysan görmezden gel.`,
    html: codeEmailHtml(
      `${htmlKacis(firstName)}, kodun hazır`,
      "Kaydını tamamlamak için sitedeki kutuya bu kodu yaz:",
      code,
      "Kod 10 dakika geçerli. Bu isteği sen yapmadıysan görmezden gel; hesap açılmaz.",
    ),
  });
  if (!sent) {
    sendJson(response, 503, { error: MAIL_ERROR });
    return;
  }

  storePending(registerPending, email, { name, passwordHash: await hashPassword(password), code });
  sendJson(response, 200, { pending: true, message: `Doğrulama kodu ${email} adresine gönderildi.` });
}

async function handleRegisterVerify(request, response) {
  const body = await readJsonBody(request);
  const email = normalizeEmail(body.email);
  const { pending, error } = consumeCode(registerPending, email, body.code);
  if (error) {
    sendJson(response, 400, { error });
    return;
  }
  if (findUserByEmail(email)) {
    sendJson(response, 409, { error: "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin." });
    return;
  }

  const user = await createUser({ email, name: pending.name, passwordHash: pending.passwordHash });
  const firstName = pending.name.split(" ")[0] || "Merhaba";
  void epostaYolla({
    kime: email,
    konu: "Ezoter.ist'e hoş geldin",
    metin: `${firstName}, Ezoter.ist'e hoş geldin! Hesabın hazır; giriş için e-posta adresin ve seçtiğin şifre yeter: https://ezoter.ist`,
    html: epostaSablon(
      `${htmlKacis(firstName)}, hoş geldin!`,
      "<p>Ezoter.ist hesabın hazır. Giriş için e-posta adresin ve seçtiğin şifre yeter.</p>",
      { yazi: "Ezoter.ist'e git", url: "https://ezoter.ist" },
    ),
  });
  sendJson(response, 201, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(request, user) });
}

async function handleLogin(request, response) {
  if (isRateLimited(request)) {
    sendJson(response, 429, { error: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." });
    return;
  }

  const body = await readJsonBody(request);
  const user = findUserByEmail(normalizeEmail(body.email));
  const password = String(body.password || "");

  if (user && !user.passwordHash && user.googleId) {
    sendJson(response, 400, { error: "Bu hesap Google ile oluşturulmuş. Lütfen \"Google ile devam et\" seçeneğini kullanın." });
    return;
  }
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    sendJson(response, 401, { error: "E-posta adresi veya şifre hatalı." });
    return;
  }

  sendJson(response, 200, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(request, user, body.remember !== false) });
}

// --- Şifremi unuttum: e-postaya 6 haneli kod → kod + yeni şifre (quiz.ist ile aynı akış) ---

async function handleForgotPassword(request, response) {
  if (isRateLimited(request)) {
    sendJson(response, 429, { error: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." });
    return;
  }

  const body = await readJsonBody(request);
  const email = normalizeEmail(body.email);
  if (!EMAIL_PATTERN.test(email)) {
    sendJson(response, 400, { error: "Geçerli bir e-posta adresi girin." });
    return;
  }

  const user = findUserByEmail(email);
  if (!user) {
    sendJson(response, 404, { error: "Bu e-posta adresiyle kayıtlı bir hesap yok." });
    return;
  }
  if (!user.passwordHash) {
    sendJson(response, 400, { error: "Bu hesap Google ile açılmış; şifresi yok. Lütfen \"Google ile giriş yap\" seçeneğini kullanın." });
    return;
  }
  if (isCoolingDown(resetPending, email)) {
    sendJson(response, 429, { error: COOLDOWN_ERROR });
    return;
  }

  const code = newCode();
  const firstName = String(user.name || "").split(" ")[0] || "Merhaba";
  const sent = await epostaYolla({
    kime: email,
    konu: `Ezoter.ist şifre yenileme kodun: ${code}`,
    metin: `${firstName}, Ezoter.ist şifreni yenilemek için kodun: ${code}\n10 dakika geçerli. Bu isteği sen yapmadıysan görmezden gel; şifren değişmez.`,
    html: codeEmailHtml(
      `${htmlKacis(firstName)}, şifre yenileme kodun`,
      "Sitedeki kutuya bu kodu yazıp yeni şifreni belirle:",
      code,
      "Kod 10 dakika geçerli. Bu isteği sen yapmadıysan görmezden gel; şifren değişmez.",
    ),
  });
  if (!sent) {
    sendJson(response, 503, { error: MAIL_ERROR });
    return;
  }

  storePending(resetPending, email, { userId: user.id, code });
  sendJson(response, 200, { message: `Şifre yenileme kodu ${email} adresine gönderildi.` });
}

async function handleResetPassword(request, response) {
  const body = await readJsonBody(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    sendJson(response, 400, { error: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.` });
    return;
  }

  const { pending, error } = consumeCode(resetPending, email, body.code);
  const user = pending && findUserById(pending.userId);
  if (!user) {
    sendJson(response, 400, { error: error || "Kod hatalı veya süresi geçti." });
    return;
  }

  user.passwordHash = await hashPassword(password);
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await saveUsers();
  sendJson(response, 200, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(request, user) });
}

// --- Kişisel arşiv: profil ve şifre değiştirme (oturum açık kullanıcı) ---

const CINSIYETLER = new Set(["", "kadin", "erkek", "belirtmek-istemiyorum"]);

async function handleProfil(request, response) {
  const user = currentUser(request);
  if (!user) {
    sendJson(response, 401, { error: "Giriş yapmalısınız." });
    return;
  }
  const body = await readJsonBody(request);
  const name = String(body.name || "").replace(/\s+/g, " ").trim();
  const dogumTarihi = String(body.dogumTarihi || "");
  const dogumSaati = String(body.dogumSaati || "");
  const dogumYeri = String(body.dogumYeri || "");
  const cinsiyet = String(body.cinsiyet || "");
  if (name.length < 2 || name.length > 80 || !/^[\p{L}' .-]+$/u.test(name)) {
    sendJson(response, 400, { error: "Adını ve soyadını harflerle yaz." });
    return;
  }
  if (dogumTarihi) {
    const yil = Number(dogumTarihi.slice(0, 4));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dogumTarihi) || yil < 1900 || Number.isNaN(Date.parse(dogumTarihi)) || Date.parse(dogumTarihi) > Date.now()) {
      sendJson(response, 400, { error: "Geçerli bir doğum tarihi gir." });
      return;
    }
  }
  if (dogumSaati && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dogumSaati)) {
    sendJson(response, 400, { error: "Doğum saatini SS:DD biçiminde gir." });
    return;
  }
  if (dogumYeri && !sehirler.some((c) => c.ad === dogumYeri)) {
    sendJson(response, 400, { error: "Doğum yerini listeden seç." });
    return;
  }
  if (!CINSIYETLER.has(cinsiyet)) {
    sendJson(response, 400, { error: "Geçersiz seçim." });
    return;
  }
  user.name = name;
  user.profil = { dogumTarihi, dogumSaati, dogumYeri, cinsiyet };
  await saveUsers();
  sendJson(response, 200, { user: publicUser(user) });
}

async function handleSifreDegistir(request, response) {
  const user = currentUser(request);
  if (!user) {
    sendJson(response, 401, { error: "Giriş yapmalısınız." });
    return;
  }
  if (isRateLimited(request)) {
    sendJson(response, 429, { error: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." });
    return;
  }
  const body = await readJsonBody(request);
  const mevcut = String(body.mevcut || "");
  const yeni = String(body.yeni || "");
  // Google ile açılmış, şifresi olmayan hesap ilk şifresini mevcut şifre sormadan belirleyebilir.
  if (user.passwordHash && !(await verifyPassword(mevcut, user.passwordHash))) {
    sendJson(response, 400, { error: "Mevcut şifren hatalı." });
    return;
  }
  if (yeni.length < MIN_PASSWORD_LENGTH || yeni.length > 200) {
    sendJson(response, 400, { error: `Yeni şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.` });
    return;
  }
  if (user.passwordHash && (await verifyPassword(yeni, user.passwordHash))) {
    sendJson(response, 400, { error: "Yeni şifre eskisiyle aynı olamaz." });
    return;
  }
  const ilkSifre = !user.passwordHash;
  user.passwordHash = await hashPassword(yeni);
  // Diğer cihazlardaki oturumlar kapanır; bu cihaza yeni oturum çerezi verilir.
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await saveUsers();
  const firstName = String(user.name || "").split(" ")[0] || "Merhaba";
  epostaYolla({
    kime: user.email,
    konu: "Ezoter.ist şifren değiştirildi",
    metin: `${firstName}, Ezoter.ist hesabının şifresi ${ilkSifre ? "belirlendi" : "değiştirildi"}. Bunu sen yapmadıysan hemen "Şifremi unuttum" ile yeni şifre belirle.`,
    html: epostaSablon(
      `${htmlKacis(firstName)}, şifren ${ilkSifre ? "belirlendi" : "değiştirildi"}`,
      `<p>Ezoter.ist hesabının şifresi az önce ${ilkSifre ? "belirlendi" : "değiştirildi"}; diğer cihazlardaki oturumların kapatıldı.</p><p style="color:#666">Bunu sen yapmadıysan hemen giriş sayfasındaki "Şifremi unuttum" ile yeni şifre belirle.</p>`,
    ),
  }).catch(() => {});
  sendJson(response, 200, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(request, user) });
}

function handleLogout(request, response) {
  sendJson(response, 200, { ok: true }, { "Set-Cookie": cookie(request, SESSION_COOKIE, "", { maxAge: 0 }) });
}

function handleMe(request, response) {
  const user = currentUser(request);
  if (!user) {
    sendJson(response, 401, { user: null });
    return;
  }
  sendJson(response, 200, { user: publicUser(user) });
}

// --- Google ile giriş (OAuth 2.0 / OpenID Connect) ---

function googleRedirectUri(request) {
  if (google.redirectUri) return google.redirectUri;
  const proto = isSecure(request) ? "https" : "http";
  return `${proto}://${request.headers.host}/auth/google/callback`;
}

function handleGoogleStart(request, response, url) {
  if (!googleEnabled) {
    redirect(response, "/login?error=google_disabled");
    return;
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  redirect(response, `https://accounts.google.com/o/oauth2/v2/auth?${params}`, {
    "Set-Cookie": [
      cookie(request, STATE_COOKIE, state, { maxAge: 600, path: "/auth/google" }),
      cookie(request, NEXT_COOKIE, safeNext(url.searchParams.get("next")), { maxAge: 600, path: "/auth/google" }),
    ],
  });
}

async function handleGoogleCallback(request, response, url) {
  const clearState = [
    cookie(request, STATE_COOKIE, "", { maxAge: 0, path: "/auth/google" }),
    cookie(request, NEXT_COOKIE, "", { maxAge: 0, path: "/auth/google" }),
  ];
  const fail = (reason) => redirect(response, `/login?error=${reason}`, { "Set-Cookie": clearState });

  if (!googleEnabled) return fail("google_disabled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = parseCookies(request)[STATE_COOKIE];
  if (!code || !state || !expectedState || state !== expectedState) return fail("google");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: google.clientId,
        client_secret: google.clientSecret,
        redirect_uri: googleRedirectUri(request),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) throw new Error(`Token isteği başarısız: ${tokenResponse.status}`);
    const { access_token: accessToken } = await tokenResponse.json();

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileResponse.ok) throw new Error(`Profil isteği başarısız: ${profileResponse.status}`);
    const profile = await profileResponse.json();

    const email = normalizeEmail(profile.email);
    if (!profile.sub || !email || profile.email_verified === false) return fail("google_email");

    let user = users.find((candidate) => candidate.googleId === profile.sub) || findUserByEmail(email);
    if (!user) {
      user = await createUser({ email, name: profile.name, googleId: profile.sub });
    } else if (!user.googleId) {
      user.googleId = profile.sub;
      if (!user.name && profile.name) user.name = profile.name;
      await saveUsers();
    }

    const next = safeNext(parseCookies(request)[NEXT_COOKIE]);
    redirect(response, next, { "Set-Cookie": [...clearState, sessionCookie(request, user)] });
  } catch (error) {
    console.error("Google ile giriş başarısız:", error);
    fail("google");
  }
}

async function handleBilgilendirmeOnay(request, response) {
  const user = currentUser(request);
  if (!user) {
    sendJson(response, 401, { error: "Giriş yapmalısınız." });
    return;
  }
  const body = await readJsonBody(request);
  if (body.kabul !== true) {
    sendJson(response, 400, { error: "Devam etmek için metni onaylamalısın." });
    return;
  }
  user.bilgilendirmeOnay = { surum: BILGILENDIRME_SURUMU, tarih: new Date().toISOString(), ip: clientIp(request) };
  await saveUsers();
  sendJson(response, 200, { user: publicUser(user) });
}

// --- Yönlendirici ---

const routes = {
  "GET /api/me": handleMe,
  "POST /api/register": handleRegister,
  "POST /api/register/verify": handleRegisterVerify,
  "POST /api/login": handleLogin,
  "POST /api/logout": handleLogout,
  "POST /api/forgot-password": handleForgotPassword,
  "POST /api/reset-password": handleResetPassword,
  "POST /api/profil": handleProfil,
  "POST /api/sifre": handleSifreDegistir,
  "POST /api/bilgilendirme-onay": handleBilgilendirmeOnay,
  "GET /auth/google": handleGoogleStart,
  "GET /auth/google/callback": handleGoogleCallback,
};

// İsteği işlediyse true döner; aksi halde statik dosya sunucusuna bırakır.
function handleAuthRequest(request, response, url) {
  if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/auth/")) return false;

  const handler = routes[`${request.method} ${url.pathname}`];
  if (!handler) {
    sendJson(response, 404, { error: "Bulunamadı." });
    return true;
  }

  Promise.resolve(handler(request, response, url)).catch((error) => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    const status = error.status || 500;
    if (status === 500) console.error(error);
    sendJson(response, status, { error: status === 500 ? "Sunucu hatası. Lütfen tekrar deneyin." : "Geçersiz istek." });
  });
  return true;
}

// Yönetim paneli için: kullanıcıların yalnızca görünür alanları (şifre özeti ve oturum bilgisi verilmez).
const kullaniciListesi = () => users.map((u) => ({
  id: u.id, email: u.email, name: u.name || "", createdAt: u.createdAt || null,
  google: Boolean(u.googleId), sifreVar: Boolean(u.passwordHash), profilVar: Boolean(u.profil?.dogumTarihi),
  bilgilendirmeOnay: u.bilgilendirmeOnay?.surum === BILGILENDIRME_SURUMU ? u.bilgilendirmeOnay.tarih : null,
}));

// Yönetim panelinden üyelik silme (Murat 2026-10-07): kayıt önce DATA_DIR/silinenler/uyeler/ altına yedeklenir,
// sonra listeden çıkarılır; oturumu da geçersiz olur (kullanıcı bulunamaz). Yönetici kendini silemez.
async function kullaniciSil(userId) {
  const i = users.findIndex((u) => u.id === userId);
  if (i === -1) throw Object.assign(new Error("Üye bulunamadı."), { status: 404 });
  if (Ayarlar.yoneticiMi(users[i])) throw Object.assign(new Error("Yönetici hesabı silinemez."), { status: 400 });
  const uye = users[i];
  const yedek = path.join(dataDir, "silinenler", "uyeler");
  await fs.promises.mkdir(yedek, { recursive: true });
  await fs.promises.writeFile(path.join(yedek, `${uye.id}-${Date.now()}.json`), JSON.stringify({ ...uye, silinme: new Date().toISOString() }, null, 2), { mode: 0o600 });
  users.splice(i, 1);
  await saveUsers();
  return { id: uye.id, email: uye.email, name: uye.name || "" };
}

module.exports = { handleAuthRequest, dataDir, currentUser, kullaniciListesi, kullaniciSil };
