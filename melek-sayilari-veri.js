// Melek sayıları sözlüğü (tarayıcı + sunucu): rakamların temel titreşimleri ve sık görülen sayıların anlamları.
// Sözlükte olmayan sayılar rakamlarından ve indirgenmiş toplamından yorumlanır (yorumla()).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MelekVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  const rakamlar = {
    0: { ad: "Sonsuzluk", anahtar: ["başlangıç", "bütünlük", "potansiyel"], anlam: "Her şeyin başladığı boşluk; ilahi kaynakla bağ, sınırsız potansiyel ve yeni bir döngünün eşiği." },
    1: { ad: "Yaratım", anahtar: ["niyet", "cesaret", "yeni başlangıç"], anlam: "Düşüncelerin hızla gerçeğe dönüştüğü an; niyetini net tut, ilk adımı at." },
    2: { ad: "Denge", anahtar: ["uyum", "ortaklık", "güven"], anlam: "İş birliği, sabır ve inanç; her şey zamanında yerine oturuyor." },
    3: { ad: "İfade", anahtar: ["yaratıcılık", "neşe", "rehberlik"], anlam: "Yüce rehberler yanında; yaratıcılığını ve sesini özgürce kullan." },
    4: { ad: "Koruma", anahtar: ["temel", "emek", "melek desteği"], anlam: "Melekler etrafında; sağlam temeller atıyorsun ve yalnız değilsin." },
    5: { ad: "Değişim", anahtar: ["özgürlük", "dönüşüm", "macera"], anlam: "Büyük bir değişim kapıda; akışa güven, eskiyi bırak." },
    6: { ad: "Şefkat", anahtar: ["aile", "denge", "sevgi"], anlam: "Ev, aile ve sevgi; maddi kaygıları bırakıp kalbine ve dengeye dön." },
    7: { ad: "Bilgelik", anahtar: ["sezgi", "ruhsal uyanış", "şans"], anlam: "Ruhsal yolda doğru adımlar; sezgin güçlü, şans senden yana." },
    8: { ad: "Bolluk", anahtar: ["bereket", "güç", "karma"], anlam: "Verdiğin geri dönüyor; bolluk ve başarı akışı açılıyor." },
    9: { ad: "Tamamlanma", anahtar: ["kapanış", "hizmet", "ruh amacı"], anlam: "Bir döngü tamamlanıyor; ruh amacına ve başkalarına hizmet etmeye çağrılıyorsun." },
  };

  const S = (sayi, baslik, mesaj, ask, is, ruhsal, olumlama) => ({ sayi, baslik, mesaj, ask, is, ruhsal, olumlama });

  const sayilar = [
    S("000", "Yeni bir sayfa", "Evrenle bütünlük içindesin. Bir döngü kapandı, tertemiz bir sayfa açılıyor; ne düşündüğüne dikkat et, çünkü yeni başlangıcın tohumları şimdi ekiliyor.",
      "Kalbinde yeni bir ilişkiye ya da mevcut bağında yeni bir sayfaya yer açılıyor; geçmişin yükünü bırak.",
      "Sıfırdan bir başlangıç için uygun zaman; fikirlerin henüz şekilsiz ama potansiyelleri sınırsız.",
      "İlahi kaynakla bağın güçlü; sessizlik ve meditasyon sana yön gösterecek.",
      "Evrenle bütünüm; her yeni başlangıca açığım."),
    S("111", "Niyetin tezahür kapısı", "Düşüncelerin şu an olağanüstü hızla gerçeğe dönüşüyor. Korkularına değil, gerçekten istediğin şeye odaklan; dilek kapısı açık.",
      "Aşkta ne istediğini net düşün; karşına çıkacak kişi niyetinin yansıması olabilir.",
      "Yeni bir proje, iş ya da girişim için yeşil ışık; ilk adımı ertelemeyin.",
      "Ruhsal uyanışın başladığına dair bir işaret; farkındalığın genişliyor.",
      "Düşüncelerimi sevgiyle seçiyor, hayallerimi gerçeğe dönüştürüyorum."),
    S("222", "Güven ve sabır", "Her şey olması gerektiği gibi ilerliyor. Ektiğin tohumlar toprağın altında filizleniyor; sonucu görmesen de inancını koru.",
      "İlişkinde uyum ve denge zamanı; sabırla yaklaşırsan bağınız derinleşecek.",
      "Ortaklıklar ve iş birlikleri bereketli; aceleye gerek yok, zamanlama mükemmel.",
      "Evrene teslim olmayı öğreniyorsun; kontrolü bırakmak seni rahatlatacak.",
      "Her şey en hayırlı zamanında yerine oturuyor; güveniyorum."),
    S("333", "Yüce rehberler yanında", "Ruhsal rehberlerin ve yüce öğretmenler seninle. Yaratıcılığını, neşeni ve sesini özgürce ifade et; destekleniyorsun.",
      "Sevgini ifade etmekten çekinme; içtenliğin karşındakinin kalbini açacak.",
      "Yaratıcı fikirlerin ve iletişim becerin şimdi parlıyor; kendini göstermekten korkma.",
      "Beden, zihin ve ruhunu dengeleme çağrısı; dua ettiklerin duyuluyor.",
      "Yaratıcılığım akıyor; rehberlerimin desteğini hissediyorum."),
    S("444", "Melekler etrafını sarmış", "Melekler seni koruyor ve destekliyor. Attığın emekli adımlar sağlam bir temel oluşturuyor; doğru yoldasın, yorulsan da devam et.",
      "İlişkinde güven ve istikrar inşa ediliyor; sağlam bir bağ için emek veriyorsun.",
      "Çalışmaların karşılıksız kalmayacak; disiplinin seni hedefe taşıyor.",
      "Yalnız değilsin; zor anlarda yardım istemek için meleklerine seslenebilirsin.",
      "Meleklerim yanımda; güvendeyim ve sağlam adımlarla ilerliyorum."),
    S("555", "Büyük değişim kapıda", "Hayatında önemli bir dönüşüm başlıyor. Eskiyi bırakmak korkutucu olabilir ama bu değişim seni özgürleştirecek ve büyütecek.",
      "Aşk hayatında beklenmedik bir değişim; yeni bir kişi ya da ilişkinde yeni bir dönem.",
      "Kariyerde yön değişikliği, yeni fırsatlar ya da taşınma gündemde olabilir.",
      "Ruhun büyümek için alan istiyor; akışa direnme.",
      "Değişimi kucaklıyorum; her dönüşüm beni en iyi hâlime taşıyor."),
    S("666", "Dengeye dön", "Korkulacak bir sayı değil; nazik bir hatırlatma. Maddi kaygılara fazla odaklandın; kalbine, ailene ve iç dengene geri dön.",
      "Sevdiklerine zaman ayır; ilişkine şefkat ve ilgiyle yeniden bak.",
      "Para kaygısını bırakıp değer verdiğin işlere odaklandığında bolluk kendiliğinden gelecek.",
      "Düşüncelerini korkudan sevgiye çevir; ruhun dinlenmeye ihtiyaç duyuyor.",
      "Hayatımda denge kuruyor, kalbimi sevgiye açıyorum."),
    S("777", "Ruhsal şans dönemi", "Ruhsal yolunda çok doğru adımlar atıyorsun ve evren bunu ödüllendiriyor. Sezgilerin güçlü, mucizelere açık ol.",
      "Ruh eşi bağlantıları ve derin, anlamlı bir ilişki için uygun zaman.",
      "Öğrenme, araştırma ve uzmanlaşma alanlarında şans kapıları açılıyor.",
      "İç sesin seni yönlendiriyor; meditasyon ve sessizlik yeni farkındalıklar getirecek.",
      "Sezgilerime güveniyorum; mucizeler hayatıma akıyor."),
    S("888", "Bolluk akışı", "Bolluk, bereket ve finansal akış kapını çalıyor. Verdiğin emeğin ve iyiliğin karşılığını almaya hazır ol; karma senden yana işliyor.",
      "İlişkinde karşılıklı verme ve alma dengesi güçleniyor; emeğin karşılık buluyor.",
      "Maddi gelişme, terfi ya da kazanç için çok uygun bir dönem.",
      "Bolluğun yalnız maddi değil ruhsal da olduğunu hatırla; şükran onu çoğaltır.",
      "Bolluğa layığım; bereket her yönden bana akıyor."),
    S("999", "Döngü tamamlanıyor", "Hayatında bir bölüm sona eriyor. Artık sana hizmet etmeyenleri sevgiyle uğurla; yeni ve daha anlamlı bir başlangıç yolda.",
      "Bitmesi gereken bir şey bitiyor ya da ilişkin daha olgun bir seviyeye geçiyor.",
      "Bir projeyi tamamlama ve ruh amacına uygun işlere yönelme zamanı.",
      "Işık işçisi yanın uyanıyor; başkalarına ilham olma potansiyelin yüksek.",
      "Geçmişi şükranla bırakıyor, yeni döngüme hazırlanıyorum."),
    S("1010", "Ruhsal uyanış yolu", "Doğru yoldasın ve evren seni bir üst seviyeye çağırıyor. Olumlu düşünceni koru; yeni bir bilinç dönemi başlıyor.",
      "Kendini sevdikçe doğru ilişkiler hayatına çekilecek.",
      "Kişisel gelişimine yatırım yap; yeni beceriler kapı açacak.",
      "Uyanış süreci hızlanıyor; tesadüf gibi görünen işaretlere dikkat et.",
      "Yolumda emin adımlarla ilerliyor, ruhumla uyum içinde yaşıyorum."),
    S("1111", "Tezahür portalı", "Evrenin en güçlü işaretlerinden biri: dilek kapısı ardına kadar açık. Şu an ne düşündüğüne ve neyi dilediğine çok dikkat et.",
      "İkiz alev ya da ruh eşi bağlantılarının işareti olarak da görülür; kalbin uyanıyor.",
      "Hayalindeki işe dair net bir niyet kur; fırsatlar senkronik biçimde belirecek.",
      "Ruhsal uyanışın güçlü bir anı; yüksek benliğinle bağlantıdasın.",
      "Niyetlerim saf, dileklerim evrenle uyum içinde gerçekleşiyor."),
    S("1212", "Konfor alanından çık", "Ruhsal büyümen için konfor alanının dışına adım atma zamanı. Olumlu kal; yeni deneyimler seni hayal ettiğinden daha ileri taşıyacak.",
      "Aşkta cesur ol; duygularını açmak yeni kapılar açacak.",
      "Yeni beceriler ve cesur hamleler kariyerinde atılım getirecek.",
      "Hayat amacına doğru ilerliyorsun; iyimserlik en büyük gücün.",
      "Cesaretle büyüyor, yeni deneyimlere kucak açıyorum."),
    S("1221", "Kendine inan", "Kendi gücüne ve yeteneklerine inanman isteniyor. Olumsuz düşünceleri bırak; ilerleme yolunda desteklendiğin bir dönemdesin.",
      "İlişkinde kendi değerini bilmek, daha sağlıklı bir bağ kurmanı sağlayacak.",
      "Kendine güvenle sunduğun fikirler kabul görecek.",
      "Ruhsal yolunda yeni bir kapı açılıyor; ona güvenle yürü.",
      "Kendime ve yolumdaki desteğe inanıyorum."),
    S("1234", "Adım adım ilerle", "Hayatın sade ve sıralı adımlarla yoluna giriyor. Her şeyi bir anda halletmeye çalışma; doğru sırayla her şey açılacak.",
      "İlişkinde aceleye gerek yok; doğal ilerleyiş en sağlam bağı kuracak.",
      "Planlı ve aşamalı ilerlemek hedefine ulaştıracak.",
      "Hayatını sadeleştirmek ruhuna nefes aldıracak.",
      "Her adımım beni hedefime yaklaştırıyor."),
    S("1313", "Yaratıcı yeniden doğuş", "Yeni bir başlangıçla yaratıcı enerjin birleşiyor. Rehberlerin, fikirlerini cesurca hayata geçirmen için seni destekliyor.",
      "Aşkta neşe ve oyun enerjisi yükseliyor; kendini olduğun gibi göster.",
      "Yaratıcı bir projeye başlamak ya da yeteneklerini işe dönüştürmek için uygun zaman.",
      "Dönüşüm sürecindesin; bu süreçte yalnız olmadığını bil.",
      "Yaratıcılığımla yeniden doğuyorum."),
    S("1414", "Sağlam temeller, yeni başlangıç", "Melekler, hayallerini sağlam temeller üzerine kurman için seni yönlendiriyor. Pratik adımlar at; destek yanında.",
      "Güven üzerine kurulmuş bir ilişki seni besleyecek.",
      "Disiplinli çalışma yeni bir başlangıcı kalıcı başarıya çevirecek.",
      "Pozitif düşünce ve emek birleştiğinde mucizeler doğar.",
      "Hayallerimi sağlam temeller üzerine inşa ediyorum."),
    S("1515", "Olumlu değişim", "Hayatında olumlu bir değişim başlıyor ve sen bu değişimin yaratıcısısın. Düşüncelerini iyimser tut, akış seni doğru yere götürecek.",
      "İlişkinde ya da aşk hayatında taze bir rüzgâr esiyor.",
      "Yeni bir yön, yeni bir iş ya da yeni bir şehir gündemde olabilir.",
      "Özgürleşiyorsun; eski kalıplar dağılıyor.",
      "Değişimi seçiyor, özgürce büyüyorum."),
    S("1717", "Doğru yoldasın", "Ruhsal ve maddi yolun aynı yöne bakıyor. Sezgilerinle aldığın kararlar seni başarıya taşıyor; devam et.",
      "Derin ve anlamlı bir bağ için kalbin hazır.",
      "Sezgisel kararların iş hayatında şans getiriyor.",
      "Bilgeliğin artıyor; öğrendiklerini paylaşma zamanı.",
      "Sezgim beni doğru yere taşıyor."),
    S("2020", "Sabırla bekle, güven", "İnancını koru; evren planını sessizce hazırlıyor. Kontrol etmeye çalışma, bırak her şey kendi zamanında aksın.",
      "İlişkinde sabır ve yumuşaklık bağınızı güçlendirecek.",
      "Ortaklıklar ve iş birlikleri zamanla meyvesini verecek.",
      "Evrene teslimiyet içsel huzurunu artıracak.",
      "Sabırla bekliyor, evrenin zamanlamasına güveniyorum."),
    S("2121", "İyimserlik ve ilerleme", "Olumlu bir dönemin eşiğindesin. Eski alışkanlıkları bırakıp yeni ve sağlıklı düzenler kurmak sana iyi gelecek.",
      "Aşkta iyimserlik ve açıklık yeni güzellikler çekecek.",
      "Yeni bir düzen ve ortaklık işinde ilerleme sağlayacak.",
      "Düşüncelerin hayatını şekillendiriyor; onları özenle seç.",
      "İyimserlikle ilerliyor, güzellikleri çekiyorum."),
    S("2222", "Her şey yerine oturuyor", "Uyum, denge ve ilahi zamanlama. Hayatının parçaları tek tek yerine oturuyor; inancını koruduğun sürece sonuç güzel olacak.",
      "Ruh eşi bağları ve uyumlu ilişkiler güç kazanıyor.",
      "İş birlikleri ve diplomatik yaklaşımlar başarı getiriyor.",
      "İç huzurun arttıkça dış dünyan da düzene giriyor.",
      "Hayatım uyum içinde; her şey yerli yerine oturuyor."),
    S("1122", "Hayallerin şekilleniyor", "Niyetlerin ile ilahi zamanlama buluşuyor. Hayal ettiğin şey somutlaşmaya başlıyor; sabır ve güvenle devam et.",
      "Kalbinin istediği bağ yavaş yavaş hayatına giriyor.",
      "Fikirlerin ortaklıklar sayesinde hayata geçecek.",
      "İç sesinle evrenin sesi aynı şeyi söylüyor.",
      "Niyetlerim zamanında ve en güzel hâliyle gerçekleşiyor."),
    S("1144", "Koruma altında yeni başlangıç", "Yeni bir başlangıç yapıyorsun ve melekler bu adımı koruyor. Korkmadan ilerle; sağlam bir destek ağı yanında.",
      "Yeni bir ilişkiye güvenle adım atabilirsin.",
      "Yeni işin ya da projen sağlam temeller üzerine kuruluyor.",
      "Meleklerinle bağın güçlü; onlara niyetini söyle.",
      "Yeni yolumda korunuyor ve destekleniyorum."),
    S("1222", "Yeni dönem, uyum içinde", "Yeni bir dönem başlıyor ve bu dönemin anahtarı uyum. Kendi önceliklerinle başkalarının ihtiyaçları arasında güzel bir denge kuracaksın.",
      "İlişkinde yeni ve uyumlu bir sayfa açılıyor.",
      "Yeni ortaklıklar ve ekip çalışmaları verimli olacak.",
      "Dengeyi bulduğunda yolun kendiliğinden açılacak.",
      "Yeni dönemime uyum ve sevgiyle başlıyorum."),
    S("717", "İç sesini dinle", "Sezgilerin bu dönemde çok güçlü. Başkalarının fikirlerinden çok kendi iç bilgeliğine güven; doğru cevap zaten içinde.",
      "Kalbinin sesi aşkta sana doğru yolu gösteriyor.",
      "Araştırma, öğrenme ve uzmanlık alanında başarı var.",
      "Ruhsal bir öğretmen ya da öğreti hayatına girebilir.",
      "İç sesime güveniyorum; cevaplar içimde."),
    S("818", "Bolluk kapısı açılıyor", "Bir dönem kapanırken bolluk dolu yeni bir dönem başlıyor. Eski kaygıları bırak; bereket yolda.",
      "Duygusal olarak daha dengeli ve doyurucu bir dönem başlıyor.",
      "Maddi olarak yeni fırsatlar ve kazanç kapıları açılıyor.",
      "Şükran duygusu bolluğu çoğaltacak.",
      "Bolluğun yeni kapılarına açığım."),
  ];

  const sozluk = Object.fromEntries(sayilar.map((s) => [s.sayi, s]));

  // Sayının rakamları ve indirgenmiş kökü (numerolojik toplam).
  function kok(sayi) {
    let n = String(sayi).split("").reduce((t, d) => t + Number(d), 0);
    while (n > 9) n = String(n).split("").reduce((t, d) => t + Number(d), 0);
    return n;
  }

  // Sözlükte olmayan bir sayı için rakamlarından yorum çıkarır.
  function yorumla(sayi) {
    const temiz = String(sayi).replace(/\D/g, "");
    if (sozluk[temiz]) return { ...sozluk[temiz], kaynak: "sozluk", kok: kok(temiz) };
    const sayim = {};
    temiz.split("").forEach((d) => { sayim[d] = (sayim[d] || 0) + 1; });
    const baskin = Object.entries(sayim).sort((a, b) => b[1] - a[1])[0][0];
    const k = kok(temiz);
    const parcalar = Object.keys(sayim).map((d) => `${d}: ${rakamlar[d].anlam}`);
    return {
      sayi: temiz,
      baslik: baskin === String(k) ? `${rakamlar[k].ad} titreşimi` : `${rakamlar[baskin].ad} ve ${rakamlar[k].ad.toLocaleLowerCase("tr-TR")}`,
      mesaj: `Bu sayıda en güçlü titreşim ${baskin} rakamında: ${rakamlar[baskin].anlam} Toplamı ${k} sayısına iner; ${rakamlar[k].anlam.charAt(0).toLocaleLowerCase("tr-TR")}${rakamlar[k].anlam.slice(1)}`,
      ask: "", is: "", ruhsal: "",
      olumlama: (() => { const t = rakamlar[k].anahtar.join(", "); return `${t.charAt(0).toLocaleUpperCase("tr-TR")}${t.slice(1)} hayatıma akıyor.`; })(),
      parcalar,
      kaynak: "rakam",
      kok: k,
    };
  }

  // Yaşam yolu sayısından kişisel melek sayısı (üstat sayılar 1111, 2222, 333 olur).
  function kisiselSayi(yasamYolu) {
    if (yasamYolu === 11) return "1111";
    if (yasamYolu === 22) return "2222";
    if (yasamYolu === 33) return "333";
    return String(yasamYolu).repeat(3);
  }

  return { rakamlar, sayilar, sozluk, yorumla, kok, kisiselSayi };
});
