// Rüya yorumu bölümünün sabit içeriği (tarayıcı + sunucu): sembol sözlüğü ve duygu seçenekleri.
// Her sembolde geleneksel (halk ve kültür yorumu) ve psikolojik bakış yan yana durur.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RuyaVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  // [ad, eşleşen kelime kökleri, geleneksel, psikolojik]
  const semboller = [
    ["Su", ["su ", "suy", "sular"], "Berrak su ferahlık, bereket ve helal kazanç olarak yorumlanır; bulanık su sıkıntıya işarettir.", "Duygularının akışını temsil eder; suyun hâli iç dünyanın ne kadar sakin ya da çalkantılı olduğunu gösterir."],
    ["Deniz", ["deniz"], "Sakin deniz devlet, itibar ve geniş imkânlar; dalgalı deniz önündeki sınavlar diye yorumlanır.", "Bilinçaltının derinliğini ve büyük duyguları simgeler."],
    ["Yağmur", ["yağmur"], "Rahmet ve bolluk olarak yorumlanır; dertlerin yıkanıp gideceğine işarettir.", "Arınma, rahatlama ve bastırılmış duyguların dışa vurulmasıdır."],
    ["Yılan", ["yılan"], "Gizli bir düşmana ya da kıskançlığa işaret sayılır; yılanı yenmek zafer demektir.", "Dönüşüm, şifa ve korkuyla yüzleşme; kabuk değiştirme zamanıdır."],
    ["Diş", ["diş"], "Diş dökülmesi akrabalarla ilgili bir haber ya da uzun ömür olarak yorumlanır.", "Kontrolü kaybetme kaygısı, görünüş ya da kendini ifade etme endişesidir."],
    ["Uçmak", ["uç", "uçu"], "Yükselme, murada erme ve yolculuk müjdesi olarak yorumlanır.", "Özgürlük isteği ve sınırlarının ötesine geçme arzusudur."],
    ["Düşmek", ["düş"], "Makam ya da işte bir sarsıntıya işaret sayılır; kalkmak toparlanma demektir.", "Güvensizlik, kontrolü kaybetme korkusu ya da hayatında dayanaksız kalma hissidir."],
    ["Kovalanmak", ["kovala", "peşimde", "kaçıyor", "kaçtım", "kaçıy"], "Kaçarken kurtulmak, bir dertten selamete çıkmak diye yorumlanır.", "Yüzleşmekten kaçtığın bir duygu ya da durum seni takip ediyor olabilir."],
    ["Ölüm", ["ölüm", "öldü", "ölmüş", "ölüyor"], "Rüyada ölüm çoğunlukla uzun ömür ve bir dönemin kapanıp yenisinin başlaması olarak yorumlanır.", "Bir şeyin bitip yeni bir başlangıca yer açması; dönüşümün sembolüdür."],
    ["Ölmüş yakını görmek", ["rahmetli", "vefat", "merhum"], "Hayır dua beklediğine ya da size bir müjde getirdiğine yorumlanır.", "Özlem, tamamlanmamış duygular ve onun sende yaşayan izleridir."],
    ["Bebek", ["bebek"], "Yeni bir başlangıç, sevinçli haber ve bereket olarak yorumlanır.", "Yeni bir fikir, proje ya da içindeki saf ve korunmaya muhtaç yanındır."],
    ["Hamilelik", ["hamile", "gebe"], "Mal, rızık ve hayırlı bir gelişme olarak yorumlanır.", "İçinde büyüyen bir fikir, değişim ya da yaratıcı bir süreçtir."],
    ["Ev", ["ev ", "evi", "evim", "evde", "evin"], "Ev aile, huzur ve hayatın kendisidir; yeni ev yeni bir dönem demektir.", "Benliğinin farklı katmanları; odalar iç dünyanın bölümleridir."],
    ["Kapı", ["kapı"], "Açık kapı fırsat ve murada erme, kapalı kapı ertelenen işler olarak yorumlanır.", "Yeni olasılıklar, geçişler ve vermen gereken kararlar."],
    ["Merdiven", ["merdiven"], "Çıkmak yükseliş ve başarı, inmek bir işten el çekme diye yorumlanır.", "Adım adım ilerleme, gelişim ve hedeflerine yaklaşmadır."],
    ["Yol", ["yol "], "Düz yol işlerin kolaylaşması, yolculuk değişim ve haber olarak yorumlanır.", "Hayat yolculuğun ve önündeki seçimlerdir."],
    ["Araba", ["araba", "otomobil", "araç"], "Yol, yolculuk ve hayatında hızlanan işler olarak yorumlanır.", "Hayatının kontrolü kimde: direksiyondaysan kontrol sende demektir."],
    ["Uçak", ["uçak"], "Uzak yerlerden haber, yükselme ve beklenen bir işin hızlanması.", "Büyük hedefler ve hayatında yükseğe çıkma isteği."],
    ["Sınav", ["sınav"], "Hayatta bir imtihanın ve sonunda gelecek başarının işaretidir.", "Kendini değerlendirme, yetersiz kalma kaygısı ve hazırlıksız yakalanma korkusudur."],
    ["Para", ["para"], "Kâğıt para çoğu yorumda dert ve tasa, bozuk para dedikodu olarak yorumlanır.", "Öz değerin, enerjin ve neye değer verdiğindir."],
    ["Altın", ["altın"], "Kadın için ziynet ve mutluluk, erkek için sorumluluk olarak yorumlanır.", "Değerli olan, içindeki saklı potansiyel ve kendine verdiğin değerdir."],
    ["Kedi", ["kedi"], "Ev içinden bir hırsız ya da yakın çevrede sinsi biri olarak yorumlanır.", "Bağımsızlık, sezgi ve dişil enerji; kendine özen gösterme çağrısıdır."],
    ["Köpek", ["köpek"], "Sadık dost olarak, saldırgan köpek ise düşman olarak yorumlanır.", "Sadakat, koruma ve içgüdülerindir."],
    ["At", ["at ", "atı", "atla"], "Murada erme, itibar ve güç olarak yorumlanır.", "Yaşam enerjin, tutkun ve özgürlüğündür."],
    ["Kuş", ["kuş"], "Güzel haber ve müjde olarak yorumlanır.", "Özgürlük, ruhsal yükseliş ve hafiflik."],
    ["Balık", ["balık"], "Helal rızık ve kazanç olarak yorumlanır.", "Bilinçaltından gelen sezgiler ve fikirler."],
    ["Ateş", ["ateş", "yangın", "alev"], "Kontrol altındaki ateş aydınlık ve güç, yangın ise fitne ve telaş olarak yorumlanır.", "Tutku, öfke ya da dönüştürücü bir enerjidir."],
    ["Dağ", ["dağ"], "Yüksek bir makam ve zor ama ulaşılabilir hedef olarak yorumlanır.", "Aşılması gereken engeller ve ulaşmak istediğin zirvelerdir."],
    ["Ağaç", ["ağaç"], "Yeşil ağaç uzun ömür, bereket ve hayırlı bir insan olarak yorumlanır.", "Kişisel gelişimin, köklerin ve büyüyüşündür."],
    ["Çiçek", ["çiçek", "gül"], "Sevinç, güzel söz ve muhabbet olarak yorumlanır.", "Açılan duygular, güzellik ve kendini ifade etmedir."],
    ["Bahçe", ["bahçe"], "Huzur, bereket ve güzel günler olarak yorumlanır.", "İç dünyanın bakımı; kendine ne kadar özen gösterdiğindir."],
    ["Ay", [" ay ", "dolunay", "hilal"], "Saygın biri ya da yükseliş olarak yorumlanır; dolunay murada ermedir.", "Duygular, döngüler ve sezgilerdir."],
    ["Güneş", ["güneş"], "Devlet, makam ve aydınlık günler olarak yorumlanır.", "Bilinç, yaşam enerjisi ve netliktir."],
    ["Yıldız", ["yıldız"], "Saygın insanlar, ilim ve umut olarak yorumlanır.", "Umut, rehberlik ve hayallerindir."],
    ["Gelinlik", ["gelinlik", "düğün", "nikah", "evlen"], "Düğün rüyası çoğu zaman bir işin hayırla sonuçlanması diye yorumlanır.", "Bir bütünleşme, yeni bir bağlılık ya da hayatında birleşen iki yön."],
    ["Ayakkabı", ["ayakkabı"], "Yolculuk, eş ya da iş hayatında yeni bir adım olarak yorumlanır.", "Hayattaki duruşun ve attığın adımlardır."],
    ["Saç", ["saç"], "Uzun ve gür saç ömür ve bereket, saç kesmek bir yükten kurtulma diye yorumlanır.", "Güç, kimlik ve kendine bakışındır."],
    ["Ayna", ["ayna"], "Kendi hâlini görmek ve bir haber almak olarak yorumlanır.", "Kendinle yüzleşme ve öz farkındalık."],
    ["Okul", ["okul", "sınıf"], "İlim, öğrenmek ve hayatta yeni dersler olarak yorumlanır.", "Geçmişten gelen dersler ve hâlâ öğrenmekte olduğun şeylerdir."],
    ["Hastane", ["hastane", "doktor"], "Şifa ve sıkıntıdan kurtuluş olarak yorumlanır.", "İyileşme ihtiyacı; ilgilenmen gereken bir yaran olabilir."],
    ["Kaybolmak", ["kayboldum", "kaybol", "yolumu"], "Bir işte şaşkınlık, sonra doğru yolu bulma olarak yorumlanır.", "Yön arayışı, kararsızlık ve hayatında netlik ihtiyacıdır."],
    ["Çıplak olmak", ["çıplak"], "Bir sırrın açığa çıkması ya da arınma olarak yorumlanır.", "Savunmasız hissetmek ya da olduğun gibi görünme isteğidir."],
    ["Anne", ["anne"], "Bereket, dua ve şefkat olarak yorumlanır.", "Şefkat ihtiyacı, köklerin ve içindeki koruyucu yan."],
    ["Baba", ["baba"], "Destek, otorite ve yol gösterici olarak yorumlanır.", "Otorite, güvenlik ve kendi iç disiplinin."],
    ["Eski sevgili", ["eski sevgili", "eski eşim", "eski sevgilim"], "Geçmişten gelen bir haber ya da kapanmamış bir hesap olarak yorumlanır.", "Çoğu zaman kişinin kendisi değil, o dönemde hissettiğin duygudur."],
    ["Kar", ["kar ", "karlı"], "Bereket, ferahlık ve dertlerin hafiflemesi olarak yorumlanır.", "Donmuş duygular, durgunluk ya da tertemiz bir başlangıç."],
    ["Köprü", ["köprü"], "Bir zorluktan geçip kurtuluşa erme olarak yorumlanır.", "Bir dönemden diğerine geçiş ve bağlantı kurmadır."],
    ["Anahtar", ["anahtar"], "Bir işin çözülmesi ve hayırlı kapıların açılması olarak yorumlanır.", "Bir sorunun çözümü ya da kendine dair keşfedeceğin bir sırdır."],
  ].map(([ad, kokler, geleneksel, psikolojik]) => ({ ad, kokler, geleneksel, psikolojik }));

  const hisler = ["Huzur", "Mutluluk", "Merak", "Şaşkınlık", "Korku", "Kaygı", "Üzüntü", "Öfke", "Özlem", "Hiçbir şey"];

  // Rüya metninde geçen sözlük sembolleri (yapay zekâ yokken yedek yorum ve sözlük vurgusu için).
  function sembolBul(metin) {
    const t = ` ${metin.toLocaleLowerCase("tr-TR")} `;
    return semboller.filter((s) => s.kokler.some((k) => t.includes(k)));
  }

  return { semboller, hisler, sembolBul };
});
