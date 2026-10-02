// Uzman yorumu: kullanıcı yapay zekâ analizini isterse uzmanımıza da yorumlatır (şimdilik ücretsiz, 48 saat).
// Uzman /uzman panelinden talepleri görür, yanıtını yazar; yanıt Piper (arabella) ile seslendirilir.
// Uzman hesapları UZMAN_EPOSTA ortam değişkeninde (virgülle ayrılmış e-postalar) tanımlanır.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { epostaYolla, epostaSablon, htmlKacis } = require("./eposta");
const { yardimci } = require("./astroloji-api");
const Uzmanlar = require("./uzmanlar");
const { numerolojiKullaniciDosyasi } = require("./numeroloji-api");
const NumVeri = require("./numeroloji-veri");
const { ruyaKaydiOku } = require("./ruya-api");
const { falKaydiOku, fotoYolu: kahveFotoYolu } = require("./fal-api");
const { elKaydiOku, fotoYolu: elFotoYolu } = require("./el-fali-api");

// Fotoğraflı bölümlerde uzman fotoğrafları da görür (/api/uzman/foto).
const FOTO_YOLLARI = { "kahve-fali": kahveFotoYolu, "el-fali": elFotoYolu };

const { sendJson, readJson, readCache, writeCache, sesDosyasi, sesVar, kullaniciDosyasi, setup, Veri } = yardimci;

const TESLIM_SURESI_MS = 48 * 60 * 60 * 1000;
const SITE = (process.env.SITE_URL || "https://ezoter.ist").replace(/\/$/, "");
const uzmanEpostalari = () =>
  String(process.env.UZMAN_EPOSTA || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const uzmanMi = (user) => Boolean(user?.email) && uzmanEpostalari().includes(String(user.email).toLowerCase());

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
};

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
    const uzman = Uzmanlar.find((u) => u.id === String(body?.uzman || "") && u.aktif);
    if (!uzman) throw hata("Bu uzman henüz hizmet vermiyor.");
    const soru = String(body?.soru || "").trim().slice(0, 600);
    const bolumAdi = String(body?.bolum || "astroloji-harita");
    const bolum = BOLUMLER[bolumAdi];
    if (!bolum) throw hata("Geçersiz bölüm.");

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
      bolum: bolumAdi,
      soru,
      kaynak: { girdi: analiz.girdi, ...bolum.kaynak(analiz), aiMetin: analiz.metin },
      durum: "sirada",
      olusturma: simdi,
      sonTarih: simdi + TESLIM_SURESI_MS,
    };
    await writeCache(talepDosyasi(talep.id), talep);

    for (const kime of uzmanEpostalari()) {
      void epostaYolla({
        kime,
        konu: "Ezoter.ist: yeni uzman yorumu talebi",
        metin: `${talep.userName || talep.userEmail} ${bolum.ad} için yorum istedi (seçtiği numerolog: ${uzman.ad}).${soru ? ` Sorusu: ${soru}` : ""} Panel: ${SITE}/uzman`,
        html: epostaSablon(
          "Yeni uzman yorumu talebi",
          `<p><b>${htmlKacis(talep.userName || talep.userEmail)}</b> ${bolum.ad} için yorum bekliyor. Seçtiği numerolog: <b>${htmlKacis(uzman.ad)}</b>.</p>` +
            (soru ? `<p>Sorusu: <i>${htmlKacis(soru)}</i></p>` : "") +
            `<p>Söz verilen teslim: 48 saat içinde.</p>`,
          { url: `${SITE}/uzman`, yazi: "Uzman paneline git" },
        ),
      }).catch(() => {});
    }
    return talep;
  }

  async function teslimEt(user, body) {
    const talep = await readCache(talepDosyasi(String(body?.id || "").replace(/[^0-9a-f]/g, "")));
    if (!talep) throw hata("Talep bulunamadı.", 404);
    const metin = String(body?.metin || "").trim().slice(0, 6000);
    if (metin.length < 40) throw hata("Yorum çok kısa.");
    talep.durum = "hazir";
    talep.cevap = { metin, yazan: talep.uzman, tarih: Date.now() };
    talep.teslimEden = user.email;
    await writeCache(talepDosyasi(talep.id), talep);

    const bolum = BOLUMLER[talep.bolum] || BOLUMLER["astroloji-harita"];
    const uzmanAdi = (Uzmanlar.find((u) => u.id === talep.uzman) || Uzmanlar[0]).ad;
    void epostaYolla({
      kime: talep.userEmail,
      konu: "Ezoter.ist: uzman yorumun hazır",
      metin: `Merhaba ${talep.userName || ""}, numeroloğumuz ${uzmanAdi} ${bolum.ad} analizini yorumladı. Okumak ve sesli dinlemek için: ${SITE}${bolum.link}`,
      html: epostaSablon(
        "Uzman yorumun hazır ✨",
        `<p>Merhaba ${htmlKacis(talep.userName || "")},</p><p>Numeroloğumuz ${htmlKacis(uzmanAdi)} ${bolum.ad} analizini kendi gözüyle yorumladı. Yorumunu okuyabilir, sesli dinleyebilirsin.</p>`,
        { url: `${SITE}${bolum.link}`, yazi: "Yorumumu aç" },
      ),
    }).catch(() => {});
    return talep;
  }

  return function handleUzmanRequest(request, response, url) {
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
      "GET /api/uzman/panel": async () => {
        sadeceUzman();
        const sira = { sirada: 0, inceleniyor: 1, hazir: 2 };
        const talepler = (await tumTalepler(dir)).sort(
          (a, b) => sira[a.durum] - sira[b.durum] || (a.durum === "hazir" ? b.olusturma - a.olusturma : a.sonTarih - b.sonTarih),
        );
        sendJson(response, 200, { talepler: talepler.map((t) => ({ ...t, bolum: t.bolum || "astroloji-harita", bolumAdi: (BOLUMLER[t.bolum] || BOLUMLER["astroloji-harita"]).ad, kaynak: talepKaynagi(t) })) });
      },
      "POST /api/uzman/panel/incele": async () => {
        sadeceUzman();
        const body = await readJson(request);
        const talep = await readCache(talepDosyasi(String(body?.id || "").replace(/[^0-9a-f]/g, "")));
        if (!talep) throw hata("Talep bulunamadı.", 404);
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
        if (!talep || !FOTO_YOLLARI[talep.bolum] || (talep.userId !== user.id && !uzmanMi(user))) throw hata("Fotoğraf bulunamadı.", 404);
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
        if (!talep?.cevap || (talep.userId !== user.id && !uzmanMi(user))) throw hata("Yorum bulunamadı.", 404);
        const file = await sesDosyasi(talep.cevap.metin, dir, `${talep.id}-ses`);
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

module.exports = { createHandler };
