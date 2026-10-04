// Ebced ve cifir hesapları (tarayıcı + sunucu, Murat 2026-10-04).
// Türkçe yazı yaklaşık Osmanlı imlâsıyla Arap harflerine çevrilir (kullanıcı düzeltebilir), her harfin ebced değeri
// toplanır; unsur (ateş/hava/su/toprak) dağılımı, isim burcu ve 4×4 vefk (sihirli kare) çıkarılır. Cifir, aynı
// değerler üzerinde geleneksel "tarh" işlemleriyle (28, 12, 7, 4, 3'e bölüm kalanları) cevap harflerini bulur.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EbcedVeri = factory();
})(typeof self !== "undefined" ? self : this, () => {
  // 28 harf, ebced (ebced-hevvez) sırasıyla. unsur: ates | hava | su | toprak (klasik dağılım).
  const HARFLER = [
    { h: "ا", ad: "Elif", d: 1, unsur: "ates", anahtar: ["birlik", "başlangıç", "dik duruş"] },
    { h: "ب", ad: "Be", d: 2, unsur: "hava", anahtar: ["ev", "bereket", "kapı"] },
    { h: "ج", ad: "Cim", d: 3, unsur: "su", anahtar: ["güzellik", "toplanma", "cömertlik"] },
    { h: "د", ad: "Dal", d: 4, unsur: "toprak", anahtar: ["yol", "delil", "sağlam temel"] },
    { h: "ه", ad: "He", d: 5, unsur: "ates", anahtar: ["nefes", "hayat", "uyanış"] },
    { h: "و", ad: "Vav", d: 6, unsur: "hava", anahtar: ["bağ", "dostluk", "birleştirme"] },
    { h: "ز", ad: "Ze", d: 7, unsur: "su", anahtar: ["süs", "tohum", "artış"] },
    { h: "ح", ad: "Ha", d: 8, unsur: "toprak", anahtar: ["hayat gücü", "sevgi", "koruma"] },
    { h: "ط", ad: "Tı", d: 9, unsur: "ates", anahtar: ["temizlik", "arınma", "iyilik"] },
    { h: "ي", ad: "Ye", d: 10, unsur: "hava", anahtar: ["el", "güç", "yardım"] },
    { h: "ك", ad: "Kef", d: 20, unsur: "su", anahtar: ["avuç", "yeterlilik", "kabul"] },
    { h: "ل", ad: "Lam", d: 30, unsur: "toprak", anahtar: ["öğrenme", "yönelme", "lütuf"] },
    { h: "م", ad: "Mim", d: 40, unsur: "ates", anahtar: ["su", "anne", "olgunluk"] },
    { h: "ن", ad: "Nun", d: 50, unsur: "hava", anahtar: ["nur", "kalem", "derinlik"] },
    { h: "س", ad: "Sin", d: 60, unsur: "su", anahtar: ["selamet", "sır", "huzur"] },
    { h: "ع", ad: "Ayn", d: 70, unsur: "toprak", anahtar: ["göz", "kaynak", "görüş"] },
    { h: "ف", ad: "Fe", d: 80, unsur: "ates", anahtar: ["ağız", "söz", "açılım"] },
    { h: "ص", ad: "Sad", d: 90, unsur: "hava", anahtar: ["sadakat", "sabır", "doğruluk"] },
    { h: "ق", ad: "Kaf", d: 100, unsur: "su", anahtar: ["kudret", "kalp", "dağ"] },
    { h: "ر", ad: "Re", d: 200, unsur: "toprak", anahtar: ["baş", "rahmet", "rızık"] },
    { h: "ش", ad: "Şın", d: 300, unsur: "ates", anahtar: ["şifa", "çoğalma", "şevk"] },
    { h: "ت", ad: "Te", d: 400, unsur: "hava", anahtar: ["tamamlanma", "tevazu", "iz"] },
    { h: "ث", ad: "Se", d: 500, unsur: "su", anahtar: ["sebat", "kalıcılık", "sağlamlık"] },
    { h: "خ", ad: "Hı", d: 600, unsur: "toprak", anahtar: ["hayır", "gizli olan", "hazine"] },
    { h: "ذ", ad: "Zel", d: 700, unsur: "ates", anahtar: ["zikir", "hatırlama", "ışık"] },
    { h: "ض", ad: "Dad", d: 800, unsur: "hava", anahtar: ["aydınlık", "karşıtların dengesi", "güç"] },
    { h: "ظ", ad: "Zı", d: 900, unsur: "su", anahtar: ["gölge", "zahir olan", "koruma"] },
    { h: "غ", ad: "Gayın", d: 1000, unsur: "toprak", anahtar: ["gayb", "bulut", "derin bilgi"] },
  ];
  // Farsça/Osmanlıca ek harfler: değerleri benzer harfinkidir.
  const EK = { "پ": { ad: "Pe", es: "ب" }, "چ": { ad: "Çim", es: "ج" }, "ژ": { ad: "Je", es: "ز" }, "گ": { ad: "Gef", es: "ك" } };
  const HARF = Object.fromEntries(HARFLER.map((x, i) => [x.h, { ...x, sira: i + 1 }]));
  const harfBilgisi = (c) => HARF[c] || (EK[c] ? { ...HARF[EK[c].es], h: c, ad: EK[c].ad } : null);

  const UNSURLAR = {
    ates: { ad: "Ateş", sifat: "ateşî", anahtar: "cesaret, tutku, harekete geçme" },
    hava: { ad: "Hava", sifat: "havaî", anahtar: "fikir, iletişim, hafiflik" },
    su: { ad: "Su", sifat: "mâî", anahtar: "duygu, sezgi, şefkat" },
    toprak: { ad: "Toprak", sifat: "turâbî", anahtar: "sabır, emek, sağlamlık" },
  };
  const BURCLAR = [
    { ad: "Koç", eski: "Hamel", unsur: "ates" }, { ad: "Boğa", eski: "Sevr", unsur: "toprak" }, { ad: "İkizler", eski: "Cevzâ", unsur: "hava" },
    { ad: "Yengeç", eski: "Seretân", unsur: "su" }, { ad: "Aslan", eski: "Esed", unsur: "ates" }, { ad: "Başak", eski: "Sünbüle", unsur: "toprak" },
    { ad: "Terazi", eski: "Mîzân", unsur: "hava" }, { ad: "Akrep", eski: "Akrep", unsur: "su" }, { ad: "Yay", eski: "Kavs", unsur: "ates" },
    { ad: "Oğlak", eski: "Cedî", unsur: "toprak" }, { ad: "Kova", eski: "Delv", unsur: "hava" }, { ad: "Balık", eski: "Hût", unsur: "su" },
  ];
  // Yedi seyyare (gün sırası klasik: Zuhal'den Kamer'e).
  const GEZEGENLER = [
    { ad: "Zühal (Satürn)", gun: "Cumartesi", anahtar: "sabır, zaman, sınır" },
    { ad: "Müşteri (Jüpiter)", gun: "Perşembe", anahtar: "bolluk, hikmet, genişleme" },
    { ad: "Merih (Mars)", gun: "Salı", anahtar: "cesaret, mücadele, hız" },
    { ad: "Şems (Güneş)", gun: "Pazar", anahtar: "ışık, onur, merkez" },
    { ad: "Zühre (Venüs)", gun: "Cuma", anahtar: "sevgi, uyum, güzellik" },
    { ad: "Utarid (Merkür)", gun: "Çarşamba", anahtar: "söz, ticaret, akıl" },
    { ad: "Kamer (Ay)", gun: "Pazartesi", anahtar: "duygu, değişim, sezgi" },
  ];
  const EGILIM = [
    { ad: "Dikkat", ikon: "⚖️", anahtar: "yeniden düşün, acele etme, gözden kaçanı ara" },
    { ad: "Açık kapı", ikon: "🗝️", anahtar: "yol açık, niyet olumlu, adım atılabilir" },
    { ad: "Sabır", ikon: "⏳", anahtar: "zamanı gelmedi, bekle, hazırlan" },
  ];

  // --- Türkçeden yaklaşık Osmanlı imlâsı ---
  const KALIN = /[aıou]/;
  const UNSUZ = { b: "ب", c: "ج", "ç": "چ", d: "د", f: "ف", "ğ": "غ", h: "ه", j: "ژ", l: "ل", m: "م", n: "ن", p: "پ", r: "ر", s: "س", "ş": "ش", t: "ت", v: "و", y: "ي", z: "ز" };
  function kelimeCevir(k) {
    const kalin = (k.match(/[aeıioöuü]/g) || []).filter((v) => KALIN.test(v)).length >= (k.match(/[eiöü]/g) || []).length;
    let s = "";
    [...k].forEach((c, i) => {
      const bas = i === 0;
      const son = i === k.length - 1;
      if (UNSUZ[c]) { s += UNSUZ[c]; return; }
      if (c === "k") { s += kalin ? "ق" : "ك"; return; }
      if (c === "g") { s += kalin ? "غ" : "گ"; return; }
      if (c === "a") { s += "ا"; return; }
      if (c === "e") { s += bas ? "ا" : son ? "ه" : ""; return; }
      if (c === "ı") { s += bas ? "ا" : ""; return; }
      if (c === "i") { s += bas ? "اي" : "ي"; return; }
      if ("oöuü".includes(c)) { s += bas ? "او" : "و"; return; }
    });
    return s;
  }
  const cevir = (metin) => String(metin || "").toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü\s]/g, " ").split(/\s+/).filter(Boolean).map(kelimeCevir).join(" ");

  // Arap harfli yazıyı hesaplar: harfler, toplam, unsur dağılımı, burç, vefk.
  function hesapla(arapca) {
    const harfler = [...String(arapca || "")].map(harfBilgisi).filter(Boolean);
    const toplam = harfler.reduce((t, x) => t + x.d, 0);
    const unsur = { ates: 0, hava: 0, su: 0, toprak: 0 };
    harfler.forEach((x) => { unsur[x.unsur] += 1; });
    const baskin = Object.entries(unsur).sort((a, b) => b[1] - a[1])[0][0];
    return { harfler: harfler.map((x) => ({ h: x.h, ad: x.ad, d: x.d, unsur: x.unsur })), toplam, unsur, baskin, burc: burcBul(toplam), kucuk: toplam % 9 || (toplam ? 9 : 0) };
  }
  const burcBul = (n) => BURCLAR[((n % 12) + 11) % 12];

  // 4×4 vefk (murabba): klasik 1..16 deseni n + k ile kaydırılır, artan (0-3) 13..16 hücrelerine eklenir.
  // Böylece her satır, sütun ve iki köşegen toplamı hedef sayıyı verir. Hedef 34'ten küçükse 34 kullanılır.
  const DESEN = [[8, 11, 14, 1], [13, 2, 7, 12], [3, 16, 9, 6], [10, 5, 4, 15]];
  function vefk(hedef) {
    const s = Math.max(34, Math.round(hedef) || 0);
    const k = Math.floor((s - 34) / 4);
    const r = (s - 34) % 4;
    return { hedef: s, kare: DESEN.map((satir) => satir.map((n) => n + k + (n >= 13 ? r : 0))) };
  }

  // Cifir: isim + anne adı + soru değerlerinin toplamı üzerinde tarh (bölüm kalanları).
  const harfSirayla = (n) => HARFLER[((n % 28) + 27) % 28];
  function cifir(toplam) {
    const rakamToplami = String(toplam).split("").reduce((t, d) => t + Number(d), 0);
    return {
      toplam,
      cevapHarfleri: [harfSirayla(toplam), harfSirayla(Math.floor(toplam / 28) || 28), harfSirayla(rakamToplami)].map((x) => ({ h: x.h, ad: x.ad, d: x.d, unsur: x.unsur, anahtar: x.anahtar })),
      unsur: ["toprak", "ates", "hava", "su"][toplam % 4],
      burc: burcBul(toplam),
      gezegen: GEZEGENLER[toplam % 7],
      egilim: EGILIM[toplam % 3],
      vefk: vefk(toplam),
    };
  }

  return { HARFLER, EK, UNSURLAR, BURCLAR, GEZEGENLER, EGILIM, harfBilgisi, cevir, hesapla, vefk, cifir, burcBul };
});
