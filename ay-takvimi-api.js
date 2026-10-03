// Ay takvimi: gökyüzü hesabı tarayıcıda yapılır; sunucu kişiye özel "Ay döngüsü rehberi" (her Yeni Ay–Yeni Ay döngüsü
// için bir kez, kişinin doğum haritasına göre) ve niyet defterini tutar.
const crypto = require("node:crypto");
const path = require("node:path");
const Astro = require("./astro");
const AyVeri = require("./ay-takvimi-veri");
const { yardimci } = require("./astroloji-api");

const { sendJson, readJson, readCache, writeCache, sesDosyasi, sesVar, kullaniciDosyasi, setup, Veri, askLlm, once, llmEnabled } = yardimci;

const NIYET_SINIRI = 10; // bir döngüde en fazla niyet
const hata = (message, status = 400) => Object.assign(new Error(message), { status });
const kisalt = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
const burcAdi = (k) => Veri.burclar[k].ad;
const gunAdi = (d) => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(d);
const gunKodu = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const SISTEM =
  "Sen Ezoter.ist'in Ay döngüsü rehberisin. Yeni Ay ve Dolunay'ın burçlarını kişinin doğum haritasıyla birleştirip ona özel bir niyet ve bırakma rehberi yazarsın. " +
  "Türkçe, sıcak, sakin ve güçlendirici yaz; kişiye 'sen' diye hitap et; metin sesli okunacak. Kesin kehanette bulunma; sağlık, hukuk ve para konusunda kesin tavsiye verme. " +
  "Sana verilen gökyüzü bilgilerine sadık kal. Cevabını YALNIZCA geçerli JSON olarak ver, başka hiçbir şey yazma.";

function jsonAyikla(metin) {
  const bas = metin.indexOf("{");
  const son = metin.lastIndexOf("}");
  if (bas === -1 || son <= bas) throw new Error("Yorum JSON değil");
  return JSON.parse(metin.slice(bas, son + 1).replace(/[  -​ 　﻿]/g, " ").replace(/,\s*([}\]])/g, "$1"));
}

// İçinde bulunulan döngü: son Yeni Ay, ardından gelen Dolunay ve sonraki Yeni Ay.
function dongu(simdi = new Date()) {
  let yeniAy = Astro.nextPhase(new Date(simdi.getTime() - 31 * 86400000), 0);
  for (;;) {
    const sonraki = Astro.nextPhase(new Date(yeniAy.getTime() + 86400000), 0);
    if (sonraki > simdi) {
      const dolunay = Astro.nextPhase(new Date(yeniAy.getTime() + 86400000), 180);
      const burcu = (d) => Astro.signOf(Astro.moonLongitude(Astro.julianDay(d)));
      return { kod: gunKodu(yeniAy), yeniAy, dolunay, sonrakiYeniAy: sonraki, yeniAyBurcu: burcu(yeniAy), dolunayBurcu: burcu(dolunay) };
    }
    yeniAy = sonraki;
  }
}

function sabitRehber(d) {
  return {
    baslik: `${burcAdi(d.yeniAyBurcu)} Yeni Ay'ı`,
    yeniAy: `Bu döngü ${burcAdi(d.yeniAyBurcu)} burcundaki Yeni Ay ile başladı: ${AyVeri.yeniAyTemasi[d.yeniAyBurcu]} için niyet zamanı.`,
    niyetOnerileri: [],
    dolunay: `${burcAdi(d.dolunayBurcu)} Dolunayı ${AyVeri.yeniAyTemasi[d.dolunayBurcu]} konusunda farkındalık getirir; tamamlananı kutla, ağırlık yapanı bırak.`,
    birakilacaklar: [],
    rituel: [AyVeri.evreler[0].oneri, AyVeri.evreler[4].oneri],
    olumlama: "Her döngüde biraz daha kendime yaklaşıyorum.",
  };
}

function rehberTemizle(y) {
  const dizi = (v, n) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => kisalt(x, 240)).filter(Boolean);
  return {
    baslik: kisalt(y.baslik, 80) || "Ay döngün",
    yeniAy: kisalt(y.yeniAy, 900),
    niyetOnerileri: dizi(y.niyetOnerileri, 4),
    dolunay: kisalt(y.dolunay, 900),
    birakilacaklar: dizi(y.birakilacaklar, 3),
    rituel: dizi(y.rituel, 5),
    olumlama: kisalt(y.olumlama, 200),
  };
}

const okunus = (r) => {
  const y = r.rehber;
  return [
    `${y.baslik}.`, y.yeniAy,
    y.niyetOnerileri.length ? `Niyet önerilerin: ${y.niyetOnerileri.join(" ")}` : "",
    y.dolunay,
    y.birakilacaklar.length ? `Dolunayda bırakabileceklerin: ${y.birakilacaklar.join(" ")}` : "",
    y.rituel.length ? `Küçük ritüelin: ${y.rituel.join(" ")}` : "",
    y.olumlama ? `Olumlaman: ${y.olumlama}` : "",
  ].filter(Boolean).join(" ");
};

const kullaniciDizini = (dataDir, userId) => path.join(dataDir, "ay-takvimi", String(userId).replace(/[^a-zA-Z0-9-]/g, ""));
const rehberDosyasi = (dataDir, userId, kod) => path.join(kullaniciDizini(dataDir, userId), `rehber-${kod}.json`);
const niyetDosyasi = (dataDir, userId) => path.join(kullaniciDizini(dataDir, userId), "niyetler.json");

// Uzman yorumu için (uzman-api.js kullanır): içinde bulunulan döngünün rehberi ve niyetleri.
async function ayKaydiOku(dataDir, userId) {
  const d = dongu();
  const r = await readCache(rehberDosyasi(dataDir, userId, d.kod));
  if (!r) return null;
  const niyetler = ((await readCache(niyetDosyasi(dataDir, userId))) || []).filter((n) => n.ay === d.kod);
  return { ...r, niyetler, metin: okunus(r) };
}

function createHandler({ dataDir, currentUser, sendFile }) {
  const cfg = setup(dataDir);
  const kuyruk = new Map();
  function niyetGuncelle(userId, fn) {
    const is = (kuyruk.get(userId) || Promise.resolve()).then(async () => {
      const liste = (await readCache(niyetDosyasi(dataDir, userId))) || [];
      const sonuc = fn(liste);
      await writeCache(niyetDosyasi(dataDir, userId), liste);
      return sonuc;
    });
    kuyruk.set(userId, is.catch(() => {}));
    return is;
  }

  async function rehberUret(user) {
    const d = dongu();
    const file = rehberDosyasi(dataDir, user.id, d.kod);
    const hazir = await readCache(file);
    if (hazir) return hazir;
    return once(`ay:${user.id}:${d.kod}`, async () => {
      const harita = await readCache(kullaniciDosyasi(cfg, user.id));
      let rehber = sabitRehber(d);
      let kaynak = "sabit";
      if (llmEnabled) {
        const kisi = harita?.yerlesim
          ? `Kişinin doğum haritası: Güneş ${burcAdi(harita.yerlesim.sun)}, Ay ${burcAdi(harita.yerlesim.moon)}, Venüs ${burcAdi(harita.yerlesim.venus)}, Mars ${burcAdi(harita.yerlesim.mars)}${harita.yukselen ? `, yükselen ${burcAdi(harita.yukselen)}` : ""}.`
          : "Kişinin doğum haritası bilinmiyor; genel ama sıcak yaz.";
        const kullanici =
          `Döngü: Yeni Ay ${gunAdi(d.yeniAy)} tarihinde ${burcAdi(d.yeniAyBurcu)} burcunda (tema: ${AyVeri.yeniAyTemasi[d.yeniAyBurcu]}). ` +
          `Dolunay ${gunAdi(d.dolunay)} tarihinde ${burcAdi(d.dolunayBurcu)} burcunda. Sonraki Yeni Ay ${gunAdi(d.sonrakiYeniAy)}.\n${kisi}\n` +
          `Şu JSON kalıbıyla cevap ver:\n{\n  "baslik": "döngüye 3-6 kelimelik şiirsel bir ad",\n` +
          `  "yeniAy": "bu Yeni Ay'ın kişiye özel niyet teması, haritasıyla bağlantılı 3-4 cümle",\n` +
          `  "niyetOnerileri": ["şimdiki zamanla yazılmış kısa niyet cümlesi", "niyet", "niyet"],\n` +
          `  "dolunay": "Dolunay'da kişiyi bekleyen farkındalık ve hasat, 3 cümle",\n` +
          `  "birakilacaklar": ["Dolunay'da bırakılabilecek bir alışkanlık ya da duygu", "bir şey daha"],\n` +
          `  "rituel": ["evde yapılabilecek basit ritüel adımı", "adım", "adım"],\n  "olumlama": "birinci tekil şahısla kısa olumlama"\n}`;
        try {
          rehber = rehberTemizle(jsonAyikla(await askLlm(SISTEM, kullanici, { maxTokens: 1600, temperature: 0.8 })));
          kaynak = "ai";
        } catch (error) {
          console.error("Ay rehberi üretilemedi:", error.message);
        }
      }
      const value = { kod: d.kod, tarih: Date.now(), yeniAyBurcu: d.yeniAyBurcu, dolunayBurcu: d.dolunayBurcu, rehber, kaynak };
      if (kaynak === "ai" || !llmEnabled) await writeCache(file, value);
      return value;
    });
  }

  return function handleAyRequest(request, response, url) {
    if (!url.pathname.startsWith("/api/ay/")) return false;
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Giriş yapmalısınız." });
      return true;
    }
    const routes = {
      "GET /api/ay/durum": async () => {
        const d = dongu();
        const harita = await readCache(kullaniciDosyasi(cfg, user.id));
        sendJson(response, 200, {
          dongu: { kod: d.kod, yeniAy: d.yeniAy, dolunay: d.dolunay, sonrakiYeniAy: d.sonrakiYeniAy },
          rehber: await readCache(rehberDosyasi(dataDir, user.id, d.kod)),
          niyetler: (await readCache(niyetDosyasi(dataDir, user.id))) || [],
          dogum: harita?.girdi || null, ses: sesVar(), ai: llmEnabled,
        });
      },
      "POST /api/ay/rehber": async () => sendJson(response, 200, await rehberUret(user)),
      "GET /api/ay/ses": async () => {
        if (!sesVar()) throw hata("Seslendirme henüz hazır değil.", 503);
        const r = await readCache(rehberDosyasi(dataDir, user.id, dongu().kod));
        if (!r) throw hata("Önce rehberini oluştur.", 404);
        sendFile(request, response, await sesDosyasi(okunus(r), kullaniciDizini(dataDir, user.id), `rehber-${r.kod}-ses`));
      },
      "POST /api/ay/niyet": async () => {
        const body = await readJson(request);
        const metin = kisalt(body?.metin, 300);
        if (metin.length < 3) throw hata("Niyetini birkaç kelimeyle yaz.");
        const kod = dongu().kod;
        const niyet = await niyetGuncelle(user.id, (liste) => {
          if (liste.filter((n) => n.ay === kod).length >= NIYET_SINIRI) throw hata(`Bu döngüde en fazla ${NIYET_SINIRI} niyet yazabilirsin; az ama öz niyet daha güçlüdür.`);
          const n = { id: crypto.randomBytes(6).toString("hex"), tarih: Date.now(), ay: kod, metin, durum: "bekliyor" };
          liste.unshift(n);
          liste.splice(300);
          return n;
        });
        sendJson(response, 201, { niyet });
      },
      "POST /api/ay/niyet-durum": async () => {
        const body = await readJson(request);
        const id = String(body?.id || "").replace(/[^0-9a-f]/g, "");
        const durum = ["bekliyor", "gerceklesti", "birakildi"].includes(body?.durum) ? body.durum : "bekliyor";
        await niyetGuncelle(user.id, (liste) => { const n = liste.find((x) => x.id === id); if (n) n.durum = durum; });
        sendJson(response, 200, { ok: true });
      },
      "POST /api/ay/niyet-sil": async () => {
        const body = await readJson(request);
        const id = String(body?.id || "").replace(/[^0-9a-f]/g, "");
        await niyetGuncelle(user.id, (liste) => { const i = liste.findIndex((x) => x.id === id); if (i !== -1) liste.splice(i, 1); });
        sendJson(response, 200, { ok: true });
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
        if (status === 500) console.error("Ay takvimi:", error);
        sendJson(response, status, { error: status === 500 ? "Bir sorun oluştu. Lütfen tekrar deneyin." : error.message });
      });
    return true;
  };
}

module.exports = { createHandler, ayKaydiOku };
