// Ay takvimi metinleri (tarayıcı + sunucu): 8 evre, Ay'ın 12 burçtaki günlük teması, Yeni Ay ve Dolunay temaları.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AyVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  // Evre sırası astro.js moonPhase() ile aynı: elongation 0 = Yeni Ay.
  const evreler = [
    { ad: "Yeni Ay", anahtar: ["niyet", "tohum", "başlangıç"],
      oneri: "Niyet zamanı. Sessizleş, ne istediğini yaz; yeni başlangıçların tohumunu ek.",
      dogum: "Yeni Ay'da doğanlar içgüdüsel, kendiliğinden ve yeniye açıktır; hayatı ilk kez görüyormuş gibi yaşarlar." },
    { ad: "Büyüyen Hilal", anahtar: ["cesaret", "ilk adım", "inanç"],
      oneri: "İlk adımları at. Niyetin için küçük ama somut bir hareket yap; şüphelere kulak asma.",
      dogum: "Büyüyen Hilal'de doğanlar geçmişin alışkanlıklarından sıyrılıp yeni bir yol açma gücü taşır." },
    { ad: "İlk Dördün", anahtar: ["karar", "eylem", "engel aşma"],
      oneri: "Karar ve eylem zamanı. Önüne çıkan engeller, niyetinin ne kadar güçlü olduğunu sınar.",
      dogum: "İlk Dördün'de doğanlar harekete geçen, kriz anında karar veren ve yapı kuran kişilerdir." },
    { ad: "Büyüyen Ay", anahtar: ["geliştirme", "ince ayar", "sabır"],
      oneri: "Geliştir ve ince ayar yap. Planlarını gözden geçir, sabırla olgunlaştır.",
      dogum: "Büyüyen Ay'da doğanlar mükemmeli arayan, anlam ve gelişim peşinde koşan kişilerdir." },
    { ad: "Dolunay", anahtar: ["doruk", "farkındalık", "şükran"],
      oneri: "Hasat ve farkındalık zamanı. Neyin gerçekleştiğine bak, şükret; artık sana hizmet etmeyeni bırak.",
      dogum: "Dolunay'da doğanlar ilişkilerde kendini bulan, duygusal farkındalığı yüksek ve aydınlatıcı kişilerdir." },
    { ad: "Küçülen Ay", anahtar: ["paylaşma", "öğretme", "minnet"],
      oneri: "Öğrendiklerini paylaş. Bilgini ve bolluğunu başkalarına aktarma zamanı.",
      dogum: "Küçülen Ay'da doğanlar bildiklerini paylaşan, öğretmen ve yol gösterici ruhlardır." },
    { ad: "Son Dördün", anahtar: ["bırakma", "değerlendirme", "dönüşüm"],
      oneri: "Bırakma ve temizlik zamanı. Eski alışkanlıkları, gereksiz eşyaları ve yükleri geride bırak.",
      dogum: "Son Dördün'de doğanlar eskiyi sorgulayan, değişim için cesurca dönüşen kişilerdir." },
    { ad: "Küçülen Hilal", anahtar: ["dinlenme", "teslimiyet", "hazırlık"],
      oneri: "Dinlen ve içe dön. Döngü kapanıyor; meditasyon, uyku ve sessizlikle yeni Ay'a hazırlan.",
      dogum: "Küçülen Hilal'de doğanlar bir döngüyü tamamlayan, geleceği sezen, ruhsal ve vizyoner kişilerdir." },
  ];

  // Ay'ın bulunduğu burca göre günün teması ve geleneksel olarak uygun sayılan işler.
  const ayBurcunda = {
    koc: { tema: "Enerji yüksek, sabır düşük. Cesur başlangıçlar için güçlü bir gün.", uygun: ["yeni bir işe başlamak", "spor", "cesaret isteyen konuşmalar"] },
    boga: { tema: "Huzur, konfor ve somut işler öne çıkar. Yavaş ama sağlam ilerlemek için ideal.", uygun: ["bahçe ve bitki işleri", "güzellik bakımı", "maddi planlar"] },
    ikizler: { tema: "Merak ve iletişim canlı. Konuşmalar, yazışmalar ve kısa yollar bereketli.", uygun: ["yazışmalar", "öğrenme", "kısa yolculuklar"] },
    yengec: { tema: "Duygular derin, ev ve aile ön planda. İçe dönmek ve sevdiklerinle olmak iyi gelir.", uygun: ["ev düzeni", "aileyle zaman", "yemek yapmak"] },
    aslan: { tema: "Kendini ifade etme, yaratıcılık ve neşe günü. Kalbinden gelenle parla.", uygun: ["yaratıcı işler", "kutlamalar", "kendini göstermek"] },
    basak: { tema: "Düzen, ayrıntı ve verimlilik. Ertelenen işleri toparlamak için ideal.", uygun: ["temizlik ve düzen", "sağlıklı rutinler", "planlama"] },
    terazi: { tema: "Uyum, ilişkiler ve estetik öne çıkar. Uzlaşma ve güzellik için güzel bir gün.", uygun: ["ilişkileri onarmak", "sanat ve estetik", "anlaşmalar"] },
    akrep: { tema: "Duygular yoğun ve derin. Gizli olanı keşfetmek, dönüşüm ve arınma zamanı.", uygun: ["derin sohbetler", "arınma", "araştırma"] },
    yay: { tema: "İyimserlik ve özgürlük havası. Ufkunu genişleten her şey bereketli.", uygun: ["öğrenmek", "seyahat planları", "felsefi sohbetler"] },
    oglak: { tema: "Disiplin ve sorumluluk günü. Uzun vadeli hedeflere odaklanmak verimli olur.", uygun: ["kariyer adımları", "planlama", "zor görevler"] },
    kova: { tema: "Özgünlük, dostluk ve yenilik. Alışılmışın dışına çıkmak için ilham verici.", uygun: ["arkadaşlarla buluşmak", "yeni fikirler", "topluluk işleri"] },
    balik: { tema: "Sezgi, hayal ve şefkat derinleşir. Sanat, meditasyon ve dinlenme için ideal.", uygun: ["meditasyon", "sanat ve müzik", "dinlenmek"] },
  };

  // Yeni Ay'ın burcu niyetin temasını, Dolunay'ın burcu farkındalığın temasını verir.
  const yeniAyTemasi = {
    koc: "cesaret, yeni başlangıçlar ve kendin için bir şey başlatmak",
    boga: "maddi güven, bedenin ve hayatındaki huzur",
    ikizler: "iletişim, öğrenme ve yeni bağlantılar",
    yengec: "yuva, aile ve duygusal güven",
    aslan: "yaratıcılık, özgüven ve kalbinin sesi",
    basak: "sağlıklı düzen, iş ve günlük alışkanlıklar",
    terazi: "ilişkiler, denge ve uyum",
    akrep: "derin dönüşüm, yakınlık ve bırakmak",
    yay: "anlam, inanç, öğrenme ve ufuk açmak",
    oglak: "hedefler, kariyer ve sağlam temeller",
    kova: "özgürlük, dostluk ve gelecek hayalleri",
    balik: "ruhsallık, şifa, sezgi ve teslimiyet",
  };

  return { evreler, ayBurcunda, yeniAyTemasi };
});
