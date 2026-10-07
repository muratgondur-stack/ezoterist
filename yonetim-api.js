// Yönetim paneli: yalnızca yönetici hesabı (ayarlar.js YONETICI) erişir; başkasına uçlar "bulunamadı" der.
// Ayarları okur/yazar (değişiklik geçmişiyle), ses örneği dinletir, özet istatistik ve kullanıcı listesi verir,
// kullanıcıya elle kontör ekler/düşer. Ayrıca herkese açık küçük bir uç: /api/ayarlar/genel (müzik, kapalı bölümler).
const fs = require("node:fs");
const path = require("node:path");
const Ayarlar = require("./ayarlar");
const { yardimci } = require("./astroloji-api");
const { kontorDefteri } = require("./kontor");
const Anahtarlar = require("./anahtarlar");
const Olcum = require("./olcum");
const Odeme = require("./odeme");
const Kupon = require("./kupon");
const UzmanKayit = require("./uzman-kayit");
const { hakedisOzeti, hakedisOde, BOLUM_LISTESI, hamOku } = require("./uzman-api");

// --- Maliyet hesabı (Murat 2026-10-04): hizmet kendi Gemma/TTS/resim motorumuzla verilir; burada dış API'lerden
// (OpenAI gpt-4.1-mini, Google standart TTS, OpenAI görsel) alınsaydı bir işlemin kaça mal olacağı hesaplanır.

// Dolar kuru: TCMB günlük kurundan (efektif değil döviz satış), 6 saatte bir tazelenir.
let kurOnbellek = null;
async function tcmbKuru() {
  if (kurOnbellek && Date.now() - kurOnbellek.zaman < 6 * 3600 * 1000) return kurOnbellek;
  try {
    const r = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", { signal: AbortSignal.timeout(8000) });
    const xml = await r.text();
    const usd = /<Currency[^>]*CurrencyCode="USD"[^>]*>([\s\S]*?)<\/Currency>/.exec(xml)?.[1] || "";
    const satis = Number(/<ForexSelling>([\d.]+)<\/ForexSelling>/.exec(usd)?.[1]);
    const tarih = /Tarih="([^"]+)"/.exec(xml)?.[1] || "";
    if (satis > 0) kurOnbellek = { deger: satis, tarih, zaman: Date.now() };
  } catch (error) {
    console.error("TCMB kuru alınamadı:", error.message);
  }
  return kurOnbellek;
}

// Henüz ölçüm yoksa kullanılan kaba varsayımlar (bir işlem için).
const FOTOLU = ["kahve-fali", "el-fali", "yuz-okuma", "fotograf-analizi"];
// Uzman yorumunu insan uzman yazar; yapay zekâ kullanılmaz, yalnız kullanıcı dinlerse seslendirilir.
const varsayim = (id) => (id === "uzman"
  ? { giris: 0, cikis: 0, karakter: 2600, gorsel: 0 }
  : { giris: FOTOLU.includes(id) ? 2400 : 1800, cikis: 900, karakter: 2600, gorsel: id === "ruya" ? 1 : 0 });

async function maliyetTablosu() {
  const otomatik = await tcmbKuru();
  const elle = Ayarlar.get("maliyet.usdTry");
  const kur = elle > 0 ? elle : otomatik?.deger || 0;
  const birim = {
    giris: Ayarlar.get("maliyet.metinGiris"),
    cikis: Ayarlar.get("maliyet.metinCikis"),
    ses: Ayarlar.get("maliyet.ses"),
    gorsel: Ayarlar.get("maliyet.gorsel"),
  };
  const kontorTL = Ayarlar.get("fiyat.kontorTL");
  const olcum = Olcum.ozet();
  const yuvarla = (n, b = 4) => Math.round(n * 10 ** b) / 10 ** b;
  const satir = (id, ad, fiyatli) => {
    const o = olcum.bolumler[id];
    const v = varsayim(id);
    const islem = o?.islem || 0;
    const giris = islem ? o.llm.giris / islem : v.giris;
    const cikis = islem ? o.llm.cikis / islem : v.cikis;
    const karakter = o?.tts?.n ? o.tts.karakter / o.tts.n : v.karakter;
    const gorsel = islem ? (o.gorsel?.n || 0) / islem : v.gorsel;
    const usd = {
      metin: (giris * birim.giris + cikis * birim.cikis) / 1e6,
      ses: (karakter * birim.ses) / 1e6,
      gorsel: gorsel * birim.gorsel,
    };
    const tl = Object.fromEntries(Object.entries(usd).map(([k, x]) => [k, yuvarla(x * kur)]));
    const maliyet = yuvarla(tl.metin + tl.ses + tl.gorsel);
    const kontor = fiyatli ? Ayarlar.get(`fiyat.${id}`) : null;
    const uzmanKontor = Ayarlar.SEMA[`fiyat.${id}.uzman`] ? Ayarlar.get(`fiyat.${id}.uzman`) : null;
    const satis = fiyatli ? yuvarla(kontor * kontorTL, 2) : null;
    return {
      id, ad, kontor, satis, maliyet, tl, uzmanKontor, uzmanSatis: uzmanKontor == null ? null : yuvarla(uzmanKontor * kontorTL, 2),
      olculen: Boolean(islem), islem, llmCagri: o?.llm?.n || 0, sesUretim: o?.tts?.n || 0,
      ortalama: { giris: Math.round(giris), cikis: Math.round(cikis), karakter: Math.round(karakter), gorsel: yuvarla(gorsel, 2) },
      kar: fiyatli ? yuvarla(satis - maliyet, 2) : null,
    };
  };
  return {
    kur, kurKaynagi: elle > 0 ? "elle" : otomatik ? `TCMB ${otomatik.tarih}` : "alınamadı",
    tcmb: otomatik?.deger || null, birim, kontorTL, tanitim: Ayarlar.get("fiyat.tanitim"), olcumBaslangic: olcum.baslangic,
    // Asistanda fiyat ve maliyet her soru + cevap içindir (Murat 2026-10-04); sesle sorma (Whisper) hesaba katılmaz.
    bolumler: Ayarlar.BOLUMLER.map((b) => satir(b.id, b.id === "asistan" ? `${b.ad} (her soru + cevap)` : b.ad, true)),
  };
}

const { sendJson, readJson, readCache, writeCache, sesOrnek, sesSaglik, bugun, llmEnabled } = yardimci;
const hata = (message, status = 400) => Object.assign(new Error(message), { status });

async function klasorler(dizin) {
  return (await fs.promises.readdir(dizin, { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory()).map((d) => d.name);
}

// Bugünkü kullanım: her bölümün kullanıcı klasörlerindeki sayac.json (bugünün sayısı) ve toplam kayıt.
async function kullanimOzeti(dataDir) {
  const gun = bugun();
  const sonuc = [];
  for (const b of Ayarlar.BOLUMLER) {
    const kok = path.join(dataDir, b.dizin);
    let bugunku = 0;
    let kullanici = 0;
    let toplam = 0;
    for (const id of await klasorler(kok)) {
      if (id.startsWith("_")) continue;
      const s = await readCache(path.join(kok, id, "sayac.json"));
      if (s?.gun === gun) bugunku += Number(s.adet ?? s.acilim ?? s.yansima ?? 0) || 0;
      const g = await readCache(path.join(kok, id, "gunluk.json"));
      const adet = Array.isArray(g) ? g.length : Array.isArray(g?.kayitlar) ? g.kayitlar.length : 0;
      if (adet) { kullanici += 1; toplam += adet; }
    }
    sonuc.push({ id: b.id, ad: b.ad, bugun: bugunku, kullanici, toplam, acik: Ayarlar.bolumAcik(b.id) });
  }
  return sonuc;
}

async function uzmanOzeti(dataDir) {
  const dir = path.join(dataDir, "talepler");
  const dosyalar = (await fs.promises.readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json"));
  const sayim = { sirada: 0, inceleniyor: 0, hazir: 0, geciken: 0 };
  for (const f of dosyalar) {
    const t = await readCache(path.join(dir, f));
    if (!t) continue;
    sayim[t.durum] = (sayim[t.durum] || 0) + 1;
    if (t.durum !== "hazir" && t.sonTarih && t.sonTarih < Date.now()) sayim.geciken += 1;
  }
  return sayim;
}

function createHandler({ dataDir, currentUser, kullaniciListesi, kullaniciSil }) {
  const kontor = kontorDefteri(dataDir);
  const gecmisDosyasi = path.join(dataDir, "yonetim", "gecmis.json");

  async function gecmiseYaz(user, degisiklikler, onceki) {
    const gecmis = (await readCache(gecmisDosyasi)) || [];
    Object.entries(degisiklikler).forEach(([k, v]) => gecmis.unshift({ tarih: Date.now(), kim: user.email, anahtar: k, eski: onceki[k], yeni: v }));
    gecmis.splice(300);
    await writeCache(gecmisDosyasi, gecmis);
  }

  return function handleYonetimRequest(request, response, url) {
    // Herkese açık: ana menünün ihtiyaç duyduğu küçük ayar alt kümesi.
    if (url.pathname === "/api/ayarlar/genel" && request.method === "GET") {
      sendJson(response, 200, {
        muzik: Ayarlar.get("genel.muzik"),
        kapali: Ayarlar.BOLUMLER.filter((b) => !Ayarlar.bolumAcik(b.id)).map((b) => b.sayfa),
        // Bekleme çarkındaki aşamalı yazıların hızı için (sn).
        bekleme: { hafif: Ayarlar.get("sure.enAzBekleme"), derin: Ayarlar.get("sure.derinBekleme") },
        // Fiyat/kontör bilgisi gönderilmez (2026-10-07: ücretli hizmet yok); düğmelerde rozet ve onay penceresi çıkmaz.
      });
      return true;
    }
    // Herkese açık fiyat listesi (/fiyatlar sayfası): kontör paketleri ve hizmetlerin kontör karşılıkları.
    if (url.pathname === "/api/fiyatlar" && request.method === "GET" && Ayarlar.yoneticiMi(currentUser(request))) {
      sendJson(response, 200, {
        paketler: Odeme.paketler(),
        kontorTL: Ayarlar.get("fiyat.kontorTL"),
        tanitim: Ayarlar.get("fiyat.tanitim"),
        bolumler: Ayarlar.BOLUMLER.filter((b) => Ayarlar.bolumAcik(b.id)).map((b) => ({
          ad: b.id === "asistan" ? `${b.ad} (soru + cevap)` : b.ad, sayfa: b.sayfa,
          islem: Ayarlar.get(`fiyat.${b.id}`) || 0,
          uzman: Ayarlar.SEMA[`fiyat.${b.id}.uzman`] ? Ayarlar.get(`fiyat.${b.id}.uzman`) || 0 : null,
        })),
      });
      return true;
    }
    if (!url.pathname.startsWith("/api/yonetim/")) return false;
    const user = currentUser(request);
    // Yönetici olmayan için uç yokmuş gibi davranılır.
    if (!Ayarlar.yoneticiMi(user)) {
      sendJson(response, 404, { error: "Bulunamadı." });
      return true;
    }

    const routes = {
      "GET /api/yonetim/durum": async () => {
        const kullanicilar = kullaniciListesi();
        const hafta = Date.now() - 7 * 86400000;
        const [kullanim, uzman, ses] = await Promise.all([kullanimOzeti(dataDir), uzmanOzeti(dataDir), sesSaglik()]);
        sendJson(response, 200, {
          sema: Object.entries(Ayarlar.SEMA).map(([anahtar, s]) => ({ anahtar, ...s })),
          degerler: Ayarlar.hepsi(),
          degisen: Object.keys(Ayarlar.SEMA).filter((k) => JSON.stringify(Ayarlar.get(k)) !== JSON.stringify(Ayarlar.SEMA[k].vars)),
          ozet: {
            uye: kullanicilar.length,
            yeniUye: kullanicilar.filter((u) => u.createdAt && Date.parse(u.createdAt) > hafta).length,
            kullanim, uzman,
            servis: { yapayZeka: llmEnabled, ses },
          },
          gecmis: ((await readCache(gecmisDosyasi)) || []).slice(0, 40),
        });
      },
      "POST /api/yonetim/ayarlar": async () => {
        const body = await readJson(request);
        const degisiklikler = body?.degisiklikler && typeof body.degisiklikler === "object" ? body.degisiklikler : {};
        if (!Object.keys(degisiklikler).length) throw hata("Değişiklik yok.");
        const onceki = Ayarlar.hepsi();
        const degerler = await Ayarlar.kaydet(degisiklikler);
        await gecmiseYaz(user, degisiklikler, onceki);
        sendJson(response, 200, { degerler });
      },
      "POST /api/yonetim/sifirla": async () => {
        const body = await readJson(request);
        const anahtarlar = (Array.isArray(body?.anahtarlar) ? body.anahtarlar : []).filter((k) => Ayarlar.SEMA[k]);
        if (!anahtarlar.length) throw hata("Sıfırlanacak ayar yok.");
        const onceki = Ayarlar.hepsi();
        const degerler = await Ayarlar.sifirla(anahtarlar);
        await gecmiseYaz(user, Object.fromEntries(anahtarlar.map((k) => [k, "(varsayılan)"])), onceki);
        sendJson(response, 200, { degerler });
      },
      "POST /api/yonetim/ses-ornek": async () => {
        const body = await readJson(request);
        const ses = Ayarlar.SESLER.includes(body?.ses) ? body.ses : Ayarlar.get("ses.ses");
        const hiz = Math.min(1.6, Math.max(0.6, Number(body?.hiz) || 1));
        // Uzman karakteri sesi denenirken kendi adıyla konuşur.
        const metin = String(body?.metin || "").replace(/[<>]/g, "").trim().slice(0, 200) || "Merhaba, ben Ezoter.ist'in sesiyim. Yıldızlar bugün senin için güzel şeyler fısıldıyor.";
        const mp3 = await sesOrnek(metin, ses, hiz);
        response.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": mp3.length, "Cache-Control": "no-store" });
        response.end(mp3);
      },
      "GET /api/yonetim/kullanicilar": async () => {
        const liste = await Promise.all(kullaniciListesi().map(async (u) => ({ ...u, bakiye: (await kontor.oku(u.id)).bakiye })));
        liste.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        sendJson(response, 200, { kullanicilar: liste });
      },
      // Üyeliği sil: uzmansa önce uzman kaydı çıkarılır; ikisi de yedeklenir.
      "POST /api/yonetim/kullanici-sil": async () => {
        const body = await readJson(request);
        const id = String(body?.userId || "");
        const uz = UzmanKayit.kullanicininUzmanligi(id);
        if (uz) await UzmanKayit.gercekCikar(uz.id);
        const silinen = await kullaniciSil(id);
        await gecmiseYaz(user, { [`uye.${silinen.id}`]: "(silindi)" }, { [`uye.${silinen.id}`]: `${silinen.name || ""} ${silinen.email}${uz ? " · uzmandı" : ""}`.trim() });
        sendJson(response, 200, { silinen });
      },
      "POST /api/yonetim/uzman-cikar": async () => {
        const body = await readJson(request);
        const u = await UzmanKayit.gercekCikar(String(body?.id || ""));
        await gecmiseYaz(user, { [`uzman.${u.id}`]: "(uzmanlıktan çıkarıldı)" }, { [`uzman.${u.id}`]: `${u.ad} (${u.email})` });
        sendJson(response, 200, { tamam: true });
      },
      "POST /api/yonetim/kontor": async () => {
        const body = await readJson(request);
        const hedef = kullaniciListesi().find((u) => u.id === String(body?.userId || ""));
        if (!hedef) throw hata("Kullanıcı bulunamadı.", 404);
        const miktar = Math.trunc(Number(body?.miktar));
        if (!miktar || Math.abs(miktar) > 100000) throw hata("Geçerli bir miktar gir (eksi değer düşer).");
        const aciklama = String(body?.aciklama || "").trim().slice(0, 120) || (miktar > 0 ? "Hediye kontör" : "Düzeltme");
        const hareket = await kontor.hareketEkle(hedef.id, { miktar, tur: miktar > 0 ? "hediye" : "harcama", aciklama, ref: `yonetim:${user.email}` });
        sendJson(response, 200, { hareket });
      },
      "GET /api/yonetim/maliyet": async () => sendJson(response, 200, await maliyetTablosu()),
      // Dış servis API anahtarları: panele yalnız özet (son 4 karakter) gider; geçmişe değer yazılmaz.
      "GET /api/yonetim/anahtarlar": async () => sendJson(response, 200, { anahtarlar: Anahtarlar.ozet() }),
      "POST /api/yonetim/anahtar": async () => {
        const body = await readJson(request);
        const saglayici = String(body?.saglayici || "");
        const onceki = Anahtarlar.ozet().find((a) => a.id === saglayici);
        await Anahtarlar.kaydet(saglayici, body?.deger);
        const simdi = Anahtarlar.ozet().find((a) => a.id === saglayici);
        await gecmiseYaz(user, { [`anahtar.${saglayici}`]: simdi.var ? `…${simdi.son4}` : "(silindi)" }, { [`anahtar.${saglayici}`]: onceki?.var ? `…${onceki.son4}` : "(yok)" });
        sendJson(response, 200, { anahtarlar: Anahtarlar.ozet() });
      },
      // Ödeme (PayTR) ve kuponlar. Parola / gizli anahtar panele hiç dönmez; geçmişe yalnız son 3 karakter yazılır.
      "GET /api/yonetim/odeme": async () => sendJson(response, 200, {
        paytr: Odeme.ayarOzeti(Odeme.siteTabani(request)), paketler: Odeme.paketler(), siparisler: Odeme.sonSiparisler(), kuponlar: Kupon.liste(),
      }),
      "POST /api/yonetim/paytr": async () => {
        const body = await readJson(request);
        const onceki = Odeme.ayarOzeti("");
        await Odeme.ayarKaydet({ magazaNo: body?.magazaNo, parola: body?.parola, gizli: body?.gizli, mod: body?.mod, temizle: body?.temizle === true });
        const simdi = Odeme.ayarOzeti(Odeme.siteTabani(request));
        const yaz = (o) => `${o.magazaNo || "—"} · …${o.parolaSon || "—"} · …${o.gizliSon || "—"} · ${o.mod}`;
        await gecmiseYaz(user, { "odeme.paytr": yaz(simdi) }, { "odeme.paytr": yaz(onceki) });
        sendJson(response, 200, { paytr: simdi });
      },
      "POST /api/yonetim/paytr-test": async () => sendJson(response, 200, await Odeme.baglantiTesti(request, user)),
      "POST /api/yonetim/kupon-uret": async () => {
        const body = await readJson(request);
        const sonuc = await Kupon.uret({ kontor: body?.kontor, adet: body?.adet, notu: body?.notu, olusturan: user.email });
        sendJson(response, 200, { ...sonuc, kuponlar: Kupon.liste() });
      },
      "POST /api/yonetim/kupon-sil": async () => {
        const body = await readJson(request);
        await Kupon.sil(body?.kod);
        sendJson(response, 200, { kuponlar: Kupon.liste() });
      },
      // Uzman kadrosu ve hakedişler.
      "GET /api/yonetim/uzmanlar": async () => {
        const ozet = await hakedisOzeti(dataDir);
        sendJson(response, 200, {
          uzmanlar: UzmanKayit.hepsi().map((u) => ({
            ...UzmanKayit.herkeseAcik(u), userId: u.userId || null, email: u.email || null, oran: u.oran ?? null, vitrinde: Boolean(u.vitrinde),
            sabitUzman: u.sabitUzman || null, sira: u.sira || null, ses: u.ses || "", prompt: u.prompt || "", olusturma: u.olusturma, gorunuyor: UzmanKayit.vitrindeMi(u),
            hakedis: ozet.find((o) => o.uzmanId === u.id) || null,
          })),
          bolumListesi: BOLUM_LISTESI(),
          sesler: Ayarlar.SESLER,
          uyeler: kullaniciListesi().map((u) => ({ id: u.id, email: u.email, name: u.name })),
        });
      },
      "POST /api/yonetim/uzman-ekle": async () => {
        const body = await readJson(request);
        const uye = kullaniciListesi().find((u) => u.id === String(body?.userId || ""));
        if (!uye) throw hata("Üye bulunamadı.", 404);
        const u = await UzmanKayit.ekle({ userId: uye.id, email: uye.email, ad: body?.ad || uye.name, unvan: body?.unvan, oran: body?.oran });
        await gecmiseYaz(user, { [`uzman.${u.id}`]: `${u.ad} (${u.email}) uzman yapıldı · %${u.oran}` }, {});
        sendJson(response, 200, { uzman: u });
      },
      "POST /api/yonetim/uzman-guncelle": async () => {
        const body = await readJson(request);
        const bulunan = UzmanKayit.bul(String(body?.id || ""));
        const onceki = bulunan && JSON.parse(JSON.stringify(bulunan)); // kayıt yerinde değiştiği için kopya
        const u = await UzmanKayit.yoneticiGuncelle(String(body?.id || ""), body || {}, BOLUM_LISTESI().map((b) => b.id));
        const ozetle = (x) => `${x.ad || "isimsiz"}${x.tip === "gercek" ? ` · %${x.oran}` : ""} · ${x.aktif ? "açık" : "kapalı"} · ${x.bolumler.length} bölüm`;
        if (onceki && ozetle(onceki) !== ozetle(u)) await gecmiseYaz(user, { [`uzman.${u.id}`]: ozetle(u) }, { [`uzman.${u.id}`]: ozetle(onceki) });
        sendJson(response, 200, { uzman: u });
      },
      "POST /api/yonetim/sanal-ekle": async () => sendJson(response, 200, { uzman: await UzmanKayit.sanalEkle() }),
      "POST /api/yonetim/uzman-sil": async () => {
        const body = await readJson(request);
        const u = UzmanKayit.bul(String(body?.id || ""));
        await UzmanKayit.sil(String(body?.id || ""));
        await gecmiseYaz(user, { [`uzman.${body?.id}`]: "(silindi)" }, { [`uzman.${body?.id}`]: u?.ad || "sanal karakter" });
        sendJson(response, 200, { tamam: true });
      },
      "POST /api/yonetim/uzman-foto": async () => {
        const veri = await hamOku(request, 3 * 1024 * 1024);
        const u = await UzmanKayit.fotoKaydet(String(url.searchParams.get("id") || ""), String(request.headers["content-type"] || "").split(";")[0], veri);
        sendJson(response, 200, { resim: UzmanKayit.resimAdresi(u) });
      },
      "POST /api/yonetim/hakedis-ode": async () => {
        const body = await readJson(request);
        const u = UzmanKayit.bul(String(body?.uzmanId || ""));
        if (!u) throw hata("Uzman bulunamadı.", 404);
        const odeme = await hakedisOde(dataDir, u.id, body?.not, user.email);
        await gecmiseYaz(user, { [`hakedis.${u.id}`]: `${u.ad}: ${odeme.tutar} ₺ ödendi (${odeme.adet} cevap)` }, {});
        sendJson(response, 200, { odeme });
      },
      "POST /api/yonetim/anahtar-test": async () => {
        const body = await readJson(request);
        sendJson(response, 200, await Anahtarlar.test(String(body?.saglayici || "")));
      },
    };
    const handler = routes[`${request.method} ${url.pathname}`];
    if (!handler) {
      sendJson(response, 404, { error: "Bulunamadı." });
      return true;
    }
    Promise.resolve()
      .then(handler)
      .catch((error) => {
        if (response.headersSent) return response.destroy();
        const status = error.status || 500;
        if (status === 500) console.error("Yönetim:", error);
        sendJson(response, status, { error: status === 500 ? `Bir sorun oluştu: ${error.message}` : error.message });
      });
    return true;
  };
}

module.exports = { createHandler };
