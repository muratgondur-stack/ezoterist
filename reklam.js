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

function reklamEtiketi(yol) {
  if (!Ayarlar.get("reklam.acik")) return "";
  const bolge = reklamBolgesi(yol);
  if (!bolge || !Ayarlar.get(`reklam.${bolge}`)) return "";
  const yayinci = String(Ayarlar.get("reklam.yayinci") || "");
  if (!/^ca-pub-\d{10,20}$/.test(yayinci)) return "";
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${yayinci}" crossorigin="anonymous"></script>`;
}

// HTML'e </head>'den hemen önce ekler.
// Uygulama (PWA / Android) bağlantısı da her sayfaya buradan eklenir (Murat 2026-10-23).
const MANIFEST = '<link rel="manifest" href="/manifest.json" />';
const reklamEkle = (html, yol) => {
  const etiket = reklamEtiketi(yol);
  const ek = [String(html).includes('rel="manifest"') ? "" : MANIFEST, etiket].filter(Boolean).join("\n    ");
  return ek ? String(html).replace("</head>", `    ${ek}\n  </head>`) : String(html);
};

module.exports = { reklamBolgesi, reklamEtiketi, reklamEkle };
