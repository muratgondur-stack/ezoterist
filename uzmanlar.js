// Numerolog kadrosu (tarayıcı + sunucu): Burcu, Ayça, Feryal, Şenay (Murat 2026-10-02). Talepler aynı uzman paneline düşer.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Uzmanlar = factory();
})(typeof self !== "undefined" ? self : this, () => [
  {
    id: "bas-numerolog",
    ad: "Burcu",
    unvan: "Baş numeroloğumuz",
    tanitim: "Sayıların ve yıldızların dilini yıllardır yorumluyor. Analizini kendi gözüyle okur, sana özel notlarını ekler.",
    resim: "/uzman/bas-numerolog.webp",
    aktif: true,
  },
  { id: "uzman-2", ad: "Ayça", unvan: "Numerolog", tanitim: "", resim: "/uzman/numerolog-b.webp", video: "/uzman/numerolog-b.mp4", aktif: true },
  { id: "uzman-3", ad: "Feryal", unvan: "Numerolog", tanitim: "", resim: "/uzman/numerolog-c.webp", video: "/uzman/numerolog-c.mp4", aktif: true },
  { id: "uzman-4", ad: "Şenay", unvan: "Numerolog", tanitim: "", resim: "/uzman/numerolog-d.webp", video: "/uzman/numerolog-d.mp4", aktif: true },
]);
