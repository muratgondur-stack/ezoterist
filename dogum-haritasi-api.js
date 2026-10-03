// Ayrıntılı doğum haritası: astroloji bölümünde kayıtlı doğum bilgisinden evler, açılar ve dengeler hesaplanır;
// Gemma bölüm bölüm derin bir yorum yazar. Yorum doğum bilgisine göre önbelleğe alınır (aynı bilgi = aynı yorum).
const crypto = require("node:crypto");
const path = require("node:path");
const Astro = require("./astro");
const DogumHaritasi = require("./dogum-haritasi-hesap");
const HVeri = require("./dogum-haritasi-veri");
const { yardimci } = require("./astroloji-api");

const { sendJson, readCache, writeCache, sesDosyasi, sesVar, kullaniciDosyasi, setup, Veri, askLlm, once, llmEnabled } = yardimci;

const hata = (message, status = 400) => Object.assign(new Error(message), { status });
const kisalt = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
const burcAdi = (k) => Veri.burclar[k].ad;
const derece = (lon) => `${Math.floor(lon % 30)}°`;

const SISTEM =
  "Sen Ezoter.ist'in deneyimli astroloğusun. Bir doğum haritasını evleri, gezegen yerleşimleri ve açılarıyla birlikte derinlemesine yorumlarsın. " +
  "Türkçe, sıcak, akıcı ve güçlendirici yaz; kişiye 'sen' diye hitap et; metin sesli okunacak. Kesin kehanette bulunma, korkutma; " +
  "sağlık, hukuk ve para konularında kesin tavsiye verme. Sana verilen yerleşimlere sadık kal, yeni konum uydurma. " +
  "Cevabını YALNIZCA geçerli JSON olarak ver, başka hiçbir şey yazma.";

function jsonAyikla(metin) {
  const bas = metin.indexOf("{");
  const son = metin.lastIndexOf("}");
  if (bas === -1 || son <= bas) throw new Error("Yorum JSON değil");
  return JSON.parse(metin.slice(bas, son + 1).replace(/[  -​ 　﻿]/g, " ").replace(/,\s*([}\]])/g, "$1"));
}

const BOLUMLER = [
  ["kisilik", "Kişiliğin"], ["duygular", "Duygu dünyan"], ["ask", "Aşk ve ilişkiler"], ["kariyer", "Kariyer ve yol"],
  ["para", "Para ve değerler"], ["aile", "Aile ve kökler"], ["ruhsal", "Ruhsal yolculuğun"],
];

function haritaMetni(h) {
  const G = Veri.gezegenler;
  const satir = h.konumlar.map((k) => `${G[k.body].ad} ${burcAdi(k.sign)} ${derece(k.lon)}${k.retro ? " (geri)" : ""}${k.ev ? `, ${k.ev}. ev` : ""}`).join("; ");
  const acilar = h.acilar.slice(0, 12).map((a) => `${G[a.a].ad} ${HVeri.acilar[a.tur].ad} ${G[a.b].ad} (orb ${a.orb}°)`).join("; ");
  const el = Object.entries(h.denge.element).map(([k, v]) => `${Veri.elementler[k].ad} ${v}`).join(", ");
  const ni = Object.entries(h.denge.nitelik).map(([k, v]) => `${k} ${v}`).join(", ");
  const eksen = h.saatBilinir
    ? `Yükselen ${burcAdi(h.yukselen)} ${derece(h.asc)}, Tepe Noktası (MC) ${burcAdi(Astro.signOf(h.mc))} ${derece(h.mc)}. Ev başlangıçları (Placidus): ${h.evler.map((c, i) => `${i + 1}. ev ${burcAdi(Astro.signOf(c))}`).join(", ")}.`
    : "Doğum saati bilinmiyor: yükselen ve evler yok, Ay konumu yaklaşık.";
  return `Gezegenler: ${satir}.\n${eksen}\nÖnemli açılar: ${acilar || "yok"}.\nElement dengesi: ${el}. Nitelik dengesi: ${ni}.`;
}

function sabitYorum(h) {
  const g = h.konumlar.find((k) => k.body === "sun");
  const a = h.konumlar.find((k) => k.body === "moon");
  const el = Veri.elementler[h.denge.baskinElement];
  return {
    baslik: `${burcAdi(g.sign)} Güneşi, ${burcAdi(a.sign)} Ayı`,
    ozet: `Haritanda en güçlü element ${el.ad}. ${el.aciklama}`,
    kisilik: Veri.burclar[g.sign].ozet,
    duygular: Veri.ayBurcunda[a.sign],
    ask: "", kariyer: "", para: "", aile: "", ruhsal: "",
    gucluYanlar: Veri.burclar[g.sign].guclu.slice(0, 3),
    dersler: Veri.burclar[g.sign].golge.slice(0, 2),
    acilar: [],
  };
}

function yorumTemizle(y, h) {
  const dizi = (v, n, u) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => kisalt(x, u)).filter(Boolean);
  const temiz = { baslik: kisalt(y.baslik, 80) || "Doğum haritan", ozet: kisalt(y.ozet, 900) };
  BOLUMLER.forEach(([k]) => { temiz[k] = kisalt(y[k], 1200); });
  temiz.gucluYanlar = dizi(y.gucluYanlar, 5, 220);
  temiz.dersler = dizi(y.dersler, 4, 220);
  // Açı yorumları yalnızca gerçekten haritada olan ilk açılar için kabul edilir.
  temiz.acilar = (Array.isArray(y.acilar) ? y.acilar : []).slice(0, 4).map((x, i) => ({ ...h.acilar[i], yorum: kisalt(x?.yorum || x, 500) }))
    .filter((x) => x.a && x.yorum);
  return temiz;
}

const okunus = (y) => [
  `${y.baslik}.`, y.ozet,
  ...BOLUMLER.filter(([k]) => y[k]).map(([k, ad]) => `${ad}. ${y[k]}`),
  y.gucluYanlar.length ? `Güçlü yanların: ${y.gucluYanlar.join(", ")}.` : "",
  y.dersler.length ? `Hayat derslerin: ${y.dersler.join(", ")}.` : "",
].filter(Boolean).join(" ");

const girdiAnahtari = (g) => crypto.createHash("sha1").update(`${g.tarih}|${g.saatYok ? "" : g.saat}|${g.sehir}`).digest("hex").slice(0, 16);

function createHandler({ dataDir, currentUser, sendFile }) {
  const cfg = setup(dataDir);
  const dizin = path.join(dataDir, "dogum-haritasi");
  const yorumDosyasi = (g) => path.join(dizin, `${girdiAnahtari(g)}.json`);

  async function girdiOku(userId) {
    const kayit = await readCache(kullaniciDosyasi(cfg, userId));
    return kayit?.girdi || null;
  }

  async function derinYorum(girdi) {
    const file = yorumDosyasi(girdi);
    const cached = await readCache(file);
    if (cached) return cached;
    const h = DogumHaritasi.hesapla(girdi);
    if (!llmEnabled) return { yorum: sabitYorum(h), kaynak: "sabit" };
    return once(`derin:${file}`, async () => {
      const acilarIstek = h.acilar.slice(0, 4).map((a) => `"${Veri.gezegenler[a.a].ad} ${HVeri.acilar[a.tur].ad} ${Veri.gezegenler[a.b].ad}" için 2 cümle`).join(", ");
      const kullanici =
        `${haritaMetni(h)}\n\nBu haritayı derinlemesine yorumla. Şu JSON kalıbıyla cevap ver:\n{\n` +
        `  "baslik": "haritayı özetleyen 3-6 kelimelik şiirsel bir başlık",\n  "ozet": "haritanın ana teması, 3-4 cümle",\n` +
        `  "kisilik": "Güneş, yükselen ve 1. ev üzerinden karakter, 4-5 cümle",\n  "duygular": "Ay ve 4. ev, duygusal ihtiyaçlar, 3-4 cümle",\n` +
        `  "ask": "Venüs, Mars, 5. ve 7. ev; aşk ve ilişkiler, 4-5 cümle",\n  "kariyer": "MC, 10. ve 6. ev, Satürn; meslek ve yol, 4-5 cümle",\n` +
        `  "para": "2. ve 8. ev, Jüpiter; değerler ve kaynaklar, 3 cümle",\n  "aile": "4. ev ve Ay; aile ve kökler, 3 cümle",\n` +
        `  "ruhsal": "12. ve 9. ev, Neptün; ruhsal yolculuk, 3-4 cümle",\n  "gucluYanlar": ["güçlü yan", "güçlü yan", "güçlü yan", "güçlü yan"],\n` +
        `  "dersler": ["hayat dersi", "hayat dersi", "hayat dersi"],\n  "acilar": [${h.acilar.length ? `sırayla ${acilarIstek}` : ""}]\n}` +
        (h.saatBilinir ? "" : "\nDoğum saati bilinmediği için evlerden söz etme; burç ve açılara dayan.");
      try {
        const yorum = yorumTemizle(jsonAyikla(await askLlm(SISTEM, kullanici, { maxTokens: 3500, temperature: 0.75 })), h);
        const value = { yorum, kaynak: "ai", tarih: Date.now() };
        await writeCache(file, value);
        return value;
      } catch (error) {
        console.error("Derin harita yorumu üretilemedi:", error.message);
        return { yorum: sabitYorum(h), kaynak: "sabit" };
      }
    });
  }

  return function handleDogumHaritasiRequest(request, response, url) {
    if (!url.pathname.startsWith("/api/dogum-haritasi")) return false;
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Giriş yapmalısınız." });
      return true;
    }
    const routes = {
      "GET /api/dogum-haritasi": async () => {
        const girdi = await girdiOku(user.id);
        const hazir = girdi ? await readCache(yorumDosyasi(girdi)) : null;
        sendJson(response, 200, { girdi, derin: hazir, ses: sesVar(), ai: llmEnabled });
      },
      "POST /api/dogum-haritasi/yorum": async () => {
        const girdi = await girdiOku(user.id);
        if (!girdi) throw hata("Önce doğum bilgilerini gir.", 404);
        sendJson(response, 200, await derinYorum(girdi));
      },
      "GET /api/dogum-haritasi/ses": async () => {
        if (!sesVar()) throw hata("Seslendirme henüz hazır değil.", 503);
        const girdi = await girdiOku(user.id);
        const kayit = girdi ? await readCache(yorumDosyasi(girdi)) : null;
        if (!kayit) throw hata("Önce yorumunu oluştur.", 404);
        sendFile(request, response, await sesDosyasi(okunus(kayit.yorum), dizin, `${girdiAnahtari(girdi)}-ses`));
      },
    };
    const handler = routes[`${request.method} ${url.pathname}`];
    if (!handler) {
      sendJson(response, 404, { error: "Bulunamadı." });
      return true;
    }
    Promise.resolve().then(handler).catch((error) => {
      if (!error.status) console.error("Doğum haritası hatası:", error);
      if (!response.headersSent) sendJson(response, error.status || 500, { error: error.status ? error.message : "Bir sorun oluştu." });
    });
    return true;
  };
}

module.exports = { createHandler };
