// El çizgileri rehberi (Murat 2026-10-07): el falı sayfasında "📖 El çizgileri rehberi" düğmesiyle açılan, sayfa sayfa
// gezilen pencere. Bilgiler geleneksel el falı kaynaklarından (Murat'ın verdiği: Mehmet Ali Bulut, "Elfabe – El ve Yüz
// Çizgilerinin Anlamı") yararlanılarak KENDİ SÖZLERİMİZLE özetlendi; kitap metni aynen alınmadı. Sitenin kuralı gereği
// ömür, ölüm ve hastalık hükümleri yumuşatıldı. Şemalar tarayıcıda SVG ile çizilir (kitabın çizimleri kullanılmadı).
(() => {
  if (window.elCizgiRehberi) return;
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, props = {}, ...c) => { const e = Object.assign(document.createElement(tag), props); e.append(...c); return e; };

  // --- Şema çizimi ---------------------------------------------------------------------------------------------
  // Sağ avuç, parmaklar yukarıda; başparmak solda. Hayat çizgisi başparmak ile işaret parmağı arasından başlayıp
  // Venüs tepesinin çevresinden bileğe iner. Eğriler kübik Bezier; işaretler eğri üzerindeki noktalara konur.
  const bez = (p, t) => {
    const u = 1 - t;
    return [0, 1].map((i) => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]);
  };
  const turev = (p, t) => {
    const u = 1 - t;
    return [0, 1].map((i) => 3 * u * u * (p[1][i] - p[0][i]) + 6 * u * t * (p[2][i] - p[1][i]) + 3 * t * t * (p[3][i] - p[2][i]));
  };
  const normal = (p, t) => { const [dx, dy] = turev(p, t); const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const parca = (p, a, b, kayma = 0, dalga = 0) => {
    const n = 40;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = a + ((b - a) * i) / n;
      const [x, y] = bez(p, t);
      const [nx, ny] = normal(p, t);
      const o = kayma + (dalga ? Math.sin(i * 0.9) * dalga : 0);
      pts.push(`${(x + nx * o).toFixed(1)},${(y + ny * o).toFixed(1)}`);
    }
    return `M${pts.join(" L")}`;
  };
  const HAYAT = {
    normal: [[47, 66], [62, 86], [64, 124], [50, 150]],
    uzun: [[47, 66], [63, 88], [66, 130], [52, 157]],
    kisa: [[47, 66], [58, 78], [61, 96], [59, 110]],
    genis: [[47, 66], [76, 86], [80, 128], [56, 152]],
    dar: [[47, 66], [52, 86], [52, 120], [44, 148]],
    disa: [[47, 66], [62, 86], [68, 118], [82, 148]],
  };

  function sema({ el: renk = "#e99c86", cizim = [], numara = [] } = {}) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 165");
    svg.setAttribute("aria-hidden", "true");
    const g = (ad, attrs) => { const e = document.createElementNS(NS, ad); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); svg.append(e); return e; };
    const gr = g("radialGradient", { id: `ten${renk.slice(1)}`, cx: "45%", cy: "55%", r: "70%" });
    [["0%", "#ffe3d8", 0.9], ["100%", renk, 1]].forEach(([o, c, op]) => { const s = document.createElementNS(NS, "stop"); s.setAttribute("offset", o); s.setAttribute("stop-color", c); s.setAttribute("stop-opacity", op); gr.append(s); });
    const ten = `url(#ten${renk.slice(1)})`;
    // El: avuç, dört parmak, başparmak.
    g("ellipse", { cx: 22, cy: 100, rx: 11, ry: 27, transform: "rotate(-32 22 100)", fill: ten });
    [[34, 22, 15], [51, 10, 16], [69, 16, 15], [86, 32, 13]].forEach(([x, y, w]) => g("rect", { x, y, width: w, height: 60, rx: w / 2, fill: ten }));
    g("rect", { x: 26, y: 56, width: 76, height: 98, rx: 24, fill: ten });
    // Hafif tepe gölgeleri (Venüs, Ay, parmak altları).
    [[40, 118, 15, 22], [88, 124, 12, 18], [42, 64, 7, 5], [59, 62, 7, 5], [76, 64, 7, 5], [92, 70, 6, 5]].forEach(([cx, cy, rx, ry]) => g("ellipse", { cx, cy, rx, ry, fill: "#fff1ea", opacity: 0.35 }));
    const cizgi = (d, w = 2.2, ek = {}) => g("path", { d, fill: "none", stroke: "#7d1414", "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", ...ek });
    const isaret = {
      ada: (x, y, r = 4.6) => g("ellipse", { cx: x, cy: y, rx: r, ry: r * 1.5, fill: "none", stroke: "#7d1414", "stroke-width": 2 }),
      kare: (x, y) => g("rect", { x: x - 6, y: y - 6, width: 12, height: 12, fill: "none", stroke: "#7d1414", "stroke-width": 2 }),
      hac: (x, y) => { cizgi(`M${x - 5.5},${y} L${x + 5.5},${y}`, 2.1); cizgi(`M${x},${y - 5.5} L${x},${y + 5.5}`, 2.1); },
      yildiz: (x, y) => [0, 60, 120].forEach((a) => { const r = (a * Math.PI) / 180; cizgi(`M${x - Math.cos(r) * 6},${y - Math.sin(r) * 6} L${x + Math.cos(r) * 6},${y + Math.sin(r) * 6}`, 2); }),
      ucgen: (x, y) => g("path", { d: `M${x},${y - 7} L${x + 7},${y + 5.5} L${x - 7},${y + 5.5} Z`, fill: "none", stroke: "#7d1414", "stroke-width": 2 }),
    };
    cizim.forEach((c) => {
      const p = HAYAT[c.yay || "normal"] || c.noktalar;
      if (c.tur === "yol") cizgi(c.d, c.w || 2, c.ek || {});
      else if (c.tur === "isaret") isaret[c.ad](...(c.xy || bez(p, c.t)));
      else if (c.tur === "kesik") (c.t || [0.4, 0.5, 0.6, 0.7]).forEach((t) => { const [x, y] = bez(p, t); const [nx, ny] = normal(p, t); cizgi(`M${x - nx * 7},${y - ny * 7} L${x + nx * 7},${y + ny * 7}`, 1.7); });
      else if (c.tur === "dal") { const [x, y] = bez(p, c.t); cizgi(`M${x},${y} Q${x + c.dx / 2 + 4},${y + c.dy / 2} ${x + c.dx},${y + c.dy}`, c.w || 1.6); }
      else if (c.tur === "sacak") { const [x, y] = bez(p, 1); [[-6, 6], [-1, 8], [4, 7], [8, 4]].forEach(([dx, dy]) => cizgi(`M${x},${y} L${x + dx},${y + dy}`, 1)); }
      else cizgi(parca(p, c.a ?? 0, c.b ?? 1, c.kayma || 0, c.dalga || 0), c.w || 2.2, c.ek || {});
    });
    numara.forEach(([n, x, y]) => {
      g("circle", { cx: x, cy: y, r: 5, fill: "#0b0d1c", stroke: "#f3c26b", "stroke-width": 0.8 });
      const t = g("text", { x, y: y + 2.4, "text-anchor": "middle", "font-size": 6.4, "font-weight": 700, fill: "#f3c26b", "font-family": "Manrope, sans-serif" });
      t.textContent = n;
    });
    return svg;
  }

  // --- İçerik (kendi sözlerimizle) ------------------------------------------------------------------------------
  const H = (ek = {}) => ({ cizim: [{ ...ek }] });
  const SAYFALAR = [
    {
      id: "harita", baslik: "Çizgilerin haritası", ikon: "🗺️",
      giris: "Avuçta on iki çizgi okunur. Hepsi herkeste belirgin değildir; ana üç çizgi (hayat, akıl, kalp) neredeyse herkeste vardır, diğerleri kişiden kişiye değişir.",
      buyuk: {
        cizim: [
          { tur: "yol", d: "M47,66 C62,86 64,124 50,150" },
          { tur: "yol", d: "M47,67 C64,78 84,88 103,100" },
          { tur: "yol", d: "M104,74 C90,70 72,67 54,59" },
          { tur: "yol", d: "M66,152 C67,120 68,90 70,60", w: 1.6 },
          { tur: "yol", d: "M88,128 C88,105 87,84 86,64", w: 1.4 },
          { tur: "yol", d: "M62,142 C78,124 92,104 103,84", w: 1.3 },
          { tur: "yol", d: "M104,126 C97,110 97,96 104,84", w: 1.2 },
          { tur: "yol", d: "M58,148 C76,138 92,128 105,116", w: 1.2 },
          { tur: "yol", d: "M98,66 L106,65 M98,70 L106,69.5", w: 1.1 },
          { tur: "yol", d: "M56,58 C66,66 80,66 90,58", w: 1.2 },
          { tur: "yol", d: "M38,156 L92,156 M40,160 L90,160", w: 1.2 },
          { tur: "yol", d: "M14,98 L24,100 M14,103 L24,105 M14,108 L24,110", w: 1 },
        ],
        numara: [[1, 44, 140], [2, 108, 100], [3, 110, 74], [4, 72, 140], [5, 92, 64], [6, 64, 134], [7, 99, 120], [8, 104, 110], [9, 112, 63], [10, 74, 55], [11, 100, 158], [12, 9, 104]],
      },
      liste: [
        ["1", "Hayat çizgisi", "Başparmağın dibindeki Venüs tepesini yay gibi çevreler; canlılık ve yaşam enerjisi."],
        ["2", "Akıl çizgisi", "Avucu enine geçer; düşünme biçimi, odak ve öğrenme tarzı."],
        ["3", "Kalp çizgisi", "Parmakların altında uzanır; duygular, sevme biçimi ve ilişkiler."],
        ["4", "Kader (Satürn) çizgisi", "Bilekten orta parmağa doğru yükselir; yaşam yolu ve sorumluluklar."],
        ["5", "Güneş çizgisi", "Yüzük parmağına uzanır; başarı, yaratıcılık ve görünür olma."],
        ["6", "Sıhhat (Merkür) çizgisi", "Serçe parmağa doğru çapraz uzanır; gündelik düzen ve özen."],
        ["7", "İlham çizgisi", "Avucun dış kenarında yay çizer; sezgi ve iç ses."],
        ["8", "Ay (Samanyolu) çizgisi", "Ay tepesinden çıkar; hayal gücü ve yolculuk isteği."],
        ["9", "Evlilik çizgileri", "Serçe parmağın altında, kenardaki kısa çizgiler; derin bağlar."],
        ["10", "Venüs halkası", "İşaret ve yüzük parmakları arasında yay; duyarlılık ve tutku."],
        ["11", "Halkalar (bilezik)", "Bileğin üstündeki enine çizgiler; denge ve dayanıklılık."],
        ["12", "Nesil çizgileri", "Başparmak kenarındaki kısa çizgiler; aile ve kuşak bağları."],
      ],
    },
    {
      id: "hayat", baslik: "Hayat çizgisi", ikon: "🌿",
      giris: "Başparmağın dibindeki Venüs tepesinin çevresinde yay çizen çizgidir; \"canlılık çizgisi\" de denir. Kişinin enerjisini, dayanıklılığını ve hayatındaki büyük dönüm noktalarını anlatır. Avuçtaki en önemli çizgi sayılır ve hemen herkeste bulunur.",
      buyuk: H({ yay: "normal", w: 2.8 }),
      not: "Hatırlatma: Kısa bir hayat çizgisi kısa bir ömür demek DEĞİLDİR. Ömür bir çizgiye bakılarak söylenemez; el falı yalnızca kişinin enerjisini ve eğilimlerini sembolik olarak yorumlar.",
    },
    {
      id: "uzunluk", baslik: "Uzunluk ve genişlik", ikon: "📏",
      giris: "Hayat çizgisinin ne kadar uzandığı ve Venüs tepesini ne kadar geniş bir yayla sardığı, kişinin enerjisinin büyüklüğü ve onu nasıl harcadığı hakkında ipucu verir.",
      ogeler: [
        ["Uzun", H({ yay: "uzun" }), "Dirençli, gürbüz ve canlı bir yapı. Bu kişiler ileri yaşlarında da dinç kalır; çoğu zaman sevimli, cömert ve yetenekli olurlar."],
        ["Uzun ve ince", H({ yay: "uzun", w: 1.1 }), "Uzun soluklu ama narin bir yapı; heyecanlı ve sinirli bir mizaç. Enerjisini korumayı öğrenirse uzun yol gider."],
        ["Kısa", H({ yay: "kisa" }), "Enerjinin dikkatle kullanılması gereken bir yapı. Geleneksel kaynaklar burada özene ve kendine iyi bakmaya vurgu yapar; derin ve kopuksuz kısa bir çizgi ise dolu dolu, hareketli bir hayatı anlatır."],
        ["Geniş yay", H({ yay: "genis" }), "Bedenini ve gücünü uzun süre koruyan, dinç insanlar. Taşkınlığa kapılıp kendini yıpratmamaları, öfkelerini dizginlemeleri gerekir."],
        ["Geniş ve derin", H({ yay: "genis", w: 3.2 }), "Büyük bir enerji, dayanıklılık ve güçlü yetenekler; sert ve baskın bir mizaç. Bu gücü başkalarını ezmeden kullanmak önemli."],
        ["Daralmış yay", H({ yay: "dar" }), "Venüs tepesinin alanını daraltan çizgi; duygularını dışa vurmakta zorlanan, kibar ama mesafeli bir yapı. Azla yetinmeyi bilir."],
      ],
    },
    {
      id: "doku", baslik: "Çizginin dokusu", ikon: "🧵",
      giris: "Çizginin derin mi silik mi, düz mü zincir gibi mi olduğu, enerjinin ne kadar düzenli aktığını gösterir.",
      ogeler: [
        ["İnce ve zayıf", H({ w: 1 }), "Enerjiyi boşa harcama eğilimi; sinirli ve nazik bir yapı. İçe dönük ve ihtiyatlıdır; düzenli beslenme ve dinlenme ona iyi gelir."],
        ["Düzensiz", { cizim: [{ a: 0, b: 0.3 }, { a: 0.28, b: 0.6, kayma: 2.2 }, { a: 0.58, b: 1, kayma: -1 }] }, "Canlılığı inişli çıkışlı, sık fikir değiştiren, ne zaman ne yapacağı belli olmayan bir mizaç."],
        ["Zincir", H({ w: 3, ek: { "stroke-dasharray": "3 2.2" } }), "Çok hassas, duyguları kolay etkilenen bir yapı. Hayatın akışında savrulmamak için güvenli bir düzen ve destek arar."],
        ["Dalgalı", H({ dalga: 1.8 }), "Sevgide ve zevklerde değişkenlik; bir istikrar tutturmakta zorlanma. Dengeyi kurmak için disiplin ister."],
        ["Belirsiz (dağınık)", H({ w: 1.4, ek: { "stroke-dasharray": "1.4 3" } }), "Kararsızlık, değişken bir mizaç ve dağınıklık. Kişi işlerinde düzen kurmaya çalışmalıdır."],
        ["Kopuk", { cizim: [{ a: 0, b: 0.45 }, { a: 0.55, b: 1 }] }, "Hayatta keskin bir dönüm noktası: beklenmedik bir değişim, zorlu bir dönem ya da yön değiştirme. İki elde birden görülürse etkisi daha güçlü sayılır."],
        ["Kopuk ama parçalar iç içe", { cizim: [{ a: 0, b: 0.52 }, { a: 0.44, b: 1, kayma: 3 }] }, "Kopukluğun etkisi hafifler: zor dönem az bir hasarla atlatılır. O dönemde temponu yavaşlatmak ve düzenli yaşamak iyi gelir."],
      ],
    },
    {
      id: "uclar", baslik: "Başlangıç ve bitiş", ikon: "🌱",
      giris: "Çizginin nasıl başladığı hayatın ilk yıllarını, nasıl bittiği ise olgunluk dönemini sembolik olarak anlatır.",
      ogeler: [
        ["Başlangıçta kopuk", { cizim: [{ a: 0, b: 0.1 }, { a: 0.18, b: 1 }] }, "Çocuklukta ya da ilk gençlikte zorlu bir dönem, içe kapanma eğilimi. Sonraki yıllar daha sakin akar."],
        ["Aniden biten", { cizim: [{ a: 0, b: 0.62 }] }, "Hayatın bir döneminde ani bir değişim ya da sıkıntı. Geleneksel kaynaklar burada özen ve tedbir öğütler."],
        ["Dışa yönelen", H({ yay: "disa" }), "Sonuna doğru incelip avucun ortasına yönelen çizgi; yabancı bir memlekete gitme, gurbette yerleşme isteği."],
        ["Çatallı biten", { cizim: [{}, { tur: "dal", t: 0.82, dx: 16, dy: 18 }] }, "Sürekli değişim isteyen, yerinde duramayan bir mizaç. Hayatın son döneminde farklı kaynaklardan gelir de anlatılır."],
        ["Küçük çatal", { cizim: [{}, { tur: "dal", t: 0.9, dx: 7, dy: 8, w: 1.2 }] }, "Çatal küçükse etkisi de hafiftir; geçici, ufak sıkıntılar."],
        ["İncelerek biten", { cizim: [{ a: 0, b: 0.7 }, { a: 0.7, b: 1, w: 0.9 }] }, "İleri yaşta enerjinin azalması; incelmenin başladığı dönemde kendine daha iyi bakma çağrısı."],
        ["Saçaklı biten", { cizim: [{}, { tur: "sacak" }] }, "Gençlikten itibaren sağlığını ve gücünü korumaya özen göstermesi gereken bir yapı. Kitabın da vurguladığı gibi, bu işaretler bir kader değil, tedbirle değiştirilebilecek bir uyarıdır."],
      ],
    },
    {
      id: "isaretler", baslik: "Çizgi üzerindeki işaretler", ikon: "✴️",
      giris: "Hayat çizgisinin üzerinde ya da yanında görülen küçük işaretler, o dönemde yaşanabilecek olayları sembolik olarak anlatır. Tek elde mi iki elde mi olduğu da önemlidir.",
      ogeler: [
        ["Ada", { cizim: [{}, { tur: "isaret", ad: "ada", t: 0.5 }] }, "Enerjinin düştüğü, dinlenmeye ve kendini toparlamaya ihtiyaç duyulan bir dönem."],
        ["Birbirini izleyen adalar", { cizim: [{}, { tur: "isaret", ad: "ada", t: 0.38 }, { tur: "isaret", ad: "ada", t: 0.52 }, { tur: "isaret", ad: "ada", t: 0.66 }] }, "Enerjinin doğru kullanılmadığı, uzun bir yorgunluk dönemi; beslenme ve düzene dikkat çağrısı."],
        ["Kare", { cizim: [{}, { tur: "isaret", ad: "kare", t: 0.55 }] }, "Koruma işareti: büyük bir sıkıntının ucuz atlatılacağını, kişinin bir koruyucu güçle sarıldığını anlatır."],
        ["Haç", { cizim: [{}, { tur: "isaret", ad: "hac", t: 0.6 }] }, "Sınanma ve zorlu bir dönem. Geleneksel kaynaklar burada tedbir ve özen öğütler; kesin bir hüküm değildir."],
        ["Haçla başlayan / biten", { cizim: [{}, { tur: "isaret", ad: "hac", t: 0.03 }, { tur: "isaret", ad: "hac", t: 0.98 }] }, "Haçla başlıyorsa zorlu bir başlangıç; sonu haçla bitiyorsa olgunluk yıllarının huzurlu ve mutlu geçeceği yorumlanır."],
        ["Yıldız", { cizim: [{}, { tur: "isaret", ad: "yildiz", t: 0.55 }] }, "Ani ve güçlü bir olay. Uzun bir hayat çizgisinin sonunda görülürse parlak ve müreffeh bir yaşamı, başında görülürse çarpıcı bir hayat hikâyesini anlatır."],
        ["Üçgen", { cizim: [{}, { tur: "isaret", ad: "ucgen", t: 0.6 }] }, "Hayat çizgisi üzerinde görülebilecek en iyi işaret: birden parlama, bir buluş, yeniden doğuş gibi güçlü bir enerji taşkınlığı."],
        ["Kesen küçük çizgiler", { cizim: [{}, { tur: "kesik" }] }, "Aralıklarla tekrar eden küçük sıkıntılar ve hayal kırıklıkları; aklını ve iradesini tam kullanmama işareti. Hayatı sekteye uğratacak güçte değildir."],
        ["Başlangıçtaki dikine çizgiler", { cizim: [{}, { tur: "kesik", t: [0.05, 0.11, 0.17] }] }, "Gençlikte dikkat dağınıklığı, ders çalışmakta zorlanma, kendini tembelliğe bırakma eğilimi."],
      ],
    },
    {
      id: "saturn", baslik: "Satürn tepesindeki işaretler", ikon: "🪐",
      giris: "Satürn tepesi orta parmağın hemen altındadır; sorumluluk, ciddiyet ve kader duygusuyla ilişkilendirilir. Burada görülen işaretler kişinin bu yanını güçlendirir ya da sınar.",
      ogeler: [
        ["Haç", { cizim: [{}, { tur: "isaret", ad: "hac", xy: [60, 64] }] }, "Satürn'ün etkisinin güçlü olduğunu gösterir; derin bir mistik eğilim. Zaman zaman kişiyi yoran bir dönemin de işareti sayılır."],
        ["Yıldız", { cizim: [{}, { tur: "isaret", ad: "yildiz", xy: [60, 64] }] }, "Geleneksel olarak olumlu sayılmaz: imkânlarını ve iradesini doğru kullanmazsa kişinin sıkıntılarla karşılaşabileceğine dair bir uyarıdır."],
        ["Kare", { cizim: [{}, { tur: "isaret", ad: "kare", xy: [60, 64] }] }, "Her şeyin bittiği sanılan anda beliren mucizevi yardımlar; kritik olaylarda koruyucu bir el."],
      ],
    },
    {
      id: "renk", baslik: "El rengi ve mizaç", ikon: "🎨",
      giris: "Geleneksel hekimlikteki dört mizaç (hılt) anlayışına göre avucun rengi kişinin mizacını yansıtır. Bu bir sağlık teşhisi değil, sembolik bir yorumdur.",
      ogeler: [
        ["Beyaz", { el: "#efe4dc", cizim: [{}] }, "Balgamî mizaç: sakin, ağırbaşlı, zaman zaman kayıtsız. Kuru ve ılımlı iklimler, hareket ve nefes çalışmaları ona iyi gelir."],
        ["Sarı", { el: "#e6c879", cizim: [{}] }, "Safravî mizaç: hızlı, hırslı ve çabuk parlayan. Ilıman iklim ve hafif beslenme dengeler."],
        ["Açık sarı", { el: "#f1e1a8", cizim: [{}] }, "Sinirli ve asabi bir yapı. Toprakla uğraşmak, doğada vakit geçirmek onu yatıştırır."],
        ["Kırmızı", { el: "#e8877a", cizim: [{}] }, "Demevî mizaç: aktif, kanlı canlı, enerjik ve iştahlı. Enerjisini sporla dengelemek ona iyi gelir."],
      ],
    },
    {
      id: "not", baslik: "Okurken hatırla", ikon: "🕯️",
      giris: "El falı, kendini tanımak ve ilham almak için keyifli bir rehberdir.",
      maddeler: [
        "Bir çizgiye bakıp ömür, ölüm ya da hastalık hükmü verilmez; kaynakların kendisi de çizgilerin bir kader değil, tedbirle değişebilecek eğilimler olduğunu vurgular.",
        "İki eli birlikte oku: baskın el bugünü ve emeğini, diğer el doğuştan getirdiklerini anlatır. Bir işaret iki elde birden varsa etkisi güçlü sayılır.",
        "Çizgileri gün ışığında, avucunu hafifçe bükerek incele; silik çizgileri zorla görmeye çalışma.",
        "Sağlık, hukuk ve para konusundaki kararlarını yalnızca el falına göre verme; alanında uzman kişilere danış.",
      ],
      kaynak: "Bu rehber, geleneksel el falı kaynaklarından (özellikle Mehmet Ali Bulut, \"Elfabe – El ve Yüz Çizgilerinin Anlamı\") yararlanılarak Ezoter.ist tarafından kendi sözlerimizle hazırlanmıştır; şemalar sembolik çizimlerdir.",
    },
  ];

  // --- Pencere ---------------------------------------------------------------------------------------------------
  const stil = el("style", { textContent: `
    .ecr { width: min(980px, calc(100vw - 16px)); height: min(760px, calc(100dvh - 16px)); padding: 0; border: 1px solid rgba(243,194,107,.4); border-radius: 24px; color: #f4efe6; background: #0b0d1c; box-shadow: 0 30px 90px rgba(0,0,0,.7); overflow: hidden; }
    .ecr::backdrop { background: rgba(4,5,14,.78); backdrop-filter: blur(5px); }
    .ecr-ic { display: grid; grid-template-columns: 230px 1fr; height: 100%; font-family: Manrope, system-ui, sans-serif; }
    .ecr-yan { display: flex; flex-direction: column; gap: 4px; padding: 18px 12px; border-right: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, #15112b, #0d0b1c); overflow-y: auto; }
    .ecr-yan h2 { margin: 0 6px 10px; color: #f3c26b; font: 700 1.35rem/1.1 "Cormorant Garamond", Georgia, serif; }
    .ecr-yan button { display: flex; gap: 8px; align-items: center; padding: 9px 10px; border: 0; border-radius: 12px; color: rgba(255,255,255,.82); background: none; font: 600 .86rem Manrope, sans-serif; text-align: left; cursor: pointer; }
    .ecr-yan button[aria-current="true"] { color: #1a1406; background: linear-gradient(180deg, #f5d38a, #d6a24b); font-weight: 800; }
    .ecr-govde { position: relative; display: flex; flex-direction: column; min-height: 0; }
    .ecr-sayfa { flex: 1; padding: 22px 26px; overflow-y: auto; overscroll-behavior: contain; }
    .ecr-sayfa h3 { margin: 0 0 6px; color: #f3c26b; font: 700 clamp(1.7rem, 4vw, 2.2rem)/1.1 "Cormorant Garamond", Georgia, serif; }
    .ecr-giris { margin: 0 0 16px; color: rgba(255,255,255,.82); line-height: 1.65; }
    .ecr-buyuk { display: grid; grid-template-columns: minmax(180px, 260px) 1fr; gap: 20px; align-items: start; }
    .ecr-buyuk svg, .ecr-kart svg { width: 100%; height: auto; filter: drop-shadow(0 8px 18px rgba(0,0,0,.45)); }
    .ecr-liste { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
    .ecr-liste li { display: grid; grid-template-columns: 24px 1fr; gap: 2px 10px; font-size: .86rem; line-height: 1.45; }
    .ecr-liste b { color: #f3c26b; }
    .ecr-liste span.n { grid-row: span 2; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid #f3c26b; border-radius: 50%; color: #f3c26b; font-size: .72rem; font-weight: 800; }
    .ecr-liste small { color: rgba(255,255,255,.7); }
    .ecr-kartlar { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; }
    .ecr-kart { display: grid; grid-template-columns: 112px 1fr; gap: 14px; align-items: start; padding: 12px; border: 1px solid rgba(243,194,107,.2); border-radius: 16px; background: rgba(255,255,255,.03); }
    .ecr-kart b { display: block; margin-bottom: 3px; color: #f3c26b; font-size: .95rem; }
    .ecr-kart p { margin: 0; color: rgba(255,255,255,.8); font-size: .82rem; line-height: 1.5; }
    .ecr-not { margin: 16px 0 0; padding: 12px 14px; border: 1px solid rgba(143,227,165,.45); border-radius: 14px; color: #c9f0d5; background: rgba(143,227,165,.07); font-size: .88rem; line-height: 1.55; }
    .ecr-maddeler { display: grid; gap: 10px; margin: 0; padding-left: 20px; line-height: 1.6; }
    .ecr-kaynak { margin-top: 18px; color: rgba(255,255,255,.55); font-size: .78rem; font-style: italic; }
    .ecr-alt { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 22px; border-top: 1px solid rgba(255,255,255,.08); background: rgba(0,0,0,.25); }
    .ecr-alt button { padding: 9px 16px; border: 1px solid #f3c26b; border-radius: 999px; color: #f3c26b; background: transparent; font: 800 .86rem Manrope, sans-serif; cursor: pointer; }
    .ecr-alt button:disabled { opacity: .3; cursor: default; }
    .ecr-alt span { color: rgba(255,255,255,.55); font-size: .8rem; }
    .ecr-kapat { position: absolute; top: 12px; right: 14px; z-index: 2; width: 36px; height: 36px; border: 1px solid rgba(255,255,255,.25); border-radius: 50%; color: #fff; background: rgba(0,0,0,.4); cursor: pointer; }
    @media (max-width: 720px) {
      .ecr-ic { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .ecr-yan { flex-direction: row; overflow-x: auto; padding: 10px; border-right: 0; border-bottom: 1px solid rgba(255,255,255,.08); }
      .ecr-yan h2 { display: none; }
      .ecr-yan button { flex: none; }
      .ecr-buyuk { grid-template-columns: 1fr; } .ecr-buyuk svg { max-width: 240px; margin: 0 auto; }
      .ecr-sayfa { padding: 16px; }
    }` });

  let pencere = null;
  function ac(baslangic = 0) {
    if (!document.head.contains(stil)) document.head.append(stil);
    pencere?.remove();
    pencere = el("dialog", { className: "ecr" });
    pencere.setAttribute("aria-label", "El çizgileri rehberi");
    const yan = el("nav", { className: "ecr-yan" }, el("h2", { textContent: "📖 El çizgileri rehberi" }));
    const sayfa = el("div", { className: "ecr-sayfa" });
    const geri = el("button", { type: "button", textContent: "← Önceki" });
    const ileri = el("button", { type: "button", textContent: "Sonraki →" });
    const sayac = el("span");
    let simdiki = 0;
    const git = (i) => {
      simdiki = Math.max(0, Math.min(SAYFALAR.length - 1, i));
      const s = SAYFALAR[simdiki];
      yan.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-current", String(j === simdiki)));
      const parcalar = [el("h3", { textContent: `${s.ikon} ${s.baslik}` }), el("p", { className: "ecr-giris", textContent: s.giris })];
      if (s.buyuk) {
        const sag = s.liste
          ? el("ul", { className: "ecr-liste" }, ...s.liste.map(([n, ad, m]) => el("li", {}, el("span", { className: "n", textContent: n }), el("b", { textContent: ad }), el("small", { textContent: m }))))
          : el("div", {}, ...(s.not ? [el("p", { className: "ecr-not", textContent: s.not })] : []));
        parcalar.push(el("div", { className: "ecr-buyuk" }, sema(s.buyuk), sag));
      }
      if (s.ogeler) parcalar.push(el("div", { className: "ecr-kartlar" }, ...s.ogeler.map(([ad, cfg, metin]) => el("div", { className: "ecr-kart" }, sema(cfg), el("div", {}, el("b", { textContent: ad }), el("p", { textContent: metin }))))));
      if (s.maddeler) parcalar.push(el("ul", { className: "ecr-maddeler" }, ...s.maddeler.map((m) => el("li", { textContent: m }))));
      if (s.kaynak) parcalar.push(el("p", { className: "ecr-kaynak", textContent: s.kaynak }));
      sayfa.replaceChildren(...parcalar);
      sayfa.scrollTop = 0;
      geri.disabled = simdiki === 0;
      ileri.disabled = simdiki === SAYFALAR.length - 1;
      sayac.textContent = `Sayfa ${simdiki + 1} / ${SAYFALAR.length}`;
    };
    SAYFALAR.forEach((s, i) => {
      const b = el("button", { type: "button", textContent: `${s.ikon} ${s.baslik}` });
      b.addEventListener("click", () => git(i));
      yan.append(b);
    });
    geri.addEventListener("click", () => git(simdiki - 1));
    ileri.addEventListener("click", () => git(simdiki + 1));
    const kapat = el("button", { type: "button", className: "ecr-kapat", textContent: "✕" });
    kapat.setAttribute("aria-label", "Kapat");
    kapat.addEventListener("click", () => pencere.close());
    pencere.addEventListener("click", (e) => { if (e.target === pencere) pencere.close(); });
    pencere.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") git(simdiki + 1);
      if (e.key === "ArrowLeft") git(simdiki - 1);
    });
    pencere.append(el("div", { className: "ecr-ic" }, yan, el("div", { className: "ecr-govde" }, kapat, sayfa, el("div", { className: "ecr-alt" }, geri, sayac, ileri))));
    document.body.append(pencere);
    git(baslangic);
    pencere.showModal();
  }

  window.elCizgiRehberi = (sayfaId) => ac(Math.max(0, SAYFALAR.findIndex((s) => s.id === sayfaId)));
})();
