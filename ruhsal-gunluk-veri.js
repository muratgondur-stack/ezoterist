// Ruhsal günlük verisi (tarayıcı + sunucu): duygular ve her gün değişen günlük soruları.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GunlukVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const duygular = [
    { id: "huzurlu", ad: "Huzurlu", ikon: "🕊️", renk: "#7fd1b9", puan: 2 },
    { id: "mutlu", ad: "Mutlu", ikon: "😊", renk: "#fcbf49", puan: 2 },
    { id: "minnettar", ad: "Minnettar", ikon: "🙏", renk: "#f3c26b", puan: 2 },
    { id: "umutlu", ad: "Umutlu", ikon: "🌱", renk: "#8fd694", puan: 1 },
    { id: "ilhamli", ad: "İlhamlı", ikon: "✨", renk: "#b388eb", puan: 2 },
    { id: "sakin", ad: "Sakin", ikon: "🌊", renk: "#4cc9f0", puan: 1 },
    { id: "yorgun", ad: "Yorgun", ikon: "😮‍💨", renk: "#8d99ae", puan: -1 },
    { id: "kaygili", ad: "Kaygılı", ikon: "🌪️", renk: "#a29bfe", puan: -2 },
    { id: "huzunlu", ad: "Hüzünlü", ikon: "🌧️", renk: "#5a7bd8", puan: -2 },
    { id: "ofkeli", ad: "Öfkeli", ikon: "🔥", renk: "#e5383b", puan: -2 },
    { id: "kararsiz", ad: "Kararsız", ikon: "🌫️", renk: "#b8b8c8", puan: -1 },
    { id: "yalniz", ad: "Yalnız", ikon: "🌙", renk: "#6c63a8", puan: -1 },
  ];

  const sorular = [
    "Bugün seni en çok ne şaşırttı?",
    "Bugün kendine nasıl bir iyilik yaptın?",
    "Şu an bedeninde nerede bir gerginlik hissediyorsun ve ne söylemek istiyor?",
    "Bugün hangi an, kendini en çok 'sen' gibi hissettirdi?",
    "Bırakmaya hazır olduğun bir düşünce ya da alışkanlık hangisi?",
    "Son zamanlarda tekrar tekrar karşına çıkan bir işaret var mı?",
    "Bir yıl sonraki sana bugün ne söylemek isterdin?",
    "Bugün kimden bir şey öğrendin?",
    "Seni bugün ne yordu, ne besledi?",
    "Şu an hayatında neyin değişmesini istiyorsun ve ilk küçük adım ne olabilir?",
    "Çocukluğundan bugüne taşıdığın güzel bir özellik hangisi?",
    "Bugün sezgin sana ne fısıldadı?",
    "Kimi affetmeye hazırsın? Belki de kendini?",
    "Hangi korkun aslında seni korumaya çalışıyor?",
    "Bugün doğada ne fark ettin?",
    "Seni en son ne zaman bir şey derinden heyecanlandırdı?",
    "Hayatındaki en büyük öğretmenin kim ya da ne?",
    "Bugün 'hayır' demen gereken bir an oldu mu?",
    "Şu an sahip olduğun ve bir zamanlar hayalini kurduğun şey ne?",
    "Ruhunu besleyen üç küçük şeyi yaz.",
    "Bugün hangi duygudan kaçtın? Onu birkaç cümleyle karşıla.",
    "Kendinde en çok neyi takdir ediyorsun?",
    "Bir rüyan ya da hayalin sana bugün ne hatırlattı?",
    "Hangi ilişkin şu an daha fazla ilgi istiyor?",
    "Bugün zamanın nasıl aktığını hissettin: hızlı mı, yavaş mı? Neden?",
    "Sana iyi gelen bir sözü ya da cümleyi yaz.",
    "Şu an bir dilek hakkın olsa neyi dilerdin?",
    "Bugün bir şey için 'yeterince iyi' diyebildin mi?",
    "Hayatında hangi kapı kapanırken hangisi açılıyor?",
    "Yarın kendine hangi niyetle uyanmak istersin?",
  ];

  // Gün kodundan (YYYY-AA-GG) her gün değişen soru.
  const gununSorusu = (gun) => {
    const n = gun.split("-").reduce((t, v) => t * 31 + Number(v), 7);
    return sorular[n % sorular.length];
  };

  return { duygular, sorular, gununSorusu, duyguBul: (id) => duygular.find((d) => d.id === id) };
});
