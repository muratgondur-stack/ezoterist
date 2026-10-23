// Google AdSense reklam kodu (Murat 2026-10-07): sayfalara gömülü değil, sunucu HTML'i gönderirken yönetim
// panelindeki ayarlara göre ekler (Ayarlar → Reklam): ana anahtar, yayıncı kimliği ve bölgeler.
const Ayarlar = require("./ayarlar");

const SABIT = /^\/(gizlilik|kullanim-kosullari|bilgilendirme|hakkimizda|iletisim)$/;
const ASLA = /^\/(offline\.html|yonetim|login|register|forgot-password|arsiv|uzman|fiyatlar|mesafeli-satis|on-bilgilendirme|iptal-iade|ruhsal-gunluk|kupon)(\/|$)/;

// Sayfanın reklam bölgesi: anasayfa, rehber, sabit (yasal/bilgi sayfaları), bolumler ya da null (hiç reklam yok).
function reklamBolgesi(yol) {
  const y = String(yol || "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (ASLA.test(y)) return null;
  if (y === "/") return "anasayfa";
  if (y === "/rehber" || y.startsWith("/rehber/")) return "rehber";
  if (SABIT.test(y)) return "sabit";
  return "bolumler";
}

// Android uygulaması (Play, TWA) ve ana ekrana eklenen uygulama içinde reklam gösterilmez (Murat 2026-10-23).
// Uygulama ilk açılışta /?kaynak=uygulama ile ya da "android-app://" yönlendirmesiyle gelir; sunucu bunu ezo_app
// çerezine yazar (server.js), sonraki sayfalar da çerezden tanınır.
// 2026-10-23: Play uygulaması şimdilik yok (Murat: "değmez"); kural kapalı. Play'e çıkılırsa true yap.
const PLAY_UYGULAMASI_REKLAMSIZ = false;
const uygulamadanMi = (request) => PLAY_UYGULAMASI_REKLAMSIZ && Boolean(request) && (/(?:^|;\s*)ezo_app=1(?:;|$)/.test(request.headers?.cookie || "")
  || /[?&]kaynak=uygulama(&|$)/.test(request.url || "") || String(request.headers?.referer || "").startsWith("android-app://"));

function reklamEtiketi(yol, request) {
  if (!Ayarlar.get("reklam.acik") || uygulamadanMi(request)) return "";
  const bolge = reklamBolgesi(yol);
  if (!bolge || !Ayarlar.get(`reklam.${bolge}`)) return "";
  const yayinci = String(Ayarlar.get("reklam.yayinci") || "");
  if (!/^ca-pub-\d{10,20}$/.test(yayinci)) return "";
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${yayinci}" crossorigin="anonymous"></script>`;
}

// HTML'e </head>'den hemen önce ekler.
// Uygulama (PWA / Android) bağlantısı da her sayfaya buradan eklenir (Murat 2026-10-23).
const MANIFEST = '<link rel="manifest" href="/manifest.json" />';
const reklamEkle = (html, yol, request) => {
  const etiket = reklamEtiketi(yol, request);
  const ek = [String(html).includes('rel="manifest"') ? "" : MANIFEST, etiket].filter(Boolean).join("\n    ");
  return ek ? String(html).replace("</head>", `    ${ek}\n  </head>`) : String(html);
};

module.exports = { reklamBolgesi, reklamEtiketi, reklamEkle, uygulamadanMi };
