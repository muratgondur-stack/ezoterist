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
  // Diğer numeroloğlarımız (Murat 2026-10-02): görselleri hazır, isimleri gelince "?" yerine yazılır ve aktif edilir.
  { id: "uzman-2", ad: "?", unvan: "Numerolog · yakında", tanitim: "", resim: "/uzman/numerolog-b.webp", video: "/uzman/numerolog-b.mp4", aktif: false },
  { id: "uzman-3", ad: "?", unvan: "Numerolog · yakında", tanitim: "", resim: "/uzman/numerolog-c.webp", video: "/uzman/numerolog-c.mp4", aktif: false },
  { id: "uzman-4", ad: "?", unvan: "Numerolog · yakında", tanitim: "", resim: "/uzman/numerolog-d.webp", video: "/uzman/numerolog-d.mp4", aktif: false },
]);
