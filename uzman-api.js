// Uzman yorumu: kullanıcı yapay zekâ analizini isterse seçtiği uzmana da yorumlatır.
// Uzmanlar üyeler arasından yönetim panelinde tanımlanır (uzman-kayit.js). Talep yalnız seçilen uzmana e-postayla
// bildirilir; uzman /uzman panelinden yalnız kendi taleplerini görür ve yazılı, sesli ya da videolu cevap verir
// (yazılı cevap Piper ile seslendirilir). Her teslimde uzmana hakediş yazılır (bölümün uzman fiyatı × uzman oranı).
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { epostaYolla, epostaSablon, htmlKacis } = require("./eposta");
const { yardimci } = require("./astroloji-api");
const Ayarlar = require("./ayarlar");
const UzmanKayit = require("./uzman-kayit");
const { numerolojiKullaniciDosyasi } = require("./numeroloji-api");
const NumVeri = require("./numeroloji-veri");
const { ruyaKaydiOku } = require("./ruya-api");
const { falKaydiOku, fotoYolu: kahveFotoYolu } = require("./fal-api");
const { elKaydiOku, fotoYolu: elFotoYolu } = require("./el-fali-api");
const { tarotKaydiOku } = require("./tarot-api");
const { yuzKaydiOku, fotoYolu: yuzFotoYolu } = require("./yuz-okuma-api");
const { analizKaydiOku, fotoYolu: analizFotoYolu } = require("./fotograf-analiz-api");
const { askKaydiOku } = require("./ask-uyumu-api");
const { melekKaydiOku, ALANLAR: MELEK_ALANLARI } = require("./melek-sayilari-api");
const { ichingKaydiOku, ALANLAR: ICHING_ALANLARI } = require("./iching-api");
const { runKaydiOku } = require("./run-api");
const RunVeri = require("./run-veri");
const { ayKaydiOku } = require("./ay-takvimi-api");
const { cakraKaydiOku, kristalKaydiOku } = require("./cakra-kristal-api");
const CakraVeri = require("./cakra-veri");
const KristalVeri = require("./kristal-veri");
const { sembolKaydiOku } = require("./sembol-api");
const { dizimKaydiOku, gorselYolu: dizimGorselYolu } = require("./dizim-api");
const TarotVeri = require("./tarot-veri");
const { ebcedKaydiOku, cifirKaydiOku } = require("./ebced-cifir-api");

// Fotoğraflı bölümlerde uzman fotoğrafları da görür (/api/uzman/foto).
const FOTO_YOLLARI = { "kahve-fali": kahveFotoYolu, "el-fali": elFotoYolu, "yuz-okuma": yuzFotoYolu, "fotograf-analizi": analizFotoYolu, dizim: (dataDir, userId, kayitId) => dizimGorselYolu(dataDir, userId, kayitId) };

const { sendJson, readJson, readCache, writeCache, sesDosyasi, sesVar, kullaniciDosyasi, setup, Veri, askLlm, llmEnabled } = yardimci;
const Promptlar = require("./uzman-promptlari");

// Uzman yanıt süresi yönetim panelinden (saat).
const teslimSuresi = () => Ayarlar.get("sure.uzmanSaat") * 60 * 60 * 1000;
const SITE = (process.env.SITE_URL || "https://ezoter.ist").replace(/\/$/, "");
// Panele uzmanlar ve yönetici girer; yönetici bütün talepleri görür.
const uzmanMi = (user) => UzmanKayit.uzmanMi(user) || Ayarlar.yoneticiMi(user);
const uzmanAdi = (id) => UzmanKayit.bul(id)?.ad || "Uzmanımız";

const hata = (message, status = 400) => Object.assign(new Error(message), { status });

function talepDizini(dataDir) {
  return path.join(dataDir, "talepler");
}

async function tumTalepler(dir) {
  const files = await fs.promises.readdir(dir).catch(() => []);
  const talepler = await Promise.all(files.filter((f) => f.endsWith(".json")).map((f) => readCache(path.join(dir, f))));
  return talepler.filter(Boolean);
}

// Kullanıcıya gösterilen hâli: kişisel e-posta ya da iç alanlar gitmez.
const kullaniciGorunumu = (t) =>
  t && { id: t.id, uzman: t.uzman, bolum: t.bolum || "astroloji-harita", soru: t.soru, durum: t.durum, olusturma: t.olusturma, sonTarih: t.sonTarih, cevap: t.cevap || null };

// Uzmana gönderilebilen analizler. Her bölüm kayıtlı analizi okur ve uzmana gösterilecek özeti hazırlar.
const BOLUMLER = {
  "astroloji-harita": {
    ad: "doğum haritası",
    link: "/astroloji#harita",
    dosya: (cfg, dataDir, userId) => kullaniciDosyasi(cfg, userId),
    kaynak: (k) => {
      const satirlar = Object.entries(k.yerlesim || {}).map(([g, s]) => `${Veri.gezegenler[g].ad}: ${Veri.burclar[s].ad}`);
      if (k.yukselen) satirlar.push(`Yükselen: ${Veri.burclar[k.yukselen].ad}`);
      return {
        baslik: `Güneş ${Veri.burclar[k.yerlesim.sun].ad} · Ay ${Veri.burclar[k.yerlesim.moon].ad}${k.yukselen ? ` · Yükselen ${Veri.burclar[k.yukselen].ad}` : ""}`,
        girdiMetni: `${k.girdi.tarih} · ${k.girdi.saatYok ? "saat bilinmiyor" : k.girdi.saat} · ${k.girdi.sehir}`,
        ozet: satirlar.join(" · "),
      };
    },
  },
  "numeroloji-profil": {
    ad: "numeroloji profili",
    link: "/numeroloji#profil",
    dosya: (cfg, dataDir, userId) => numerolojiKullaniciDosyasi(dataDir, userId),
    kaynak: (k) => {
      const s = k.sayilar;
      const ek = [];
      if (k.karmikBorclar?.length) ek.push(`Karmik borç: ${k.karmikBorclar.join(", ")}`);
      if (k.eksik?.length) ek.push(`Eksik sayılar: ${k.eksik.join(", ")}`);
      return {
        baslik: `Yaşam Yolu ${s.yasamYolu} · Kader ${s.kader} · Ruh ${s.ruh}`,
        girdiMetni: `${k.girdi.adSoyad} · ${k.girdi.tarih}`,
        ozet: [
          `Yaşam Yolu: ${s.yasamYolu} (${NumVeri.sayilar[s.yasamYolu].ad})`, `Kader: ${s.kader}`, `Ruh Güdüsü: ${s.ruh}`, `Kişilik: ${s.kisilik}`,
          `Doğum Günü: ${s.dogumGunu}`, `Olgunluk: ${s.olgunluk}`, `Kişisel Yıl: ${s.kisiselYil}`, ...ek,
        ].join(" · "),
      };
    },
  },
  // Rüyada kullanıcı günlüğünden hangi rüyayı göndereceğini seçer (kayitId).
  "ruya-yorumu": {
    ad: "rüya yorumu",
    link: "/ruya#gunluk",
    yukle: (dataDir, userId, body) => ruyaKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: k.yorum.baslik,
      girdiMetni: `${new Date(k.tarih).toLocaleDateString("tr-TR")} rüyası${k.girdi.ruyaHissi ? ` · rüyada: ${k.girdi.ruyaHissi}` : ""}${k.girdi.uyanisHissi ? ` · uyanınca: ${k.girdi.uyanisHissi}` : ""}`,
      ozet: `Rüya: ${k.girdi.metin}${k.girdi.durum ? ` — Güncel durumu: ${k.girdi.durum}` : ""}`,
      kayitId: k.id,
    }),
  },
  // Kahve falında uzman fincan fotoğraflarını da görür (/api/uzman/foto).
  "kahve-fali": {
    ad: "kahve falı",
    link: "/kahve-fali#gunluk",
    yukle: (dataDir, userId, body) => falKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: k.fal.baslik,
      girdiMetni: `${new Date(k.tarih).toLocaleDateString("tr-TR")} falı · ${k.girdi.fotoSayisi} fotoğraf${k.girdi.tabakVar ? " (tabak dahil)" : ""}`,
      ozet: k.girdi.niyet ? `Niyeti: ${k.girdi.niyet}` : "Niyet belirtilmedi.",
      kayitId: k.id,
      fotoSayisi: k.girdi.fotoSayisi,
    }),
  },
  "el-fali": {
    ad: "el falı",
    link: "/el-fali#gunluk",
    yukle: (dataDir, userId, body) => elKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: k.fal.baslik,
      girdiMetni: `${new Date(k.tarih).toLocaleDateString("tr-TR")} falı · baskın el: ${k.girdi.baskinEl} · ${k.girdi.fotoSayisi} fotoğraf`,
      ozet: `${k.fal.elTipi ? `El tipi: ${k.fal.elTipi}. ` : ""}${k.girdi.soru ? `Sorusu: ${k.girdi.soru}` : "Soru belirtilmedi."}`,
      kayitId: k.id,
      fotoSayisi: k.girdi.fotoSayisi,
    }),
  },
  tarot: {
    ad: "tarot açılımı",
    link: "/tarot#gunluk",
    yukle: (dataDir, userId, body) => tarotKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => {
      const acilim = TarotVeri.acilimlar[k.acilim];
      return {
        baslik: `${acilim.ad} · ${k.yorum.baslik}`,
        girdiMetni: `${new Date(k.tarih).toLocaleDateString("tr-TR")} · ${acilim.ad}`,
        ozet: `${k.soru ? `Sorusu: ${k.soru} — ` : ""}${k.kartlar
          .map((c, i) => `${acilim.pozisyonlar[i]}: ${TarotVeri.kartlar.find((x) => x.id === c.id).ad}${c.ters ? " (ters)" : ""}`)
          .join(" · ")}`,
        kayitId: k.id,
        kartlar: k.kartlar,
      };
    },
  },
  "yuz-okuma": {
    ad: "yüz okuma",
    link: "/yuz-okuma#gunluk",
    yukle: (dataDir, userId, body) => yuzKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: k.fal.baslik,
      girdiMetni: `${new Date(k.tarih).toLocaleDateString("tr-TR")} yüz okuması`,
      ozet: `${k.fal.yuzSekli ? `Yüz şekli: ${k.fal.yuzSekli}. ` : ""}${k.fal.element ? `Element: ${k.fal.element}. ` : ""}${k.girdi.soru ? `Sorusu: ${k.girdi.soru}` : "Soru belirtilmedi."}`,
      kayitId: k.id,
      fotoSayisi: k.girdi.fotoSayisi,
    }),
  },
  "fotograf-analizi": {
    ad: "fotoğraf analizi",
    link: "/fotograf-analizi#gunluk",
    yukle: (dataDir, userId, body) => analizKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: k.fal.baslik,
      girdiMetni: `${new Date(k.tarih).toLocaleDateString("tr-TR")} fotoğraf analizi`,
      ozet: `${k.fal.gorulen} ${k.fal.cakra ? `Çakra: ${k.fal.cakra}. ` : ""}${k.girdi.soru ? `Sorusu: ${k.girdi.soru}` : ""}`.trim(),
      kayitId: k.id,
      fotoSayisi: k.girdi.fotoSayisi,
    }),
  },
  "ask-uyumu": {
    ad: "aşk uyumu",
    link: "/ask-uyumu#gunluk",
    yukle: (dataDir, userId, body) => askKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => {
      const b = (x) => Veri.burclar[x].ad;
      const kisi = (ad, h) => `${ad}: Güneş ${b(h.gunes)}, Ay ${b(h.ay)}, Venüs ${b(h.venus)}, Mars ${b(h.mars)}, yaşam yolu ${h.yasamYolu}`;
      return {
        baslik: `${k.sen.ad} ♥ ${k.o.ad} · %${k.sonuc.toplam}`,
        girdiMetni: `${k.sen.ad} (${k.sen.tarih}) ve ${k.o.ad} (${k.o.tarih})`,
        ozet: `${kisi(k.sen.ad, k.hesap.sen)} — ${kisi(k.o.ad, k.hesap.o)}${k.not ? ` — Notu: ${k.not}` : ""}`,
        kayitId: k.id,
      };
    },
  },
  "melek-sayilari": {
    ad: "melek sayısı",
    link: "/melek-sayilari#gunluk",
    yukle: (dataDir, userId, body) => melekKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: `${k.sayi} · ${k.yorum.baslik}`,
      girdiMetni: `Gördüğü sayı: ${k.sayi}${k.nerede ? ` (${k.nerede})` : ""}`,
      ozet: [`Merak ettiği alan: ${MELEK_ALANLARI[k.alan] || "genel yaşam"}`, k.an ? `O an aklından geçen: ${k.an}` : ""].filter(Boolean).join(" — "),
      kayitId: k.id,
    }),
  },
  iching: {
    ad: "I Ching",
    link: "/iching#gunluk",
    yukle: (dataDir, userId, body) => ichingKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: `${k.ana.no}. ${k.ana.ad}${k.sonra ? ` → ${k.sonra.no}. ${k.sonra.ad}` : ""}`,
      girdiMetni: `Sorusu: ${k.soru}`,
      ozet: [`Konu: ${ICHING_ALANLARI[k.alan] || "genel yaşam"}`, `Atışlar (alttan üste): ${k.atislar.join(", ")}`,
        k.degisen.length ? `Değişen çizgiler: ${k.degisen.join(", ")}` : "Değişen çizgi yok"].join(" — "),
      kayitId: k.id,
    }),
  },
  "run-taslari": {
    ad: "rün açılımı",
    link: "/run-taslari#gunluk",
    yukle: (dataDir, userId, body) => runKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => {
      const acilim = RunVeri.acilimlar[k.acilim];
      return {
        baslik: `${acilim.ad} · ${k.yorum.baslik}`,
        girdiMetni: k.soru ? `Sorusu: ${k.soru}` : "Soru belirtilmedi",
        ozet: k.taslar.map((c, i) => `${acilim.pozisyonlar[i]}: ${RunVeri.runBul(c.id).ad}${c.ters ? " (ters)" : ""}`).join(" — "),
        kayitId: k.id,
      };
    },
  },
  "ay-takvimi": {
    ad: "Ay döngüsü",
    link: "/ay-takvimi#rehber",
    yukle: (dataDir, userId) => ayKaydiOku(dataDir, userId),
    kaynak: (k) => ({
      baslik: `${k.rehber.baslik} · ${Veri.burclar[k.yeniAyBurcu].ad} Yeni Ayı`,
      girdiMetni: `Döngü: ${k.kod} Yeni Ayı (${Veri.burclar[k.yeniAyBurcu].ad}), Dolunay ${Veri.burclar[k.dolunayBurcu].ad}`,
      ozet: k.niyetler.length ? `Bu döngüdeki niyetleri: ${k.niyetler.map((n) => n.metin).join(" · ")}` : "Bu döngüde henüz niyet yazmamış.",
    }),
  },
  cakralar: {
    ad: "çakra testi",
    link: "/cakralar#gunluk",
    yukle: (dataDir, userId, body) => cakraKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: `Çakra testi · ${k.yorum.baslik}`,
      girdiMetni: k.not ? `Notu: ${k.not}` : "Not eklememiş",
      ozet: CakraVeri.cakralar.map((c) => `${c.ad} %${k.puanlar[c.id]}`).join(" — "),
      kayitId: k.id,
    }),
  },
  kristaller: {
    ad: "kristal önerisi",
    link: "/kristaller#gunluk",
    yukle: (dataDir, userId, body) => kristalKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: `Kristaller · ${k.yorum.secimler.map((s) => KristalVeri.kristalBul(s.id).ad).join(", ")}`,
      girdiMetni: [k.niyet ? `Niyeti: ${KristalVeri.niyetler[k.niyet]}` : "", k.ihtiyac ? `İhtiyacı: ${k.ihtiyac}` : ""].filter(Boolean).join(" — "),
      ozet: k.yorum.ozet,
      kayitId: k.id,
    }),
  },
  semboller: {
    ad: "sembol yorumu",
    link: "/semboller#gunluk",
    yukle: (dataDir, userId, body) => sembolKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: `Sembol · ${k.yorum.sembol}`,
      girdiMetni: `Sorduğu sembol: ${k.soru}${k.nerede ? ` — ${k.nerede}` : ""}`,
      ozet: k.yorum.anlam,
      kayitId: k.id,
    }),
  },
  dizim: {
    ad: "taşlarla dizim",
    link: "/taslarla-dizim#gunluk",
    yukle: (dataDir, userId, body) => dizimKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: `Dizim · ${k.taslar.map((t) => t.ad).join(", ")}`,
      girdiMetni: k.niyet ? `Niyeti: ${k.niyet}` : "Niyet yazmamış",
      ozet: [
        `Şekil: ${k.analiz.sekil.ad}`,
        k.analiz.ben ? `Ben'e göre (yakından uzağa): ${k.analiz.ben.siralama.map((s) => `${s.ad} ${s.mesafe}`).join(", ")}` : "",
        `Gruplar: ${k.analiz.kumeler.map((g) => g.uyeler.map((id) => k.analiz.taslar.find((t) => t.id === id)?.ad).join("+")).join(" / ")}`,
      ].filter(Boolean).join(" — "),
      kayitId: k.id,
      fotoSayisi: k.gorsel ? 1 : 0,
    }),
  },
  ebced: {
    ad: "ebced hesabı",
    link: "/ebced#gunluk",
    yukle: (dataDir, userId, body) => ebcedKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: `${k.girdi.metin} · ${k.hesap.toplam} · ${k.yorum.baslik}`,
      girdiMetni: `${new Date(k.tarih).toLocaleDateString("tr-TR")} · ${k.girdi.metin} (${k.girdi.arapca})${k.girdi.anne ? ` · anne: ${k.girdi.anne}` : ""}`,
      ozet: `Ebced ${k.hesap.toplam} · harfler: ${k.hesap.harfler.map((x) => `${x.ad} ${x.d}`).join(", ")} · baskın unsur ${k.hesap.baskin} · isim burcu ${k.hesap.burc.ad}`,
      kayitId: k.id,
    }),
  },
  cifir: {
    ad: "cifir açılımı",
    link: "/cifir#gunluk",
    yukle: (dataDir, userId, body) => cifirKaydiOku(dataDir, userId, String(body?.kayitId || "").replace(/[^0-9a-f]/g, "")),
    kaynak: (k) => ({
      baslik: `${k.hesap.egilim.ad} · ${k.yorum.baslik}`,
      girdiMetni: `${new Date(k.tarih).toLocaleDateString("tr-TR")} · ${k.girdi.isim}${k.girdi.anne ? ` (anne: ${k.girdi.anne})` : ""}`,
      ozet: `Sorusu: ${k.girdi.soru} · toplam ${k.hesap.toplam} · cevap harfleri ${k.hesap.cevapHarfleri.map((x) => x.ad).join(", ")} · eğilim ${k.hesap.egilim.ad} · ${k.hesap.gezegen.ad}`,
      kayitId: k.id,
    }),
  },
};

// Talebin bölümünün yönetim panelindeki karşılığı (fiyat için): bağlantının sayfa yolundan bulunur.
const ayarBolumu = (bolumAdi) => {
  const sayfa = (BOLUMLER[bolumAdi] || BOLUMLER["astroloji-harita"]).link.split("#")[0];
  return Ayarlar.BOLUMLER.find((b) => b.sayfa === sayfa) || null;
};
const BOLUM_LISTESI = () => Object.entries(BOLUMLER).map(([id, b]) => ({ id, ad: b.ad, bolum: ayarBolumu(id)?.ad || "" }));

// Hakediş: bölümün "uzman değerlendirmesi" fiyatı (kontör) × kontörün TL değeri × uzmanın oranı. Tanıtım
// döneminde müşteriden ücret alınmasa da panelde yazan fiyat üzerinden hesaplanır.
function hakedisHesapla(talep, uzman) {
  const ab = ayarBolumu(talep.bolum);
  const fiyat = ab && Ayarlar.SEMA[`fiyat.${ab.id}.uzman`] ? Ayarlar.get(`fiyat.${ab.id}.uzman`) || 0 : 0;
  const kontorTL = Ayarlar.get("fiyat.kontorTL") || 1;
  const oran = uzman?.oran ?? 0;
  return { fiyatKontor: fiyat, kontorTL, oran, tutar: Math.round(fiyat * kontorTL * oran) / 100, tarih: Date.now(), odemeId: null };
}

// Eski astroloji taleplerinde özet alanları yoktu; yerleşimlerden üretilir.
const talepKaynagi = (t) => (t.kaynak.ozet ? t.kaynak : { ...t.kaynak, ...BOLUMLER["astroloji-harita"].kaynak(t.kaynak) });

function createHandler({ dataDir, currentUser, sendFile }) {
  const dir = talepDizini(dataDir);
  const cfg = setup(dataDir);
  const talepDosyasi = (id) => path.join(dir, `${id}.json`);

  async function kullanicininTalebi(userId, bolum) {
    const hepsi = (await tumTalepler(dir)).filter((t) => t.userId === userId && (t.bolum || "astroloji-harita") === bolum);
    return hepsi.sort((a, b) => b.olusturma - a.olusturma)[0] || null;
  }

  async function talepOlustur(user, body) {
    const soru = String(body?.soru || "").trim().slice(0, 600);
    const bolumAdi = String(body?.bolum || "astroloji-harita");
    const bolum = BOLUMLER[bolumAdi];
    if (!bolum) throw hata("Geçersiz bölüm.");
    const uzman = UzmanKayit.vitrin().find((u) => u.id === String(body?.uzman || "") && u.bolumler.includes(bolumAdi));
    if (!uzman) throw hata("Bu uzman bu bölümde şu an hizmet vermiyor. Başka bir uzman seç.");
    // Cevaplayacak gerçek uzmanlar: karakterin sabit uzmanı ya da bu bölümü seçmiş herkes.
    const adaylar = UzmanKayit.cevaplayanlar(uzman.id, bolumAdi);
    if (!adaylar.length) throw hata("Bu bölümde şu an müsait uzmanımız yok. Biraz sonra tekrar dene.", 503);

    const onceki = await kullanicininTalebi(user.id, bolumAdi);
    if (onceki && onceki.durum !== "hazir") throw hata("Uzmanımızda bu analiz için zaten bekleyen bir talebin var.", 409);

    const analiz = bolum.yukle ? await bolum.yukle(dataDir, user.id, body) : await readCache(bolum.dosya(cfg, dataDir, user.id));
    if (!analiz?.metin) throw hata(`Önce ${bolum.ad} analizini çıkarmalısın.`);

    const simdi = Date.now();
    const talep = {
      id: crypto.randomBytes(8).toString("hex"),
      userId: user.id,
      userEmail: user.email,
      userName: user.name || "",
      uzman: uzman.id,
      adaylar: adaylar.map((a) => a.id),
      cevaplayan: adaylar.length === 1 ? adaylar[0].id : null,
      bolum: bolumAdi,
      soru,
      kaynak: { girdi: analiz.girdi, ...bolum.kaynak(analiz), aiMetin: analiz.metin },
      durum: "sirada",
      olusturma: simdi,
      sonTarih: simdi + teslimSuresi(),
    };
    await writeCache(talepDosyasi(talep.id), talep);

    // Yalnız cevap verebilecek uzmanlara haber verilir; birden çoksa ilk üstlenen alır.
    const teslimMetni = new Date(talep.sonTarih).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    for (const aday of adaylar) {
      const havuz = adaylar.length > 1;
      void epostaYolla({
        kime: aday.email,
        konu: `Ezoter.ist: ${bolum.ad} için yeni yorum talebi`,
        metin: `Merhaba ${aday.ad}, ${talep.userName || "bir üyemiz"} ${bolum.ad} için yorum istedi (seçtiği karakter: ${uzman.ad}).${soru ? ` Sorusu: ${soru}` : ""}${havuz ? " Talebi ilk üstlenen uzman cevaplar." : ""} Teslim: ${teslimMetni}. Panel: ${SITE}/uzman`,
        html: epostaSablon(
          "Yeni yorum talebi ✨",
          `<p>Merhaba ${htmlKacis(aday.ad)},</p><p><b>${htmlKacis(talep.userName || "Bir üyemiz")}</b> ${bolum.ad} için yorum bekliyor. Seçtiği uzman kartı: <b>${htmlKacis(uzman.ad)}</b>.</p>` +
            (soru ? `<p>Sorusu: <i>${htmlKacis(soru)}</i></p>` : "") +
            (havuz ? "<p>Bu talep bu bölümü seçen birden çok uzmana gönderildi; <b>ilk üstlenen</b> cevaplar.</p>" : "") +
            `<p>Teslim süresi: <b>${teslimMetni}</b> tarihine kadar. Yazılı, sesli ya da videolu cevap verebilirsin.</p>`,
          { url: `${SITE}/uzman`, yazi: havuz ? "Panele git ve üstlen" : "Uzman paneline git" },
        ),
      }).catch(() => {});
    }
    return talep;
  }

  // Talebe yalnız atanmış uzman (ya da yönetici) dokunabilir.
  async function yetkiliTalep(user, id) {
    const talep = await readCache(talepDosyasi(String(id || "").replace(/[^0-9a-f]/g, "")));
    if (!talep) throw hata("Talep bulunamadı.", 404);
    const ben = UzmanKayit.kullanicininUzmanligi(user.id);
    if (!Ayarlar.yoneticiMi(user) && talep.cevaplayan !== ben?.id) throw hata(talep.cevaplayan ? "Bu talebi başka bir uzman üstlendi." : "Önce talebi üstlenmelisin.", 403);
    return talep;
  }

  async function teslimEt(user, body) {
    const talep = await yetkiliTalep(user, body?.id);
    if (talep.durum === "hazir") throw hata("Bu talep zaten yanıtlandı.");
    const metin = String(body?.metin || "").trim().slice(0, 6000);
    // Cevap türü: yazılı seçildiyse yüklenmiş kayıt eklenmez; sesli/videoluda o türde kayıt şarttır.
    const tur = ["ses", "video"].includes(body?.tur) ? body.tur : "yazi";
    const medya = tur === "yazi" ? null : talep.taslakMedya?.tur === tur ? talep.taslakMedya : null;
    if (tur !== "yazi" && !medya) throw hata(`Önce ${tur === "video" ? "videonu" : "ses kaydını"} yükle.`);
    if (tur === "yazi" && metin.length < 40) throw hata("Yorum çok kısa. Yazılı cevap en az birkaç cümle olmalı.");
    const uzman = UzmanKayit.bul(talep.cevaplayan);
    talep.durum = "hazir";
    talep.cevap = { metin, yazan: talep.uzman, tarih: Date.now(), ...(medya ? { medya } : {}) };
    if (talep.taslakMedya && !medya) await fs.promises.rm(path.join(medyaDizini, talep.taslakMedya.dosya), { force: true });
    delete talep.taslakMedya;
    talep.teslimEden = user.email;
    talep.hakedis = hakedisHesapla(talep, uzman);
    await writeCache(talepDosyasi(talep.id), talep);

    const bolum = BOLUMLER[talep.bolum] || BOLUMLER["astroloji-harita"];
    const ad = uzmanAdi(talep.uzman);
    const turAdi = medya?.tur === "video" ? "videolu" : medya?.tur === "ses" ? "sesli" : "yazılı";
    void epostaYolla({
      kime: talep.userEmail,
      konu: "Ezoter.ist: uzman yorumun hazır",
      metin: `Merhaba ${talep.userName || ""}, uzmanımız ${ad} ${bolum.ad} analizini ${turAdi} olarak yorumladı. Yorumun: ${SITE}${bolum.link}`,
      html: epostaSablon(
        "Uzman yorumun hazır ✨",
        `<p>Merhaba ${htmlKacis(talep.userName || "")},</p><p>Uzmanımız <b>${htmlKacis(ad)}</b> ${bolum.ad} analizini kendi gözüyle <b>${turAdi}</b> olarak yorumladı.</p>`,
        { url: `${SITE}${bolum.link}`, yazi: "Yorumumu aç" },
      ),
    }).catch(() => {});
    return talep;
  }

  // Ses / video cevabı: ham gövde olarak gelir (en çok 300 MB), DATA_DIR/talepler/medya/<id>.<uzantı>.
  const MEDYA_TURLERI = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "video/webm": "webm", "video/mp4": "mp4" };
  const medyaDizini = path.join(dir, "medya");
  async function medyaYukle(user, request, id) {
    const talep = await yetkiliTalep(user, id);
    if (talep.durum === "hazir") throw hata("Bu talep zaten yanıtlandı.");
    const mime = String(request.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const uzanti = MEDYA_TURLERI[mime];
    if (!uzanti) throw hata("Kayıt biçimi desteklenmiyor.");
    const tur = mime.startsWith("video/") ? "video" : "ses";
    await fs.promises.mkdir(medyaDizini, { recursive: true });
    const hedef = path.join(medyaDizini, `${talep.id}.${tur}.${uzanti}`);
    const gecici = `${hedef}.${process.pid}.yukleniyor`;
    await new Promise((tamam, red) => {
      let boyut = 0;
      const yaz = fs.createWriteStream(gecici);
      request.on("data", (p) => {
        boyut += p.length;
        if (boyut > 300 * 1024 * 1024) { red(hata("Kayıt çok büyük (en çok 300 MB).", 413)); request.destroy(); yaz.destroy(); }
      });
      request.pipe(yaz);
      yaz.on("finish", () => (boyut < 2000 ? red(hata("Kayıt boş görünüyor.")) : tamam()));
      yaz.on("error", red);
      request.on("error", red);
    }).catch(async (e) => { await fs.promises.rm(gecici, { force: true }); throw e; });
    if (talep.taslakMedya) await fs.promises.rm(path.join(medyaDizini, talep.taslakMedya.dosya), { force: true });
    await fs.promises.rename(gecici, hedef);
    talep.taslakMedya = { tur, mime, dosya: path.basename(hedef), tarih: Date.now() };
    await writeCache(talepDosyasi(talep.id), talep);
    return talep.taslakMedya;
  }

  // Uzman paneline giden hâli: müşteri e-postası gizlenmez (uzman iletişim kurmaz ama yönetici görür).
  const panelGorunumu = (t) => ({ ...t, bolum: t.bolum || "astroloji-harita", bolumAdi: (BOLUMLER[t.bolum] || BOLUMLER["astroloji-harita"]).ad, uzmanAdi: uzmanAdi(t.uzman), cevaplayanAdi: t.cevaplayan ? uzmanAdi(t.cevaplayan) : null, kaynak: talepKaynagi(t) });

  return function handleUzmanRequest(request, response, url) {
    // Sayfalardaki uzman seçimi için herkese açık kadro (eski sabit uzmanlar.js'in yerine, sunucudan üretilir).
    if (url.pathname === "/uzmanlar.js" && request.method === "GET") {
      const liste = UzmanKayit.hepsi().map((u) => ({ ...UzmanKayit.herkeseAcik(u), secilebilir: UzmanKayit.vitrin().some((v) => v.id === u.id) }));
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" });
      response.end(`// Uzman kadrosu (sunucudan, uzman-kayit.js)\nwindow.Uzmanlar = ${JSON.stringify(liste)};\n`);
      return true;
    }
    const foto = /^\/uzman-foto\/([0-9a-f]{10})$/.exec(url.pathname);
    if (foto && request.method === "GET") {
      const yol = UzmanKayit.fotoYolu(foto[1]);
      if (yol) sendFile(request, response, yol);
      else { response.writeHead(404); response.end(); }
      return true;
    }
    if (!url.pathname.startsWith("/api/uzman/")) return false;
    const route = `${request.method} ${url.pathname}`;
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Giriş yapmalısınız." });
      return true;
    }
    const sadeceUzman = () => {
      if (!uzmanMi(user)) throw hata("Bu sayfa yalnızca uzmanlarımız içindir.", 403);
    };

    const routes = {
      "GET /api/uzman/durum": async () => {
        const talep = await kullanicininTalebi(user.id, String(url.searchParams.get("bolum") || "astroloji-harita"));
        sendJson(response, 200, { uzman: uzmanMi(user), ses: sesVar(), talep: kullaniciGorunumu(talep) });
      },
      "POST /api/uzman/talep": async () => {
        const talep = await talepOlustur(user, await readJson(request));
        sendJson(response, 201, { talep: kullaniciGorunumu(talep) });
      },
      // Uzman yalnız kendi taleplerini, yönetici hepsini görür. Profil, bölüm listesi ve hakediş özeti de gelir.
      "GET /api/uzman/panel": async () => {
        sadeceUzman();
        const ben = UzmanKayit.kullanicininUzmanligi(user.id);
        const yonetici = Ayarlar.yoneticiMi(user);
        const sira = { sirada: 0, inceleniyor: 1, hazir: 2 };
        const benimMi = (t) => ben && (t.cevaplayan === ben.id || (!t.cevaplayan && t.durum !== "hazir" && (t.adaylar || []).includes(ben.id)));
        const talepler = (await tumTalepler(dir)).filter((t) => yonetici || benimMi(t)).sort(
          (a, b) => sira[a.durum] - sira[b.durum] || (a.durum === "hazir" ? b.olusturma - a.olusturma : a.sonTarih - b.sonTarih),
        );
        const benimkiler = talepler.filter((t) => ben && t.cevaplayan === ben.id && t.hakedis);
        const toplam = benimkiler.reduce((a, t) => a + t.hakedis.tutar, 0);
        const odenen = benimkiler.filter((t) => t.hakedis.odemeId).reduce((a, t) => a + t.hakedis.tutar, 0);
        sendJson(response, 200, {
          talepler: talepler.map((t) => ({ ...panelGorunumu(t), benim: Boolean(ben && t.cevaplayan === ben.id), ustlenilebilir: Boolean(ben && !t.cevaplayan && (t.adaylar || []).includes(ben.id)) })), yonetici,
          profil: ben ? { ...UzmanKayit.herkeseAcik(ben), oran: ben.oran, email: ben.email } : null,
          bolumListesi: BOLUM_LISTESI(),
          hakedis: ben ? { toplam, odenen, kalan: toplam - odenen, adet: benimkiler.length, oran: ben.oran } : null,
        });
      },
      // Karakterin ağzından taslak: seçilen kartın promptuyla yapay zekâ bir taslak yazar; uzman düzeltip teslim eder.
      "POST /api/uzman/panel/taslak": async () => {
        sadeceUzman();
        if (!llmEnabled) throw hata("Yapay zekâ şu an bağlı değil.", 503);
        const body = await readJson(request);
        const talep = await yetkiliTalep(user, body?.id);
        const kart = UzmanKayit.bul(talep.uzman) || { ad: "Uzmanımız", prompt: "" };
        const k = talepKaynagi(talep);
        const bolum = (BOLUMLER[talep.bolum] || BOLUMLER["astroloji-harita"]).ad;
        const kullanici =
          `<girdi>Danışan: ${talep.userName || "danışan"}. Konu: ${bolum}. ${k.girdiMetni || ""}\n` +
          `Analiz özeti: ${k.ozet || ""}\n${talep.soru ? `Danışanın uzmana notu: ${talep.soru}\n` : ""}` +
          `Yapay zekânın ilk yorumu (yalnızca kaynak olarak kullan, kopyalama): ${String(k.aiMetin || "").slice(0, 3000)}</girdi>\n` +
          `Bu analizi ${kart.ad || "uzman"} olarak, kendi üslubunla ve danışana doğrudan hitap ederek 3-5 paragrafta yorumla. ` +
          (talep.soru ? "Danışanın notuna mutlaka cevap ver. " : "") + "Yalnızca yorum metnini yaz.";
        const metin = String(await askLlm(Promptlar.sistemPromptu(kart), kullanici, { maxTokens: 1400, temperature: 0.8 }) || "").trim().slice(0, 6000);
        if (metin.length < 40) throw hata("Taslak üretilemedi, tekrar dene.", 502);
        sendJson(response, 200, { metin, kart: kart.ad });
      },
      // Havuzdaki talebi üstlenme: ilk gelen alır.
      "POST /api/uzman/panel/ustlen": async () => {
        sadeceUzman();
        const body = await readJson(request);
        const ben = UzmanKayit.kullanicininUzmanligi(user.id);
        const id = String(body?.id || "").replace(/[^0-9a-f]/g, "");
        const talep = await readCache(talepDosyasi(id));
        if (!talep || !ben || !(talep.adaylar || []).includes(ben.id)) throw hata("Talep bulunamadı.", 404);
        if (talep.cevaplayan && talep.cevaplayan !== ben.id) throw hata("Bu talebi başka bir uzman üstlendi.", 409);
        talep.cevaplayan = ben.id;
        talep.ustlenme = Date.now();
        if (talep.durum === "sirada") talep.durum = "inceleniyor";
        await writeCache(talepDosyasi(talep.id), talep);
        sendJson(response, 200, { talep: { ...panelGorunumu(talep), benim: true } });
      },
      "POST /api/uzman/profil": async () => {
        sadeceUzman();
        const body = await readJson(request);
        const u = await UzmanKayit.profilGuncelle(user.id, body || {}, Object.keys(BOLUMLER));
        sendJson(response, 200, { profil: { ...UzmanKayit.herkeseAcik(u), oran: u.oran, email: u.email } });
      },
      "POST /api/uzman/profil/foto": async () => {
        sadeceUzman();
        const ben = UzmanKayit.kullanicininUzmanligi(user.id);
        if (!ben) throw hata("Uzman kaydın bulunamadı.", 404);
        const veri = await hamOku(request, 3 * 1024 * 1024);
        const u = await UzmanKayit.fotoKaydet(ben.id, String(request.headers["content-type"] || "").split(";")[0], veri);
        sendJson(response, 200, { resim: UzmanKayit.resimAdresi(u) });
      },
      "POST /api/uzman/panel/medya": async () => {
        sadeceUzman();
        sendJson(response, 200, { medya: await medyaYukle(user, request, url.searchParams.get("id")) });
      },
      // Ses / video cevap: talep sahibi, atanmış uzman ve yönetici izleyebilir (Range destekli).
      "GET /api/uzman/medya": async () => {
        const talep = await readCache(talepDosyasi(String(url.searchParams.get("id") || "").replace(/[^0-9a-f]/g, "")));
        const ben = UzmanKayit.kullanicininUzmanligi(user.id);
        const yetkili = talep && (talep.userId === user.id || Ayarlar.yoneticiMi(user) || (ben && talep.cevaplayan === ben.id));
        const medya = talep && (url.searchParams.get("taslak") ? talep.taslakMedya : talep.cevap?.medya);
        if (!yetkili || !medya) throw hata("Kayıt bulunamadı.", 404);
        sendFile(request, response, path.join(medyaDizini, medya.dosya));
      },
      "POST /api/uzman/panel/incele": async () => {
        sadeceUzman();
        const body = await readJson(request);
        const talep = await yetkiliTalep(user, body?.id);
        if (talep.durum === "sirada") {
          talep.durum = "inceleniyor";
          await writeCache(talepDosyasi(talep.id), talep);
        }
        sendJson(response, 200, { talep });
      },
      "POST /api/uzman/panel/teslim": async () => {
        sadeceUzman();
        sendJson(response, 200, { talep: await teslimEt(user, await readJson(request)) });
      },
      // Fotoğraflı talebin (kahve falı, el falı) fotoğrafı: yalnız talep sahibi ve uzman görür.
      "GET /api/uzman/foto": async () => {
        const talep = await readCache(talepDosyasi(String(url.searchParams.get("id") || "").replace(/[^0-9a-f]/g, "")));
        const benF = UzmanKayit.kullanicininUzmanligi(user.id);
        const gorebilir = talep && (talep.userId === user.id || Ayarlar.yoneticiMi(user) || (benF && (talep.cevaplayan === benF.id || (!talep.cevaplayan && (talep.adaylar || []).includes(benF.id)))));
        if (!gorebilir || !FOTO_YOLLARI[talep.bolum]) throw hata("Fotoğraf bulunamadı.", 404);
        const n = Number(url.searchParams.get("n") || 0);
        if (!Number.isInteger(n) || n < 0 || n >= (talep.kaynak.fotoSayisi || 0)) throw hata("Fotoğraf bulunamadı.", 404);
        const dosya = FOTO_YOLLARI[talep.bolum](dataDir, talep.userId, talep.kaynak.kayitId, n);
        if (!fs.existsSync(dosya)) throw hata("Kullanıcı bu kaydı silmiş.", 404);
        sendFile(request, response, dosya);
      },
      // Uzman yorumu seslendirilir; talep sahibi ve uzman dinleyebilir.
      "GET /api/uzman/ses": async () => {
        if (!sesVar()) throw hata("Seslendirme henüz hazır değil.", 503);
        const talep = await readCache(talepDosyasi(String(url.searchParams.get("id") || "").replace(/[^0-9a-f]/g, "")));
        if (!talep?.cevap?.metin || (talep.userId !== user.id && !uzmanMi(user))) throw hata("Yorum bulunamadı.", 404);
        const file = await sesDosyasi(talep.cevap.metin, dir, `${talep.id}-ses`, UzmanKayit.bul(talep.uzman)?.ses || "");
        sendFile(request, response, file);
      },
    };

    const handler = routes[route];
    if (!handler) {
      sendJson(response, 404, { error: "Bulunamadı." });
      return true;
    }
    Promise.resolve()
      .then(handler)
      .catch((error) => {
        if (response.headersSent) return response.destroy();
        const status = error.status || 500;
        if (status === 500) console.error("Uzman:", error);
        sendJson(response, status, { error: status === 500 ? "Bir sorun oluştu. Lütfen tekrar deneyin." : error.message });
      });
    return true;
  };
}

function hamOku(request, sinir) {
  return new Promise((tamam, red) => {
    let boyut = 0;
    const parcalar = [];
    request.on("data", (p) => {
      boyut += p.length;
      if (boyut > sinir) { red(hata("Dosya çok büyük.", 413)); request.destroy(); return; }
      parcalar.push(p);
    });
    request.on("end", () => tamam(Buffer.concat(parcalar)));
    request.on("error", red);
  });
}

// --- Hakediş (yönetim paneli) ---

const odemeDosyasi = (dataDir) => path.join(dataDir, "uzman", "odemeler.json");

async function hakedisOzeti(dataDir) {
  const talepler = (await tumTalepler(talepDizini(dataDir))).filter((t) => t.hakedis);
  const odemeler = (await readCache(odemeDosyasi(dataDir))) || [];
  return UzmanKayit.gercekler().map((u) => {
    const benim = talepler.filter((t) => t.cevaplayan === u.id);
    const toplam = benim.reduce((a, t) => a + t.hakedis.tutar, 0);
    const odenen = benim.filter((t) => t.hakedis.odemeId).reduce((a, t) => a + t.hakedis.tutar, 0);
    return {
      uzmanId: u.id, toplam, odenen, kalan: Math.round((toplam - odenen) * 100) / 100, adet: benim.length,
      kalemler: benim.sort((a, b) => b.hakedis.tarih - a.hakedis.tarih).slice(0, 200).map((t) => ({
        id: t.id, bolumAdi: (BOLUMLER[t.bolum] || BOLUMLER["astroloji-harita"]).ad, musteri: t.userName || t.userEmail, tarih: t.hakedis.tarih,
        tur: t.cevap?.medya?.tur || "yazi", fiyatKontor: t.hakedis.fiyatKontor, oran: t.hakedis.oran, tutar: t.hakedis.tutar, odendi: Boolean(t.hakedis.odemeId),
      })),
      odemeler: odemeler.filter((o) => o.uzmanId === u.id),
    };
  });
}

// Uzmanın ödenmemiş bütün hakedişleri tek ödeme olarak kapatılır.
async function hakedisOde(dataDir, uzmanId, not, kim) {
  const dir = talepDizini(dataDir);
  const odenmemis = (await tumTalepler(dir)).filter((t) => t.cevaplayan === uzmanId && t.hakedis && !t.hakedis.odemeId);
  if (!odenmemis.length) throw hata("Ödenecek hakediş yok.");
  const odeme = { id: crypto.randomBytes(6).toString("hex"), uzmanId, tutar: Math.round(odenmemis.reduce((a, t) => a + t.hakedis.tutar, 0) * 100) / 100, adet: odenmemis.length, tarih: Date.now(), not: String(not || "").trim().slice(0, 200), kim };
  for (const t of odenmemis) {
    t.hakedis.odemeId = odeme.id;
    await writeCache(path.join(dir, `${t.id}.json`), t);
  }
  const liste = (await readCache(odemeDosyasi(dataDir))) || [];
  liste.unshift(odeme);
  await writeCache(odemeDosyasi(dataDir), liste);
  return odeme;
}

// Kişisel arşiv için: kullanıcının bütün uzman talepleri (kullanıcıya gösterilen hâliyle) ve bölüm adları.
async function kullaniciTalepleri(dataDir, userId) {
  const talepler = (await tumTalepler(talepDizini(dataDir))).filter((t) => t.userId === userId).sort((a, b) => b.olusturma - a.olusturma);
  return talepler.map((t) => {
    const bolum = BOLUMLER[t.bolum || "astroloji-harita"] || BOLUMLER["astroloji-harita"];
    return { ...kullaniciGorunumu(t), bolumAdi: bolum.ad, link: bolum.link, baslik: talepKaynagi(t).baslik || "" };
  });
}

module.exports = { createHandler, kullaniciTalepleri, hakedisOzeti, hakedisOde, BOLUM_LISTESI, hamOku };
