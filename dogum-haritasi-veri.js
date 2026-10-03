// Doğum haritası metinleri (tarayıcı + sunucu): 12 ev, açı türleri ve gezegen anahtar kelimeleri.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DogumHaritasiVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const evler = [
    { ad: "1. Ev", baslik: "Benlik", anahtar: "kimlik · görünüş · başlangıçlar", aciklama: "Dünyaya nasıl adım attığın, ilk izlenimin, bedenin ve hayata yaklaşımın. Yükselen burcun bu evin kapısıdır." },
    { ad: "2. Ev", baslik: "Değerler", anahtar: "para · yetenek · özdeğer", aciklama: "Kazandıkların, sahip oldukların, yeteneklerin ve kendine verdiğin değer. Güvende hissetmek için neye ihtiyaç duyduğun." },
    { ad: "3. Ev", baslik: "İletişim", anahtar: "konuşma · öğrenme · kardeşler", aciklama: "Düşünme ve konuşma biçimin, okul yılların, kardeşlerin, komşuların ve kısa yolculukların." },
    { ad: "4. Ev", baslik: "Yuva", anahtar: "aile · kökler · iç dünya", aciklama: "Ailen, çocukluğun, evin ve ruhunun en derindeki güvenli limanı. Haritanın temeli." },
    { ad: "5. Ev", baslik: "Yaratıcılık", anahtar: "aşk · sanat · çocuklar · keyif", aciklama: "Kalbinin neşesi: flörtler, aşk heyecanı, yaratıcılık, oyun, hobiler ve çocuklar." },
    { ad: "6. Ev", baslik: "Günlük hayat", anahtar: "iş · sağlık · alışkanlıklar", aciklama: "Günlük düzenin, çalışma ortamın, sağlık alışkanlıkların ve başkalarına hizmet etme biçimin." },
    { ad: "7. Ev", baslik: "İlişkiler", anahtar: "evlilik · ortaklık · karşındaki", aciklama: "Eşin, ortakların, yakın ilişkilerin; kendinde göremediğin ve karşındakinde aradığın özellikler." },
    { ad: "8. Ev", baslik: "Dönüşüm", anahtar: "paylaşım · derinlik · yeniden doğuş", aciklama: "Ortak kaynaklar, miras, yakınlığın en derin hâli, krizler ve küllerinden doğma gücün." },
    { ad: "9. Ev", baslik: "Anlam", anahtar: "inanç · felsefe · uzak yollar", aciklama: "İnançların, hayat felsefen, yüksek öğrenim, uzak ülkeler ve ufkunu genişleten her şey." },
    { ad: "10. Ev", baslik: "Kariyer", anahtar: "hedefler · statü · toplumdaki yerin", aciklama: "Meslek yolun, başarıların, toplumun seni nasıl tanıdığı ve hayatta bırakmak istediğin iz. Tepe Noktası (MC) bu evin kapısıdır." },
    { ad: "11. Ev", baslik: "Topluluk", anahtar: "dostlar · gruplar · hayaller", aciklama: "Arkadaşların, ait olduğun topluluklar, sosyal çevren ve geleceğe dair umutların." },
    { ad: "12. Ev", baslik: "Ruh", anahtar: "bilinçaltı · inziva · ruhsallık", aciklama: "Görünmeyen dünyan: bilinçaltın, rüyaların, yalnız kalma ihtiyacın, şifa ve ruhsal teslimiyet." },
  ];

  const acilar = {
    kavusum: { ad: "Kavuşum", sembol: "☌", renk: "#f3c26b", dogasi: "birleşim", anlam: "İki enerji iç içe geçer ve birlikte çalışır; birbirini güçlendirir, ayrı düşünülemez." },
    altmislik: { ad: "Altmışlık", sembol: "⚹", renk: "#7fd3ff", dogasi: "fırsat", anlam: "Kolay akan bir fırsat bağı; biraz çabayla iki enerji birbirine destek olur." },
    kare: { ad: "Kare", sembol: "□", renk: "#ff6b6b", dogasi: "gerilim", anlam: "Sürtünme ve meydan okuma; bu gerilim seni harekete geçiren, büyüten bir güce dönüşür." },
    ucgen: { ad: "Üçgen", sembol: "△", renk: "#6be3a4", dogasi: "ahenk", anlam: "Doğal bir yetenek ve uyum; iki enerji kendiliğinden, zahmetsizce birlikte akar." },
    karsit: { ad: "Karşıt", sembol: "☍", renk: "#c58bff", dogasi: "denge", anlam: "İki uç arasında salınım; dengeyi bulduğunda, karşıtlık bütünlüğe dönüşür." },
  };

  // Açı cümlelerinde kullanılan yalın anahtar kelimeler ("Şans ile sorumluluk arasında gerilim").
  const anahtar = {
    sun: "kimlik", moon: "duygular", mercury: "zihin", venus: "sevgi", mars: "irade",
    jupiter: "şans", saturn: "sorumluluk", uranus: "özgürlük", neptune: "hayaller", pluto: "dönüşüm",
  };

  return { evler, acilar, anahtar };
});
