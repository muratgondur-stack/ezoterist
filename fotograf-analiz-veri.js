// Fotoğraf analizi bölümünün sabit içeriği (tarayıcı + sunucu): renklerin enerjisi ve çakralar.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FotografAnalizVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const renkler = [
    ["Kırmızı", "#d63b3b", "Tutku, canlılık ve cesaret; harekete geçme enerjisi."],
    ["Turuncu", "#f28c28", "Yaratıcılık, neşe ve keyif; hayattan zevk alma."],
    ["Sarı", "#f2c94c", "Aydınlık zihin, iyimserlik ve özgüven."],
    ["Yeşil", "#4caf72", "Şifa, büyüme, denge ve kalp enerjisi."],
    ["Mavi", "#3b7dd8", "Huzur, iletişim ve dürüstlük."],
    ["Lacivert", "#283c8c", "Sezgi, derin düşünce ve iç görü."],
    ["Mor", "#8e5bd6", "Ruhsallık, sezgi ve dönüşüm."],
    ["Pembe", "#e889b5", "Şefkat, sevgi ve yumuşaklık."],
    ["Beyaz", "#f4f1ea", "Arınma, sadelik ve yeni başlangıç."],
    ["Siyah", "#1d1d24", "Koruma, gizem ve güç."],
    ["Altın", "#d4a843", "Bolluk, başarı ve ilahi ışık."],
    ["Kahverengi", "#8a5a3b", "Topraklanma, güven ve istikrar."],
  ].map(([ad, kod, anlam]) => ({ ad, kod, anlam }));

  const cakralar = [
    ["Kök çakra", "Kırmızı", "Güven, topraklanma, hayatta kalma gücü."],
    ["Sakral çakra", "Turuncu", "Yaratıcılık, duygular ve keyif."],
    ["Solar pleksus", "Sarı", "İrade, özgüven ve kişisel güç."],
    ["Kalp çakrası", "Yeşil", "Sevgi, şefkat ve şifa."],
    ["Boğaz çakrası", "Mavi", "İletişim, ifade ve hakikat."],
    ["Üçüncü göz", "Lacivert", "Sezgi, iç görü ve hayal gücü."],
    ["Taç çakra", "Mor", "Ruhsal bağ, bilgelik ve bütünlük."],
  ];

  const ipuclari = [
    "Sana bir şey hissettiren herhangi bir fotoğraf olabilir: bir manzara, bir an, bir eşya ya da kendi fotoğrafın.",
    "Fotoğraf net ve aydınlık olsun; renkler ne kadar canlıysa enerji o kadar iyi okunur.",
    "İstersen fotoğrafla ilgili bir soru ya da niyet ekle.",
  ];

  return { renkler, cakralar, ipuclari };
});
