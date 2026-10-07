// Google AdSense reklam kodu (Murat 2026-10-07): sayfalara gömülü değil, sunucu HTML'i gönderirken yönetim
// panelindeki ayarlara göre ekler (Ayarlar → Reklam): ana anahtar, yayıncı kimliği ve bölgeler.
const Ayarlar = require("./ayarlar");

const SABIT = /^\/(gizlilik|kullanim-kosullari|bilgilendirme|hakkimizda|iletisim)$/;
const ASLA = /^\/(yonetim|login|register|forgot-password|arsiv|uzman|fiyatlar|mesafeli-satis|on-bilgilendirme|iptal-iade|ruhsal-gunluk|kupon)(\/|$)/;

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
const reklamEkle = (html, yol) => {
  const etiket = reklamEtiketi(yol);
  return etiket ? String(html).replace("</head>", `    ${etiket}\n  </head>`) : String(html);
};

module.exports = { reklamBolgesi, reklamEtiketi, reklamEkle };
