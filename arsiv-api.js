// Kişisel arşiv: kullanıcının bütün bölümlerdeki analizleri, uzman talepleri ve kontör hesabı tek yerde.
// Profil ve şifre değişikliği auth.js'tedir (/api/profil, /api/sifre).
const fs = require("node:fs");
const path = require("node:path");
const { yardimci } = require("./astroloji-api");
const { kullaniciTalepleri } = require("./uzman-api");
const { kontorDefteri, TURLER } = require("./kontor");
const Odeme = require("./odeme");
const Kupon = require("./kupon");

const { sendJson, readJson, readCache } = yardimci;
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
  { dizin: "dizim", ad: "Taşlarla Dizim", link: "/tas#gunluk", ikon: "🪨" },
  { dizin: "semboller", ad: "Semboller", link: "/semboller#gunluk", ikon: "🔯", baslik: (k) => `${k.yorum?.sembol} · ${k.yorum?.baslik || ""}` },
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

// Hediye kuponun tarayıcıda çizilen görseli JSON içinde base64 gelir; genel okuyucunun 10 KB sınırı yetmez.
function buyukJsonOku(request, sinir = 3 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let boyut = 0;
    const parcalar = [];
    request.on("data", (p) => {
      boyut += p.length;
      if (boyut > sinir) { reject(Object.assign(new Error("Görsel çok büyük."), { status: 413 })); request.destroy(); return; }
      parcalar.push(p);
    });
    request.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(parcalar).toString("utf8"))); } catch { reject(Object.assign(new Error("Geçersiz istek."), { status: 400 })); }
    });
    request.on("error", reject);
  });
}

const KUPON_SAYFASI = /^\/kupon\/([A-Za-z0-9]{4}-?[A-Za-z0-9]{4}-?[A-Za-z0-9]{4})$/;
const KUPON_RESMI = /^\/kupon\/resim\/([A-Z0-9-]{14})\.jpg$/;

function createHandler({ dataDir, currentUser, sendFile }) {
  const kontor = kontorDefteri(dataDir);
  Kupon.devirZamanlayici(kontor);

  // Kontörüm sekmesinin ihtiyaç duyduğu ödeme bilgisi (paketler, satın alma açık mı).
  const hesapBilgisi = async (user) => ({
    ...(await kontor.oku(user.id)), turler: TURLER,
    yuklemeAcik: Odeme.acikMi(user), odemeModu: Odeme.hazir() ? Odeme.ayar().mod : null, paketler: Odeme.paketler(),
  });

  return function handleArsivRequest(request, response, url) {
    // PayTR'nin sunucudan sunucuya ödeme bildirimi: oturum yok, imza ile doğrulanır, düz metin cevap ister.
    if (url.pathname === Odeme.BILDIRIM_YOLU && request.method === "POST") {
      Odeme.bildirimIsle(request, kontor)
        .then(({ kod, metin }) => {
          if (kod !== 200) console.error("PayTR bildirimi reddedildi:", metin);
          response.writeHead(kod, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
          response.end(metin);
        })
        .catch((error) => {
          console.error("PayTR bildirimi işlenemedi:", error);
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("PAYTR notification failed: server error");
        });
      return true;
    }
    // Hediye kupon: herkese açık sayfa, görsel ve bilgi (kodu bilen görür; yalnız ödenmiş kuponlar).
    if (request.method === "GET" || request.method === "HEAD") {
      if (KUPON_SAYFASI.test(url.pathname)) { sendFile(request, response, path.join(__dirname, "kupon.html")); return true; }
      const resim = KUPON_RESMI.exec(url.pathname);
      if (resim) {
        const yol = Kupon.hediyeResimYolu(resim[1]);
        if (yol) sendFile(request, response, yol);
        else { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); response.end("Not found"); }
        return true;
      }
      if (url.pathname === "/api/kupon/bilgi") {
        const bilgi = Kupon.hediyeBilgisi(url.searchParams.get("kod"));
        sendJson(response, bilgi ? 200 : 404, bilgi || { error: "Böyle bir hediye kupon bulunamadı." });
        return true;
      }
    }
    if (url.pathname !== "/api/arsiv" && !url.pathname.startsWith("/api/kontor")) return false;
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Giriş yapmalısınız." });
      return true;
    }
    const routes = {
      "GET /api/arsiv": async () => {
        const [analizler, talepler, hesap] = await Promise.all([analizleriTopla(dataDir, user.id), kullaniciTalepleri(dataDir, user.id), kontor.oku(user.id)]);
        sendJson(response, 200, { analizler, talepler, kontor: { ...hesap, ...(await hesapBilgisi(user)) } });
      },
      "GET /api/kontor": async () => sendJson(response, 200, await hesapBilgisi(user)),
      // Paket satın alma: PayTR güvenli ödeme sayfasının adresi döner. Kontör yalnız PayTR bildiriminde eklenir.
      "POST /api/kontor/yukle": async () => {
        const body = await readJson(request);
        if (body?.onay !== true) throw Object.assign(new Error("Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi onaylanmalı."), { status: 400 });
        sendJson(response, 200, await Odeme.odemeBaslat(request, user, Number(body?.tutar)));
      },
      // Hediye kupon 1. adım: tasarım ve alıcı bilgisi, kod ayrılır (ödeme yapılmadıkça kullanılamaz).
      "POST /api/kontor/hediye/hazirla": async () => {
        if (!Odeme.acikMi(user)) throw Object.assign(new Error("Hediye kupon satışı çok yakında açılacak."), { status: 503 });
        const body = await readJson(request);
        const tutar = Number(body?.tutar);
        if (!Odeme.PAKETLER.includes(tutar)) throw Object.assign(new Error("Geçersiz tutar."), { status: 400 });
        sendJson(response, 200, await Kupon.hediyeHazirla(user, { ...body, tutar, kontor: Odeme.paketKontoru(tutar) }));
      },
      // 2. adım: çizilen görsel kaydedilir, PayTR ödeme sayfasının adresi döner.
      "POST /api/kontor/hediye/ode": async () => {
        const body = await buyukJsonOku(request);
        if (body?.onay !== true) throw Object.assign(new Error("Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi onaylanmalı."), { status: 400 });
        const resim = Buffer.from(String(body?.resim || "").replace(/^data:image\/jpeg;base64,/, ""), "base64");
        const kupon = await Kupon.hediyeResmi(user, body?.kod, resim);
        sendJson(response, 200, await Odeme.odemeBaslat(request, user, kupon.hediye.tutar, Kupon.kodNormalle(body.kod)));
      },
      "GET /api/kontor/hediyeler": async () => sendJson(response, 200, { hediyeler: Kupon.hediyelerim(user.id), sablonlar: Kupon.SABLONLAR, sureGun: Kupon.HEDIYE_SURESI / 86400000 }),
      "POST /api/kontor/kupon": async () => {
        const body = await readJson(request);
        sendJson(response, 200, await Kupon.kullan(user, body?.kod, kontor));
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
        if (error.status && error.status < 500 || error.status === 502 || error.status === 503) return sendJson(response, error.status, { error: error.message });
        console.error("Arşiv:", error);
        sendJson(response, 500, { error: "Bir sorun oluştu. Lütfen tekrar deneyin." });
      });
    return true;
  };
}

module.exports = { createHandler };
