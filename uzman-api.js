// Uzman yorumu: kullanıcı yapay zekâ analizini isterse uzmanımıza da yorumlatır (şimdilik ücretsiz, 48 saat).
// Uzman /uzman panelinden talepleri görür, yanıtını yazar; yanıt Piper (arabella) ile seslendirilir.
// Uzman hesapları UZMAN_EPOSTA ortam değişkeninde (virgülle ayrılmış e-postalar) tanımlanır.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { epostaYolla, epostaSablon, htmlKacis } = require("./eposta");
const { yardimci } = require("./astroloji-api");
const Uzmanlar = require("./uzmanlar");

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
  t && { id: t.id, uzman: t.uzman, soru: t.soru, durum: t.durum, olusturma: t.olusturma, sonTarih: t.sonTarih, cevap: t.cevap || null };

const haritaOzeti = (kaynak) => {
  const satirlar = Object.entries(kaynak.yerlesim || {}).map(([k, s]) => `${Veri.gezegenler[k].ad}: ${Veri.burclar[s].ad}`);
  if (kaynak.yukselen) satirlar.push(`Yükselen: ${Veri.burclar[kaynak.yukselen].ad}`);
  return satirlar.join(" · ");
};

function createHandler({ dataDir, currentUser, sendFile }) {
  const dir = talepDizini(dataDir);
  const cfg = setup(dataDir);
  const talepDosyasi = (id) => path.join(dir, `${id}.json`);

  async function kullanicininTalebi(userId) {
    const hepsi = (await tumTalepler(dir)).filter((t) => t.userId === userId);
    return hepsi.sort((a, b) => b.olusturma - a.olusturma)[0] || null;
  }

  async function talepOlustur(user, body) {
    const uzman = Uzmanlar.find((u) => u.id === String(body?.uzman || "") && u.aktif);
    if (!uzman) throw hata("Bu uzman henüz hizmet vermiyor.");
    const soru = String(body?.soru || "").trim().slice(0, 600);

    const onceki = await kullanicininTalebi(user.id);
    if (onceki && onceki.durum !== "hazir") throw hata("Uzmanımızda zaten bekleyen bir talebin var.", 409);

    const harita = await readCache(kullaniciDosyasi(cfg, user.id));
    if (!harita?.metin) throw hata("Önce doğum haritanı çıkarmalısın.");

    const simdi = Date.now();
    const talep = {
      id: crypto.randomBytes(8).toString("hex"),
      userId: user.id,
      userEmail: user.email,
      userName: user.name || "",
      uzman: uzman.id,
      bolum: "astroloji-harita",
      soru,
      kaynak: { girdi: harita.girdi, yerlesim: harita.yerlesim, yukselen: harita.yukselen, aiMetin: harita.metin },
      durum: "sirada",
      olusturma: simdi,
      sonTarih: simdi + TESLIM_SURESI_MS,
    };
    await writeCache(talepDosyasi(talep.id), talep);

    for (const kime of uzmanEpostalari()) {
      void epostaYolla({
        kime,
        konu: "Ezoter.ist: yeni uzman yorumu talebi",
        metin: `${talep.userName || talep.userEmail} doğum haritası için yorum istedi.${soru ? ` Sorusu: ${soru}` : ""} Panel: ${SITE}/uzman`,
        html: epostaSablon(
          "Yeni uzman yorumu talebi",
          `<p><b>${htmlKacis(talep.userName || talep.userEmail)}</b> doğum haritası için yorumunu bekliyor.</p>` +
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

    void epostaYolla({
      kime: talep.userEmail,
      konu: "Ezoter.ist: uzman yorumun hazır",
      metin: `Merhaba ${talep.userName || ""}, baş numeroloğumuz doğum haritanı yorumladı. Okumak ve sesli dinlemek için: ${SITE}/astroloji#harita`,
      html: epostaSablon(
        "Uzman yorumun hazır ✨",
        `<p>Merhaba ${htmlKacis(talep.userName || "")},</p><p>Baş numeroloğumuz doğum haritanı kendi gözüyle yorumladı. Yorumunu okuyabilir, sesli dinleyebilirsin.</p>`,
        { url: `${SITE}/astroloji#harita`, yazi: "Yorumumu aç" },
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
        const talep = await kullanicininTalebi(user.id);
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
        sendJson(response, 200, { talepler: talepler.map((t) => ({ ...t, haritaOzeti: haritaOzeti(t.kaynak) })) });
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
