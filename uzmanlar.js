// Uzman kadrosu (tarayıcı + sunucu). Şimdilik tek aktif uzman var; "?" yerler yeni uzmanlar için ayrıldı.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Uzmanlar = factory();
})(typeof self !== "undefined" ? self : this, () => [
  {
    id: "bas-numerolog",
    ad: "Baş Numeroloğumuz",
    unvan: "Numeroloji ve astroloji uzmanı",
    tanitim: "Sayıların ve yıldızların dilini yıllardır yorumluyor. Haritanı kendi gözüyle okur, sana özel notlarını ekler.",
    resim: "/uzman/bas-numerolog.webp",
    aktif: true,
  },
  { id: "uzman-2", ad: "?", unvan: "Yakında", tanitim: "", resim: "", aktif: false },
  { id: "uzman-3", ad: "?", unvan: "Yakında", tanitim: "", resim: "", aktif: false },
  { id: "uzman-4", ad: "?", unvan: "Yakında", tanitim: "", resim: "", aktif: false },
]);
