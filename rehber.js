// Rehber (Murat 2026-10-07): bölümlerin kullandığı veri dosyalarından üretilen, herkese açık kalıcı bilgi sayfaları.
// Yorumlar ziyaretçiye özel üretilip saklanmadığı için sitenin okunabilir, aranabilir içeriği bunlardır (Google arama
// ve AdSense incelemesi). Sayfalar istek anında sunucuda HTML olarak çizilir; JavaScript gerekmez. Ayrıca
// /hakkimizda, /iletisim, /robots.txt ve /sitemap.xml buradan verilir.
const A = require("./astroloji-veri");
const T = require("./tarot-veri");
const R = require("./run-veri");
const M = require("./melek-sayilari-veri");
const C = require("./cakra-veri");
const K = require("./kristal-veri");
const I = require("./iching-veri");
const N = require("./numeroloji-veri");
const S = require("./sembol-veri");
const RY = require("./ruya-veri");
const F = require("./fal-veri");
const E = require("./el-fali-veri");
const AY = require("./ay-takvimi-veri");
const Y = require("./yuz-okuma-veri");
const EB = require("./ebced-veri");

const SITE = "https://ezoter.ist";
const GUNCELLEME = "2026-10-07";

const k = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ilkBuyuk = (s) => String(s).charAt(0).toLocaleUpperCase("tr-TR") + String(s).slice(1);
const slug = (s) => String(s).toLocaleLowerCase("tr-TR").replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c])
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const liste = (dizi) => `<ul>${dizi.map((x) => `<li>${k(x)}</li>`).join("")}</ul>`;
const etiketler = (dizi) => `<p class="rh-etiketler">${dizi.map((x) => `<span>${k(x)}</span>`).join("")}</p>`;
const bolum = (baslik, icerik) => (icerik ? `<section class="rh-bolum"><h2>${k(baslik)}</h2>${icerik}</section>` : "");
const p = (metin) => (metin ? `<p>${k(metin)}</p>` : "");
const bilgiler = (satirlar) => `<dl class="rh-bilgi">${satirlar.filter((s) => s[1]).map(([a, b]) => `<div><dt>${k(a)}</dt><dd>${b}</dd></div>`).join("")}</dl>`;
const kart = (href, baslik, alt, resim) => `<a class="rh-kart" href="${href}">${resim ? `<img src="${resim}" alt="" loading="lazy" decoding="async" width="160" height="160" />` : ""}<b>${k(baslik)}</b>${alt ? `<small>${k(alt)}</small>` : ""}</a>`;
const izgara = (kartlar) => `<div class="rh-izgara">${kartlar.join("")}</div>`;
const eylem = (href, metin) => `<p class="rh-eylem"><a class="btn btn-primary" href="${href}">${k(metin)}</a></p>`;

// --- Konu tanımları: her biri bir ana sayfa ve (varsa) tek tek öğe sayfaları üretir ---

const BURC_ID = Object.keys(A.burclar);
const burcAdi = (id) => A.burclar[id]?.ad || id;
const CAKRA = Object.fromEntries(C.cakralar.map((c) => [c.id, c]));
const KRISTAL = Object.fromEntries(K.kristaller.map((x) => [x.id, x]));
const TAKIM = Object.fromEntries(T.takimlar.map((t) => [t.id, t]));
const AETT = R.aettler;

// Küçük Arkana rütbelerinin geleneksel anlamları (kart sayfalarına bağlam olarak eklenir).
const RUTBE = {
  as: ["As", "Takımın enerjisinin en saf, en yeni hâli: bir tohum, bir fırsat, bir başlangıç."],
  2: ["İkili", "Denge, seçim ve karşılaşma; iki gücün birbirini tanıması."],
  3: ["Üçlü", "İlk büyüme ve ifade; bir şeyin somut olarak şekillenmeye başlaması."],
  4: ["Dörtlü", "İstikrar, yapı ve dinlenme; kazanılanı koruma isteği."],
  5: ["Beşli", "Sarsıntı, çatışma ya da kayıp; dengenin bozulup yeniden kurulmaya zorlanması."],
  6: ["Altılı", "Uyum, paylaşım ve iyileşme; zorluktan sonra gelen nefes."],
  7: ["Yedili", "Sınanma, iç gözlem ve strateji; yolun ortasındaki değerlendirme."],
  8: ["Sekizli", "Hareket, emek ve ustalaşma; enerjinin yön bulması."],
  9: ["Dokuzlu", "Doruğa yaklaşma; neredeyse tamamlanmış bir sürecin son sınavı."],
  10: ["Onlu", "Döngünün tamamlanması; sonuç, yük ya da bolluk hâlinde."],
  prens: ["Prens", "Takımın enerjisini öğrenen genç ruh: merak, haber ve ilk adımlar."],
  sovalye: ["Şövalye", "Takımın enerjisini harekete geçiren arayıcı: tutku, görev ve yolculuk."],
  kralice: ["Kraliçe", "Takımın enerjisini içselleştiren olgun güç: sezgi, şefkat ve ustalık."],
  kral: ["Kral", "Takımın enerjisini yöneten otorite: deneyim, sorumluluk ve liderlik."],
};

const tarotKartAlt = (x) => (x.arkana === "buyuk" ? `Büyük Arkana · ${x.numara}` : `${TAKIM[x.takim]?.cogul || ""} · ${RUTBE[x.rutbe]?.[0] || x.rutbe}`);

function runSekli(r) {
  const yollar = (r.sekil || []).map((cizgi) => `<polyline points="${cizgi.map((n) => n.join(",")).join(" ")}" />`).join("");
  return `<svg class="rh-run" viewBox="0 0 40 60" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${yollar}</svg>`;
}

function heksagramSekli(cizgiler) {
  // Çizgiler aşağıdan yukarı okunur: ilk çizgi en altta.
  const satir = (dolu, i) => {
    const y = 100 - (i + 1) * 15;
    return dolu ? `<rect x="10" y="${y}" width="100" height="9" rx="2" />` : `<rect x="10" y="${y}" width="44" height="9" rx="2" /><rect x="66" y="${y}" width="44" height="9" rx="2" />`;
  };
  return `<svg class="rh-heks" viewBox="0 0 120 100" aria-hidden="true" fill="currentColor">${cizgiler.map(satir).join("")}</svg>`;
}

const KONULAR = [
  {
    yol: "burclar", ad: "Burçlar", arac: "/astroloji", aracAd: "Günlük burç yorumunu oku",
    aciklama: "12 burcun tarihleri, elementi, yönetici gezegeni, güçlü ve gölge yanları, aşk ve kariyer eğilimleri.",
    giris: [
      "Zodyak, Güneş'in bir yıl boyunca gökyüzünde izlediği yolun on iki eşit parçaya bölünmesiyle oluşur. Doğduğun gün Güneş'in bulunduğu bölüm senin Güneş burcundur; halk arasında “burcum” denince kastedilen budur.",
      "Her burç bir element (ateş, toprak, hava, su) ve bir nitelik (öncü, sabit, değişken) taşır. Bu ikisinin birleşimi burcun temel karakterini verir. Tam bir doğum haritasında Ay burcu, yükselen burç ve gezegenlerin konumları da bu tabloyu zenginleştirir.",
    ],
    ek: () => bolum("Elementler", Object.values(A.elementler).map((e) => `<h3>${k(e.ikon)} ${k(e.ad)}</h3><p>${k(e.aciklama)} <em>${e.burclar.map(burcAdi).join(", ")}</em></p>`).join(""))
      + bolum("Nitelikler", Object.entries(A.nitelikler).map(([ad, metin]) => `<h3>${k(ad)}</h3>${p(metin)}`).join(""))
      + bolum("Gezegenler", `<ul>${Object.values(A.gezegenler).map((g) => `<li><b>${k(g.sembol)} ${k(g.ad)}:</b> ${k(g.anlam)}</li>`).join("")}</ul>`),
    ogeler: () => BURC_ID.map((id) => ({ id, ...A.burclar[id] })),
    kartAlt: (b) => b.tarih,
    resim: (b) => `/astroloji/${b.id}.webp`,
    baslik: (b) => `${b.ad} Burcu`,
    ozet: (b) => `${b.ad} burcu (${b.tarih}): ${b.anahtar.join(", ")}. Element, gezegen, güçlü yanlar, aşk ve kariyer.`,
    govde: (b) => {
      const kristaller = K.kristaller.filter((x) => x.burclar.includes(b.id));
      return bilgiler([
        ["Tarih", k(b.tarih)], ["Sembol", k(b.sembol)], ["Element", k(A.elementler[b.element]?.ad)], ["Nitelik", k(b.nitelik)],
        ["Yönetici gezegen", k(b.gezegen)], ["Taşı", k(b.tas)], ["Rengi", k(b.renk)], ["Günü", k(b.gun)],
      ]) + etiketler(b.anahtar)
        + p(b.ozet)
        + bolum("Güçlü yanları", liste(b.guclu))
        + bolum("Gölge yanları", liste(b.golge))
        + bolum("Aşkta", p(b.ask))
        + bolum("Kariyerde", p(b.kariyer))
        + bolum("Mitolojide", p(b.mitoloji))
        + bolum(`Ay ${b.ad} burcundaysa`, p(A.ayBurcunda?.[b.id]))
        + bolum(`Yükselen ${b.ad}`, p(A.yukselenBurcunda?.[b.id]))
        + bolum("En uyumlu burçlar", izgara(b.uyum.map((u) => kart(`/rehber/burclar/${u}`, burcAdi(u), A.burclar[u]?.tarih, `/astroloji/${u}.webp`))))
        + (kristaller.length ? bolum(`${b.ad} için kristaller`, izgara(kristaller.map((x) => kart(`/rehber/kristaller/${x.id}`, x.ad, x.renk, `/kristal/${x.id}.webp`)))) : "");
    },
  },
  {
    yol: "tarot", ad: "Tarot Kartları", arac: "/tarot", aracAd: "Tarot açılımı yap",
    aciklama: "78 tarot kartının anlamı: 22 Büyük Arkana ve 56 Küçük Arkana kartının düz ve ters anlamları.",
    giris: [
      "Tarot destesi 78 karttan oluşur. 22 kartlık Büyük Arkana, Deli'den Dünya'ya uzanan bir ruhsal yolculuğu anlatır; hayatın büyük temalarını ve dönüm noktalarını simgeler. 56 kartlık Küçük Arkana ise dört takıma ayrılır ve gündelik olayları, duyguları ve kararları anlatır.",
      "Bir kart açılımda düz ya da ters gelebilir. Ters kart, kartın enerjisinin tıkandığını, içe döndüğünü ya da aşırıya kaçtığını gösterir. Kartlar tek başına değil, açılımdaki konumları ve birbirleriyle ilişkileri içinde yorumlanır.",
    ],
    ek: () => bolum("Dört takım", T.takimlar.map((t) => `<h3>${k(t.cogul)}</h3><p>Element: ${k(t.element)}. Tema: ${k(t.tema)}.</p>`).join(""))
      + bolum("Açılımlar", `<ul>${Object.values(T.acilimlar || {}).map((a) => `<li><b>${k(a.ad || "")}</b>${a.aciklama ? `: ${k(a.aciklama)}` : ""}${Array.isArray(a.pozisyonlar) ? ` (${a.pozisyonlar.length} kart)` : ""}</li>`).join("")}</ul>`),
    gruplar: () => [
      ["Büyük Arkana", T.kartlar.filter((x) => x.arkana === "buyuk")],
      ...T.takimlar.map((t) => [t.cogul, T.kartlar.filter((x) => x.takim === t.id)]),
    ],
    ogeler: () => T.kartlar,
    kartAlt: tarotKartAlt,
    resim: (x) => `/tarot/kart/${x.id}.webp`,
    resimOran: "tarot",
    baslik: (x) => `${x.ad} Tarot Kartı`,
    ozet: (x) => `${x.ad} tarot kartının anlamı (${x.anahtar}): düz ve ters anlamı, ${x.arkana === "buyuk" ? "Büyük Arkana'daki yeri" : "takımı ve rütbesi"}.`,
    govde: (x) => {
      const t = TAKIM[x.takim];
      const r = RUTBE[x.rutbe];
      return bilgiler([
        ["Arkana", x.arkana === "buyuk" ? "Büyük Arkana" : "Küçük Arkana"],
        ["Numara", x.arkana === "buyuk" ? k(x.numara) : ""],
        ["Takım", t ? `${k(t.cogul)} (${k(t.element)})` : ""],
        ["Rütbe", r ? k(r[0]) : ""],
        ["Anahtar kelimeler", k(x.anahtar)],
      ])
        + bolum("Düz anlamı", p(x.duz))
        + bolum("Ters anlamı", p(x.ters))
        + (t ? bolum(`${t.cogul} takımı`, p(`${t.cogul} ${t.element.toLocaleLowerCase("tr-TR")} elementini taşır; ${t.tema} ile ilgilidir. Bu takımdan gelen kartlar konuyu bu alana bağlar.`)) : "")
        + (r ? bolum(`${r[0]} kartları`, p(r[1])) : "")
        + (x.arkana === "buyuk" ? bolum("Büyük Arkana'da", p(`Büyük Arkana'nın ${x.numara}. kartıdır. Büyük Arkana kartları bir açılımda çıktığında, konunun gündelik bir mesele olmaktan öte, hayatında daha büyük bir dersin ya da dönüm noktasının parçası olduğunu düşündürür.`)) : "");
    },
  },
  {
    yol: "runler", ad: "Rün Taşları", arac: "/run-taslari", aracAd: "Rün çek",
    aciklama: "Yaşlı Futhark'ın 24 rününün anlamı, sesi, düz ve ters yorumu; üç aett.",
    giris: [
      "Rünler, Germen halklarının yaklaşık MS 2. yüzyıldan itibaren kullandığı alfabenin harfleridir. En eski biçimi, ilk altı harfinden adını alan Yaşlı Futhark'tır ve 24 ründen oluşur. Her rün hem bir ses hem de bir kavram taşır: Fehu sığır ve servet, Uruz yaban öküzü ve güç gibi.",
      "Rünler üç gruba, “aett”lere ayrılır. Rün çekiminde taşlar bir kesenin içinden seçilir; simetrik olmayan rünler ters gelebilir ve o zaman anlamları tıkanma ya da gecikme yönüne döner. Simetrik rünlerin ters hâli yoktur.",
    ],
    ek: () => bolum("Üç aett", Object.values(AETT).map((a) => `<h3>${k(a.ad)}</h3>${p(a.aciklama)}`).join("")),
    gruplar: () => Object.entries(AETT).map(([id, a]) => [a.ad, R.runler.filter((r) => r.aett === id)]),
    ogeler: () => R.runler,
    kartAlt: (r) => r.anlam,
    kartSekil: runSekli,
    baslik: (r) => `${r.ad} Rünü`,
    ozet: (r) => `${r.ad} rününün anlamı (${r.anlam}): ${r.anahtar.join(", ")}. Düz ve ters yorumu, sesi ve aett'i.`,
    govde: (r) => `<div class="rh-sekil">${runSekli(r)}</div>`
      + bilgiler([["Anlamı", k(r.anlam)], ["Sesi", k(r.ses)], ["Aett", k(AETT[r.aett]?.ad)], ["Ters gelebilir mi", r.tersOlur ? "Evet" : "Hayır, simetrik bir rün"]])
      + etiketler(r.anahtar)
      + bolum("Düz anlamı", p(r.duz))
      + (r.tersOlur ? bolum("Ters anlamı", p(r.tersAnlam)) : bolum("Ters anlamı", p(`${r.ad} simetrik bir şekle sahip olduğu için ters gelmez; anlamı her zaman düz okunur.`)))
      + bolum(AETT[r.aett]?.ad, p(AETT[r.aett]?.aciklama)),
  },
  {
    yol: "melek-sayilari", ad: "Melek Sayıları", arac: "/melek-sayilari", aracAd: "Kişisel melek sayını hesapla",
    aciklama: "111, 222, 333, 444, 1111 ve diğer tekrar eden sayıların anlamı; aşk, iş ve ruhsal mesajları.",
    giris: [
      "Melek sayıları, saatte, plakada ya da fişte tekrar tekrar karşına çıkan sayı dizileridir (11:11, 222, 444 gibi). Bu inanışa göre tekrar eden bir sayı, o an düşündüğün konuya dair bir hatırlatma ya da işarettir.",
      "Bir dizinin anlamı, içindeki rakamların enerjisinden gelir; rakam tekrarlandıkça etkisi güçlenir. Aşağıda önce rakamların temel anlamlarını, sonra en çok merak edilen dizileri bulabilirsin.",
    ],
    ek: () => bolum("Rakamların anlamı", `<div class="rh-rakamlar">${Object.entries(M.rakamlar).map(([r, x]) => `<div><img src="/melek/r${k(r)}.webp" alt="" loading="lazy" width="64" height="64" /><b>${k(r)} · ${k(x.ad)}</b><p>${k(x.anlam)}</p></div>`).join("")}</div>`),
    ogeler: () => M.sayilar.map((x) => ({ id: x.sayi, ...x })),
    kartAlt: (x) => x.baslik,
    kartMetin: (x) => x.sayi,
    baslik: (x) => `${x.sayi} Melek Sayısı`,
    ozet: (x) => `${x.sayi} melek sayısının anlamı: ${x.baslik}. Aşk, iş ve ruhsal mesajı, olumlaması.`,
    govde: (x) => {
      const rakamlar = [...new Set(String(x.sayi).split(""))];
      return `<p class="rh-buyuk-sayi">${k(x.sayi)}</p><p class="rh-alt-baslik">${k(x.baslik)}</p>`
        + p(x.mesaj)
        + bolum("Aşkta", p(x.ask))
        + bolum("İş ve para", p(x.is))
        + bolum("Ruhsal mesaj", p(x.ruhsal))
        + bolum("Olumlama", `<blockquote>${k(x.olumlama)}</blockquote>`)
        + bolum("İçindeki rakamlar", `<ul>${rakamlar.map((r) => `<li><b>${k(r)} · ${k(M.rakamlar[r]?.ad)}:</b> ${k(M.rakamlar[r]?.anlam)}</li>`).join("")}</ul>`);
    },
  },
  {
    yol: "cakralar", ad: "Çakralar", arac: "/cakralar", aracAd: "Çakra denge testini yap",
    aciklama: "Yedi ana çakranın yeri, rengi, elementi, mantrası; dengede ve dengesizken belirtileri, uygulamalar.",
    giris: [
      "Çakra, Sanskritçe “tekerlek” demektir. Hint kökenli yoga ve meditasyon geleneklerinde, omurga boyunca dizilen yedi ana enerji merkezini anlatır. Her çakra bir renk, bir element ve bir yaşam temasıyla ilişkilendirilir.",
      "Bu gelenekte bir çakranın dengede olması o alandaki rahatlığı, dengesiz olması ise tıkanıklığı ya da aşırılığı simgeler. Çakra çalışması bir farkındalık ve rahatlama pratiğidir; tıbbi bir teşhis ya da tedavi yerine geçmez.",
    ],
    ogeler: () => C.cakralar,
    kartAlt: (c) => c.sanskrit,
    kartRenk: (c) => c.renk,
    baslik: (c) => c.ad,
    ozet: (c) => `${c.ad} (${c.sanskrit}): ${c.konum.toLocaleLowerCase("tr-TR")}; ${c.element} elementi, ${c.mantra} mantrası. Dengede ve dengesizken belirtileri.`,
    govde: (c) => `<p class="rh-renk" style="--renk:${k(c.renk)}"></p>`
      + bilgiler([["Sanskrit adı", k(c.sanskrit)], ["Konumu", k(c.konum)], ["Element", k(c.element)], ["Mantra", k(c.mantra)]])
      + bolum("Teması", p(c.tema))
      + bolum("Dengedeyken", p(c.dengede))
      + bolum("Dengesizken", p(c.dengesiz))
      + bolum("Uygulama", p(c.uygulama))
      + bolum("Meditasyon", p(c.meditasyon))
      + bolum("Olumlama", `<blockquote>${k(c.olumlama)}</blockquote>`)
      + bolum("Bu çakrayla ilişkilendirilen kristaller", izgara((c.kristaller || []).filter((id) => KRISTAL[id]).map((id) => kart(`/rehber/kristaller/${id}`, KRISTAL[id].ad, KRISTAL[id].renk, `/kristal/${id}.webp`)))),
  },
  {
    yol: "kristaller", ad: "Kristaller", arac: "/kristaller", aracAd: "Sana uygun kristali bul",
    aciklama: "24 kristalin anlamı, rengi, ilişkili çakra ve burçları, kullanımı ve temizlenmesi.",
    giris: [
      "Kristaller ve doğal taşlar, pek çok kültürde koruyucu, sakinleştirici ya da güç veren nesneler olarak taşınmıştır. Her taşın rengi, dokusu ve geleneksel çağrışımları ona bir “anlam” kazandırır.",
      "Bu sayfadaki bilgiler halk inanışlarını ve modern kristal geleneğini özetler. Taşların iyileştirici etkisi bilimsel olarak kanıtlanmamıştır; onları bir niyeti hatırlatan, odaklanmaya yardım eden semboller olarak düşünmek en doğrusudur.",
    ],
    ek: () => bolum("Kristaller nasıl temizlenir", liste(K.temizleme)),
    ogeler: () => K.kristaller,
    kartAlt: (x) => x.renk,
    resim: (x) => `/kristal/${x.id}.webp`,
    baslik: (x) => `${x.ad} Taşı`,
    ozet: (x) => `${x.ad} taşının anlamı: ${x.anahtar.join(", ")}. Rengi, çakraları, burçları ve kullanımı.`,
    govde: (x) => bilgiler([
      ["Renk", k(x.renk)],
      ["Çakralar", x.cakralar.map((id) => `<a href="/rehber/cakralar/${id}">${k(CAKRA[id]?.ad || id)}</a>`).join(", ")],
      ["Burçlar", x.burclar.map((id) => `<a href="/rehber/burclar/${id}">${k(burcAdi(id))}</a>`).join(", ")],
      ["Niyet", x.niyet.map((n) => k(K.niyetler[n] || n)).join(", ")],
    ]) + etiketler(x.anahtar)
      + bolum("Anlamı", p(x.anlam))
      + bolum("Nasıl kullanılır", p(x.kullanim))
      + bolum("Temizleme", liste(K.temizleme)),
  },
  {
    yol: "iching", ad: "I Ching Heksagramları", arac: "/iching", aracAd: "I Ching'e soru sor",
    aciklama: "I Ching'in 64 heksagramı: adları, Çince adları, karar ve tavsiyeleri; sekiz trigram.",
    giris: [
      "I Ching (Değişimler Kitabı), üç bin yıllık bir Çin bilgelik metnidir. Bütün değişimleri, düz (yang) ve kesik (yin) çizgilerden oluşan 64 altı çizgili şekille, heksagramlarla anlatır.",
      "Her heksagram iki trigramdan oluşur: alttaki üç çizgi iç durumu, üstteki üç çizgi dış koşulları gösterir. Geleneksel yöntemde üç para altı kez atılır; her atış bir çizgiyi verir ve heksagram aşağıdan yukarı kurulur.",
    ],
    ek: () => bolum("Sekiz trigram", `<ul>${Object.values(I.trigramlar).map((t) => `<li><b>${k(t.sembol)} ${k(t.ad)} (${k(t.cince)}):</b> ${k(t.doga)}; ailede ${k(t.aile)}.</li>`).join("")}</ul>`),
    ogeler: () => Object.entries(I.heksagramlar).map(([no, h]) => ({ id: no, no: Number(no), ...h })),
    kartAlt: (h) => h.cince,
    kartMetin: (h) => h.no,
    baslik: (h) => `${h.no}. Heksagram: ${h.ad}`,
    ozet: (h) => `I Ching ${h.no}. heksagram ${h.ad} (${h.cince}): ${h.anahtar.join(", ")}. Karar, tavsiye ve trigramları.`,
    govde: (h) => {
      const cizgiler = I.cizgileri(h.no);
      const yapi = cizgiler ? I.heksagram(cizgiler) : null;
      const alt = yapi && I.trigramlar[yapi.alt];
      const ust = yapi && I.trigramlar[yapi.ust];
      return (cizgiler ? `<div class="rh-sekil">${heksagramSekli(cizgiler)}</div>` : "")
        + bilgiler([["Numara", k(h.no)], ["Çince adı", k(h.cince)], ["Alt trigram", alt ? `${k(alt.sembol)} ${k(alt.ad)} (${k(alt.doga)})` : ""], ["Üst trigram", ust ? `${k(ust.sembol)} ${k(ust.ad)} (${k(ust.doga)})` : ""]])
        + etiketler(h.anahtar)
        + bolum("Karar", p(h.karar))
        + bolum("Tavsiye", p(h.tavsiye))
        + (alt && ust ? bolum("Yapısı", p(`Bu heksagramda ${alt.ad.toLocaleLowerCase("tr-TR")} (${alt.doga}) altta, ${ust.ad.toLocaleLowerCase("tr-TR")} (${ust.doga}) üsttedir. Alttaki trigram durumun içini ve başlangıcını, üstteki dışını ve gidişini anlatır.`)) : "");
    },
  },
  {
    yol: "numeroloji", ad: "Numeroloji Sayıları", arac: "/numeroloji", aracAd: "Numeroloji haritanı çıkar",
    aciklama: "1'den 9'a ve 11, 22, 33 üstat sayılarının anlamı; yaşam yolu, kader ve ruh güdüsü hesapları.",
    giris: [
      "Numeroloji, sayıların insan karakteri ve hayat döngüleriyle sembolik bağı olduğu fikrine dayanır. Bugün en yaygın kullanılan Pisagor sisteminde doğum tarihinin ve adın harflerinin sayısal değeri toplanıp tek basamağa indirilir.",
      "11, 22 ve 33 “üstat sayılar” olarak ayrıca değerlendirilir ve genellikle indirgenmez. Aşağıda her sayının temel anlamını ve numerolojide en çok kullanılan hesapları bulabilirsin.",
    ],
    ek: () => bolum("Temel hesaplar", `<ul>${Object.values(N.pozisyonlar).map((x) => `<li><b>${k(x.ad)}:</b> ${k(x.aciklama)}</li>`).join("")}</ul>`)
      + bolum("Kavramlar", N.kavramlar.map(([a, b]) => `<h3>${k(a)}</h3>${p(b)}`).join(""))
      + bolum("Karmik borç sayıları", liste(Object.values(N.karmikBorclar)))
      + bolum("Eksik sayılar", liste(Object.values(N.eksikSayilar))),
    ogeler: () => Object.entries(N.sayilar).map(([no, x]) => ({ id: no, no, ...x })),
    kartAlt: (x) => x.ad,
    kartMetin: (x) => x.no,
    baslik: (x) => `Numerolojide ${x.no} Sayısı`,
    ozet: (x) => `Numerolojide ${x.no} sayısı (${x.ad}): ${x.anahtar.join(", ")}. Güçlü ve gölge yanları, aşk ve kariyer.`,
    govde: (x) => `<p class="rh-buyuk-sayi">${k(x.no)}</p><p class="rh-alt-baslik">${k(x.ad)}${["11", "22", "33"].includes(x.no) ? " · üstat sayı" : ""}</p>`
      + etiketler(x.anahtar)
      + p(x.ozet)
      + bolum("Güçlü yanları", liste(x.guclu))
      + bolum("Gölge yanları", liste(x.golge))
      + bolum("Aşkta", p(x.ask))
      + bolum("Kariyerde", p(x.kariyer))
      + bolum("Bu sayı nerede çıkar", p(`${x.no}, yaşam yolu, kader (ifade), ruh güdüsü ya da kişisel yıl sayın olarak çıkabilir. Hangi hesapta çıktığı, bu enerjinin hayatının hangi alanında öne çıktığını gösterir.`)),
  },
  {
    yol: "semboller", ad: "Ezoterik Semboller", arac: "/semboller", aracAd: "Semboller bölümüne git",
    aciklama: "Nazar boncuğu, hamsa, ankh, hayat çiçeği ve 32 ezoterik sembolün kökeni, anlamı ve kullanımı.",
    giris: [
      "Semboller, insanlığın en eski dilidir. Nazar boncuğundan hayat çiçeğine kadar pek çok işaret, farklı kültürlerde koruma, bereket, sonsuzluk ya da uyanış gibi fikirleri tek bir şekle sığdırmıştır.",
      "Aşağıdaki sembollerin kökenleri ve geleneksel anlamları, kültürel tarih ve halk inanışları üzerinden özetlenmiştir.",
    ],
    gruplar: () => Object.entries(S.kategoriler).map(([id, ad]) => [ad, S.semboller.filter((x) => x.kategori === id)]),
    ogeler: () => S.semboller,
    kartAlt: (x) => S.kategoriler[x.kategori],
    resim: (x) => `/sembol/${x.id}.webp`,
    baslik: (x) => `${x.ad} Sembolü`,
    ozet: (x) => `${x.ad} sembolünün anlamı ve kökeni: ${x.anahtar.join(", ")}.`,
    govde: (x) => bilgiler([["Kategori", k(S.kategoriler[x.kategori])], ["Kökeni", k(x.koken)]])
      + etiketler(x.anahtar)
      + bolum("Anlamı", p(x.anlam))
      + bolum("Nasıl kullanılır", p(x.kullanim)),
  },
];

// Tek sayfalık konular (öğe sayfası yok).
const TEK_SAYFALAR = [
  {
    yol: "ruya-sembolleri", ad: "Rüya Sembolleri", arac: "/ruya", aracAd: "Rüyanı yorumlat",
    aciklama: "Su, yılan, diş, uçmak ve 48 rüya sembolünün geleneksel ve psikolojik yorumu.",
    giris: [
      "Rüya yorumu, hem Doğu'nun geleneksel tabir kitaplarında hem de modern psikolojide köklü bir yere sahiptir. Geleneksel yorum sembolü bereket, haber ya da uyarı olarak okur; psikolojik yorum ise sembolü rüyayı görenin duygularının ve iç dünyasının bir yansıması olarak ele alır.",
      "Aynı sembol, rüyadaki duyguya ve bağlama göre farklı anlamlar taşıyabilir. Bu yüzden aşağıdaki açıklamaları kesin hükümler olarak değil, kendi rüyanı düşünmek için başlangıç noktaları olarak kullan.",
    ],
    govde: () => `<nav class="rh-harfler">${RY.semboller.map((x) => `<a href="#${slug(x.ad)}">${k(x.ad)}</a>`).join("")}</nav>`
      + RY.semboller.map((x) => `<section class="rh-bolum" id="${slug(x.ad)}"><h2>Rüyada ${k(x.ad.toLocaleLowerCase("tr-TR"))} görmek</h2><h3>Geleneksel yorum</h3>${p(x.geleneksel)}<h3>Psikolojik yorum</h3>${p(x.psikolojik)}</section>`).join(""),
  },
  {
    yol: "kahve-fali-sembolleri", ad: "Kahve Falı Sembolleri", arac: "/kahve-fali", aracAd: "Kahve falına baktır",
    aciklama: "Kahve falında kuş, yol, göz, kalp ve 40 sembolün anlamı; fincanın hangi bölümünün neyi anlattığı.",
    giris: [
      "Türk kahvesi falı, fincanın ters çevrilip soğumasından sonra telveyle oluşan şekillerin yorumlanmasıdır. Osmanlı'dan bu yana sohbetin ve paylaşmanın bir parçası olan bu gelenek, UNESCO'nun Somut Olmayan Kültürel Miras listesindeki Türk kahvesi kültürünün de bir uzantısıdır.",
      "Bir şeklin anlamı, fincandaki yerine göre değişir. Aşağıda önce fincanın bölümlerini, sonra en sık görülen sembolleri bulabilirsin.",
    ],
    govde: () => bolum("Fincanın bölümleri", F.kurallar.map(([a, b]) => `<h3>${k(a)}</h3>${p(b)}`).join(""))
      + bolum("Semboller", `<dl class="rh-sozluk">${F.semboller.map((x) => `<div id="${slug(x.ad)}"><dt>${k(x.ad)}</dt><dd>${k(x.anlam)}</dd></div>`).join("")}</dl>`),
  },
  {
    yol: "el-fali", ad: "El Falı Rehberi", arac: "/el-fali", aracAd: "El falına baktır",
    aciklama: "El falında el tipleri, hayat, kalp, akıl ve kader çizgileri, avuç içi tepeleri.",
    giris: [
      "El falı (kiromansi), avuç içindeki çizgilerin, tepelerin ve elin biçiminin karakter ve eğilimlerle ilişkilendirildiği eski bir gelenektir. Hint, Çin ve Yunan kültürlerinde ayrı ayrı gelişmiş, Avrupa'da Orta Çağ'dan itibaren yaygınlaşmıştır.",
      "Çizgilerin uzunluğu ömrü ya da kaderi belirlemez; gelenekte çizgiler daha çok enerjiyi, eğilimleri ve hayattaki değişimleri anlatır. El falı bir eğlence ve kendini düşünme aracıdır.",
    ],
    govde: () => bolum("El tipleri", E.elTipleri.map(([ad, ikon, sekil, anlam]) => `<h3>${k(ikon)} ${k(ad)}</h3><p><em>${k(sekil)}</em>. ${k(anlam)}</p>`).join(""))
      + bolum("Ana çizgiler", E.cizgiler.map(([ad, yer, anlam]) => `<h3>${k(ad)}</h3><p><em>${k(yer)}</em> ${k(anlam)}</p>`).join(""))
      + bolum("Tepeler", `<ul>${E.tepeler.map(([ad, yer, anlam]) => `<li><b>${k(ad)}</b> (${k(yer.toLocaleLowerCase("tr-TR"))}): ${k(anlam)}</li>`).join("")}</ul>`)
      + bolum("İpuçları", liste(E.ipuclari)),
  },
  {
    yol: "ay-evreleri", ad: "Ay Evreleri", arac: "/ay-takvimi", aracAd: "Bugünün Ay'ına bak",
    aciklama: "Yeni Ay'dan Dolunay'a sekiz Ay evresinin anlamı; Ay hangi burçtayken ne yapılır.",
    giris: [
      "Ay, yaklaşık 29,5 günde Dünya çevresindeki turunu tamamlar ve bu sürede Yeni Ay'dan Dolunay'a, oradan yeniden karanlığa uzanan sekiz evreden geçer. Tarım takvimlerinden halk geleneklerine kadar pek çok kültür, işlerini bu döngüye göre planlamıştır.",
      "Ezoterik gelenekte büyüyen Ay başlatmayı ve çoğaltmayı, küçülen Ay bırakmayı ve arınmayı simgeler. Ay ayrıca yaklaşık iki buçuk günde bir burç değiştirir; her burç günün havasına kendi rengini katar.",
    ],
    govde: () => bolum("Sekiz evre", AY.evreler.map((e) => `<h3>${k(e.ad)}</h3>${etiketler(e.anahtar)}${p(e.oneri)}${p(e.dogum)}`).join(""))
      + bolum("Ay burçlarda", BURC_ID.filter((id) => AY.ayBurcunda[id]).map((id) => `<h3><a href="/rehber/burclar/${id}">Ay ${k(burcAdi(id))} burcunda</a></h3>${p(AY.ayBurcunda[id].tema)}${AY.ayBurcunda[id].uygun ? `<p><em>Uygun:</em> ${k(AY.ayBurcunda[id].uygun.join(", "))}.</p>` : ""}`).join("")),
  },
  {
    yol: "yuz-okuma", ad: "Yüz Okuma Rehberi", arac: "/yuz-okuma", aracAd: "Yüzünü okut",
    aciklama: "Çin yüz okuma geleneğinde beş element yüz tipi ve yüz bölgelerinin anlamı.",
    giris: [
      "Yüz okuma (Çince mian xiang), yüzün biçimini ve bölgelerini karakter eğilimleriyle ilişkilendiren eski bir Çin geleneğidir. Beş element (ağaç, ateş, toprak, metal, su) yüz tiplerini sınıflandırmak için kullanılır.",
      "Yüz okuma bilimsel bir yöntem değildir; bir insanı dış görünüşüne göre yargılamak için değil, sembolik ve eğlenceli bir kendini tanıma oyunu olarak düşünülmelidir.",
    ],
    govde: () => bolum("Beş element yüz tipi", Y.elementler.map(([ad, ikon, sekil, anlam]) => `<h3>${k(ikon)} ${k(ad)}</h3><p><em>${k(sekil)}</em>. ${k(anlam)}</p>`).join(""))
      + bolum("Yüz bölgeleri", Y.bolgeler.map(([ad, anlam]) => `<h3>${k(ad)}</h3>${p(anlam)}`).join(""))
      + (Y.ipuclari ? bolum("İpuçları", liste(Y.ipuclari)) : ""),
  },
  {
    yol: "ebced", ad: "Ebced Hesabı ve Harf Tablosu", arac: "/ebced", aracAd: "İsminin ebced değerini hesapla",
    aciklama: "Ebced hesabı nedir, 28 Arap harfinin ebced değerleri ve unsurları.",
    giris: [
      "Ebced, Arap alfabesindeki her harfe bir sayı değeri veren eski bir sistemdir. Adını ilk dört harfin (elif, be, cim, dal) okunuşundan alır. Osmanlı döneminde tarih düşürmede, kitabelerde ve isim hesaplarında yaygın olarak kullanılmıştır.",
      "Bir ismin ebced değeri, harflerinin değerleri toplanarak bulunur. Gelenekte harfler ayrıca ateş, hava, su ve toprak unsurlarına ayrılır. Aşağıdaki tabloda 28 harfin değerleri ve unsurları yer alır.",
    ],
    govde: () => `<div class="table-wrap"><table class="rh-tablo"><thead><tr><th>Harf</th><th>Adı</th><th class="num">Değeri</th><th>Unsuru</th><th>Çağrışımları</th></tr></thead><tbody>${EB.HARFLER.map((h) => `<tr><td class="rh-arap" lang="ar">${k(h.h)}</td><td>${k(h.ad)}</td><td class="num">${k(h.d)}</td><td>${k(EB.UNSURLAR[h.unsur]?.ad || h.unsur)}</td><td>${k((h.anahtar || []).join(", "))}</td></tr>`).join("")}</tbody></table></div>`
      + bolum("Örnek", p("“Ahmet” ismi Arap harfleriyle elif (1), ha (8), mim (40) ve dal (4) ile yazılır; ebced değeri 1 + 8 + 40 + 4 = 53'tür. Türkçe isimlerin Arap harfleriyle yazılışında birden fazla gelenek olduğu için sonuç yazılışa göre değişebilir.")),
  },
];

// --- Sayfa çatısı ---

function sayfa({ yol, baslik, aciklama, kirinti, icerik, resim }) {
  const tam = `${SITE}${yol}`;
  const kirintiJson = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: kirinti.map(([ad, href], i) => ({ "@type": "ListItem", position: i + 1, name: ad, item: `${SITE}${href}` })) };
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#070914" />
    <title>${k(baslik)} · Ezoter.ist</title>
    <meta name="description" content="${k(aciklama)}" />
    <link rel="canonical" href="${tam}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Ezoter.ist" />
    <meta property="og:title" content="${k(baslik)}" />
    <meta property="og:description" content="${k(aciklama)}" />
    <meta property="og:url" content="${tam}" />
    ${resim ? `<meta property="og:image" content="${SITE}${resim}" />` : ""}
    <link rel="icon" href="/favicon.png?v=1" type="image/png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/astroloji.css?v=16" />
    <link rel="stylesheet" href="/rehber.css?v=1" />
    <script type="application/ld+json">${JSON.stringify(kirintiJson).replace(/</g, "\\u003c")}</script>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8608496252118049" crossorigin="anonymous"></script>
  </head>
  <body>
    <header class="topbar">
      <a class="topbar-back" href="${kirinti.length > 1 ? kirinti[kirinti.length - 2][1] : "/"}" aria-label="Geri" title="Geri">←</a>
      <a class="topbar-logo" href="/" aria-label="Ezoter.ist ana sayfa"><picture><source media="(orientation: portrait) and (max-width: 600px)" srcset="/logo/ezo_E.png?v=1" width="1247" height="216" /><img src="/logo/ezo_D.png?v=1" alt="Ezoter.ist" width="1247" height="77" /></picture></a>
      <span class="topbar-user" id="topbarUser"></span>
    </header>
    <main class="page rehber">
      <nav class="rh-kirinti" aria-label="Konum">${kirinti.map(([ad, href], i) => (i === kirinti.length - 1 ? `<span aria-current="page">${k(ad)}</span>` : `<a href="${href}">${k(ad)}</a>`)).join(" › ")}</nav>
      <article class="card rh-makale">
${icerik}
        <p class="rh-not">Bu içerik geleneksel ve kültürel kaynaklara dayanan genel bilgidir; eğlence ve kişisel farkındalık amaçlıdır, bilimsel bir dayanağı yoktur ve tıbbi, psikolojik, hukuki ya da mali tavsiye yerine geçmez. Son güncelleme: ${GUNCELLEME.split("-").reverse().join(".")}.</p>
      </article>
    </main>
    <script src="/ust-cubuk.js?v=23" defer></script>
  </body>
</html>`;
}

const konuHub = (x) => [["Ana sayfa", "/"], ["Rehber", "/rehber"], [x.ad, `/rehber/${x.yol}`]];

function konuKarti(x, o) {
  const href = `/rehber/${x.yol}/${encodeURIComponent(o.id)}`;
  if (x.resim) return `<a class="rh-kart${x.resimOran ? ` rh-kart-${x.resimOran}` : ""}" href="${href}"><img src="${x.resim(o)}" alt="" loading="lazy" decoding="async" /><b>${k(x.kartBaslik ? x.kartBaslik(o) : o.ad)}</b><small>${k(x.kartAlt(o))}</small></a>`;
  if (x.kartSekil) return `<a class="rh-kart rh-kart-sekil" href="${href}">${x.kartSekil(o)}<b>${k(o.ad)}</b><small>${k(x.kartAlt(o))}</small></a>`;
  if (x.kartRenk) return `<a class="rh-kart rh-kart-renk" href="${href}" style="--renk:${k(x.kartRenk(o))}"><i></i><b>${k(o.ad)}</b><small>${k(x.kartAlt(o))}</small></a>`;
  return `<a class="rh-kart rh-kart-sayi" href="${href}"><i>${k(x.kartMetin(o))}</i><b>${k(o.ad || x.kartAlt(o))}</b>${o.ad ? `<small>${k(x.kartAlt(o))}</small>` : ""}</a>`;
}

function konuSayfasi(x) {
  const gruplar = x.gruplar ? x.gruplar() : [[null, x.ogeler()]];
  const icerik = `<h1>${k(x.ad)}</h1>
        <p class="rh-ozet">${k(x.aciklama)}</p>
        ${x.giris.map(p).join("")}
        ${gruplar.map(([ad, ogeler]) => (ad ? `<h2>${k(ad)}</h2>` : "") + izgara(ogeler.map((o) => konuKarti(x, o)))).join("")}
        ${x.ek ? x.ek() : ""}
        ${eylem(x.arac, x.aracAd)}`;
  return sayfa({ yol: `/rehber/${x.yol}`, baslik: x.ad, aciklama: x.aciklama, kirinti: konuHub(x), icerik });
}

function ogeSayfasi(x, o) {
  const ogeler = x.ogeler();
  const i = ogeler.findIndex((y) => String(y.id) === String(o.id));
  const onceki = ogeler[(i - 1 + ogeler.length) % ogeler.length];
  const sonraki = ogeler[(i + 1) % ogeler.length];
  const baslik = x.baslik(o);
  const resim = x.resim ? x.resim(o) : null;
  const yol = `/rehber/${x.yol}/${encodeURIComponent(o.id)}`;
  const icerik = `<div class="rh-ust${resim ? "" : " rh-ust-yalin"}">
          ${resim ? `<img class="rh-resim${x.resimOran ? ` rh-resim-${x.resimOran}` : ""}" src="${resim}" alt="${k(baslik)}" width="360" height="360" />` : ""}
          <div><h1>${k(baslik)}</h1><p class="rh-ozet">${k(x.ozet(o))}</p></div>
        </div>
        ${x.govde(o)}
        ${eylem(x.arac, x.aracAd)}
        <nav class="rh-gezinti" aria-label="Diğerleri">
          <a href="/rehber/${x.yol}/${encodeURIComponent(onceki.id)}">‹ ${k(x.baslik(onceki))}</a>
          <a href="/rehber/${x.yol}">Tüm ${k(x.ad.toLocaleLowerCase("tr-TR"))}</a>
          <a href="/rehber/${x.yol}/${encodeURIComponent(sonraki.id)}">${k(x.baslik(sonraki))} ›</a>
        </nav>`;
  return sayfa({ yol, baslik, aciklama: x.ozet(o), kirinti: [...konuHub(x), [baslik, yol]], icerik, resim });
}

function tekSayfa(x) {
  const icerik = `<h1>${k(x.ad)}</h1>
        <p class="rh-ozet">${k(x.aciklama)}</p>
        ${x.giris.map(p).join("")}
        ${x.govde()}
        ${eylem(x.arac, x.aracAd)}`;
  return sayfa({ yol: `/rehber/${x.yol}`, baslik: x.ad, aciklama: x.aciklama, kirinti: konuHub(x), icerik });
}

function anaSayfa() {
  const hepsi = [...KONULAR, ...TEK_SAYFALAR];
  const icerik = `<h1>Ezoterik Rehber</h1>
        <p class="rh-ozet">Burçlar, tarot, rünler, melek sayıları, çakralar, kristaller, I Ching, numeroloji, semboller, rüya ve kahve falı sembolleri: hepsinin anlamları tek yerde.</p>
        <p>Ezoter.ist'in bölümlerinde yapay zekâ, senin girdiğin bilgilere göre kişisel bir yorum yazar. Bu rehber ise o yorumların dayandığı temel bilgileri herkesin okuyabileceği şekilde bir araya getirir: bir kartın, bir rünün ya da bir sayının geleneksel olarak ne anlattığını buradan öğrenebilirsin.</p>
        <div class="rh-izgara rh-konular">${hepsi.map((x) => `<a class="rh-konu" href="/rehber/${x.yol}"><b>${k(x.ad)}</b><small>${k(x.aciklama)}</small>${x.ogeler ? `<em>${x.ogeler().length} sayfa</em>` : ""}</a>`).join("")}</div>`;
  return sayfa({ yol: "/rehber", baslik: "Ezoterik Rehber", aciklama: "Burçlar, tarot kartları, rün taşları, melek sayıları, çakralar, kristaller, I Ching, numeroloji ve sembollerin anlamları.", kirinti: [["Ana sayfa", "/"], ["Rehber", "/rehber"]], icerik });
}

function hakkimizda() {
  const icerik = `<h1>Hakkımızda</h1>
        <p class="rh-ozet">Ezoter.ist, astroloji, numeroloji, tarot, fal ve benzeri ezoterik konularda yapay zekâ ile kişisel yorumlar üreten ücretsiz bir eğlence ve kişisel keşif sitesidir.</p>
        ${bolum("Ne yapıyoruz", p("Sitede 22 bölüm var: burç yorumlarından doğum haritasına, tarot ve rün açılımlarından kahve ve el falına, melek sayılarından ebced hesabına kadar. Her bölümde girdiğin bilgilere ya da yüklediğin fotoğrafa göre yapay zekâ sana özel bir yorum yazar; ayrıca bu yorumların dayandığı temel bilgileri herkesin okuyabileceği bir Rehber'de topluyoruz."))}
        ${bolum("Nasıl çalışıyoruz", `<ul>
          <li><b>Ücretsiz:</b> hiçbir yorum, fal ya da danışmanlık için ücret almıyoruz. Site reklamlarla ayakta duruyor.</li>
          <li><b>Üyeliksiz:</b> ad, e-posta ya da şifre istemiyoruz.</li>
          <li><b>Saklamadan:</b> girdiğin bilgiler, fotoğrafların ve yorumların kaydedilmiyor; sayfadan ayrıldığında silinir.</li>
          <li><b>Yapay zekâ:</b> yorumları kendi sunucularımızda çalışan yapay zekâ modelleri yazar. Arkada bir falcı ya da danışman yoktur.</li>
        </ul>`)}
        ${bolum("Yorumların niteliği", p("Sitedeki bütün içerikler eğlence, ilham ve kişisel farkındalık amaçlıdır. Bilimsel olarak kanıtlanmış yöntemler değildir; tıbbi, psikolojik, hukuki ya da mali tavsiye yerine geçmez. Hayatınla ilgili önemli kararlarda lütfen alanında uzman kişilere danış."))}
        ${bolum("Biz kimiz", `<p>Ezoter.ist, VÜCUT DESTEK SİSTEM MEDİKAL TİCARET LİMİTED ŞİRKETİ tarafından, Türkiye'de geliştirilen yapay zekâ çözümleri markası <a href="https://razece.ai" target="_blank" rel="noopener">RAZECE.AI</a> altyapısıyla yayınlanmaktadır.</p>`)}
        ${bolum("İletişim", `<p>Soruların, önerilerin ve hata bildirimlerin için <a href="/iletisim">İletişim</a> sayfasına bakabilirsin.</p>`)}`;
  return sayfa({ yol: "/hakkimizda", baslik: "Hakkımızda", aciklama: "Ezoter.ist nedir, nasıl çalışır: ücretsiz, üyeliksiz, yapay zekâ ile ezoterik yorumlar.", kirinti: [["Ana sayfa", "/"], ["Hakkımızda", "/hakkimizda"]], icerik });
}

function iletisim() {
  const icerik = `<h1>İletişim</h1>
        <p class="rh-ozet">Soruların, önerilerin, hata bildirimlerin ve gizlilikle ilgili taleplerin için bize ulaşabilirsin.</p>
        ${bilgiler([
          ["E-posta", '<a href="mailto:bilgi@ezoter.ist">bilgi@ezoter.ist</a>'],
          ["WhatsApp", '<a href="https://wa.me/905323300293" target="_blank" rel="noopener">0532 330 02 93</a>'],
          ["Şirket", "VÜCUT DESTEK SİSTEM MEDİKAL TİCARET LİMİTED ŞİRKETİ"],
          ["Adres", "Merkez Mah. Abide-i Hürriyet Cad. No: 211 İç Kapı No: 64 Şişli / İstanbul"],
          ["Vergi dairesi / no", "Şişli V.D. 9261011879"],
        ])}
        <p>Genellikle iki iş günü içinde cevap veriyoruz. Fal ya da yorum talepleri e-postayla karşılanmaz; yorumlar yalnızca sitedeki bölümlerden, yapay zekâ ile ücretsiz olarak üretilir.</p>`;
  return sayfa({ yol: "/iletisim", baslik: "İletişim", aciklama: "Ezoter.ist iletişim bilgileri: e-posta, WhatsApp ve şirket adresi.", kirinti: [["Ana sayfa", "/"], ["İletişim", "/iletisim"]], icerik });
}

// --- Site haritası ---

const ARACLAR = ["/astroloji", "/numeroloji", "/ruya", "/tarot", "/fotograf-analizi", "/kahve-fali", "/el-fali", "/yuz-okuma", "/ask-uyumu", "/dogum-haritasi",
  "/kristaller", "/iching", "/run-taslari", "/ay-takvimi", "/melek-sayilari", "/semboller", "/cakralar", "/taslarla-dizim", "/yuz-muzigi", "/cifir", "/ebced", "/asistan"];

function tumYollar() {
  const yollar = ["/", "/rehber", "/hakkimizda", "/iletisim", "/gizlilik", "/kullanim-kosullari", "/bilgilendirme", ...ARACLAR];
  for (const x of KONULAR) {
    yollar.push(`/rehber/${x.yol}`);
    for (const o of x.ogeler()) yollar.push(`/rehber/${x.yol}/${encodeURIComponent(o.id)}`);
  }
  for (const x of TEK_SAYFALAR) yollar.push(`/rehber/${x.yol}`);
  return yollar;
}

const siteHaritasi = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${tumYollar().map((y) => `  <url><loc>${SITE}${y}</loc><lastmod>${GUNCELLEME}</lastmod></url>`).join("\n")}
</urlset>
`;

const ROBOTS = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /yonetim
Disallow: /login

Sitemap: ${SITE}/sitemap.xml
`;

// --- Yönlendirici: önbellek (sayfalar veriden üretilir ve sunucu çalıştıkça değişmez) ---

const onbellek = new Map();
function uret(yolAdi) {
  if (yolAdi === "/rehber") return anaSayfa();
  if (yolAdi === "/hakkimizda") return hakkimizda();
  if (yolAdi === "/iletisim") return iletisim();
  const m = /^\/rehber\/([a-z-]+)(?:\/([^/]+))?$/.exec(yolAdi);
  if (!m) return null;
  const tek = TEK_SAYFALAR.find((x) => x.yol === m[1]);
  if (tek) return m[2] ? null : tekSayfa(tek);
  const konu = KONULAR.find((x) => x.yol === m[1]);
  if (!konu) return null;
  if (!m[2]) return konuSayfasi(konu);
  let id;
  try { id = decodeURIComponent(m[2]); } catch { return null; }
  const oge = konu.ogeler().find((o) => String(o.id) === id);
  return oge ? ogeSayfasi(konu, oge) : null;
}

function handleRehberRequest(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const yol = url.pathname.replace(/\/+$/, "") || "/";
  let govde;
  let tur = "text/html; charset=utf-8";
  if (yol === "/robots.txt") { govde = ROBOTS; tur = "text/plain; charset=utf-8"; }
  else if (yol === "/sitemap.xml") { govde = onbellek.get(yol) || siteHaritasi(); onbellek.set(yol, govde); tur = "application/xml; charset=utf-8"; }
  else if (yol === "/rehber" || yol.startsWith("/rehber/") || yol === "/hakkimizda" || yol === "/iletisim") {
    govde = onbellek.get(yol);
    if (govde === undefined) {
      govde = uret(yol);
      if (onbellek.size < 1000) onbellek.set(yol, govde);
    }
    if (govde === null) return false; // bilinmeyen rehber adresi: genel 404'e düşer
  } else return false;
  const veri = Buffer.from(govde);
  response.writeHead(200, { "Content-Type": tur, "Content-Length": veri.length, "Cache-Control": "public, max-age=600" });
  response.end(request.method === "HEAD" ? undefined : veri);
  return true;
}

module.exports = { handleRehberRequest, tumYollar };
