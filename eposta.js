/**
 * E-posta gönderimi: Cloudflare Email Service SMTP relay (quiz.ist ile aynı yöntem).
 *
 * Hat: smtp.mx.cloudflare.net:465 (implicit TLS), kullanıcı adı sabit "api_token",
 * parola EPOSTA_TOKEN (Email Sending: Edit yetkili Cloudflare API tokenı).
 * Gönderen alan adı ezoter.ist; SPF/DKIM/DMARC kayıtları Cloudflare'de kurulu olmalı.
 *
 * Kendi küçük SMTP istemcimiz: bağımlılık eklemeden. Türkçe karakterler için gövde base64 UTF-8.
 */
const tls = require("node:tls");
const crypto = require("node:crypto");

const SUNUCU = "smtp.mx.cloudflare.net";
const PORT = 465;
const VARSAYILAN_GONDEREN = "Ezoter.ist <bilgi@ezoter.ist>";

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const satirla = (s) => (s.match(/.{1,76}/g) || []).join("\r\n");

/** Tek bir mail gönderir. Başarılıysa message-id döner, değilse hata fırlatır. */
function smtpGonder(istek, token) {
  const gonderen = istek.gonderen || VARSAYILAN_GONDEREN;
  const adres = gonderen.match(/<([^>]+)>/)?.[1] || gonderen;
  const sinir = `e${crypto.randomBytes(12).toString("hex")}`;
  const govde = istek.html
    ? [
        `Content-Type: multipart/alternative; boundary="${sinir}"`, "",
        `--${sinir}`, "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "",
        satirla(b64(istek.metin)), "",
        `--${sinir}`, "Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: base64", "",
        satirla(b64(istek.html)), "",
        `--${sinir}--`, "",
      ].join("\r\n")
    : ["Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", satirla(b64(istek.metin)), ""].join("\r\n");

  const basliklar = [
    `From: ${gonderen}`,
    `To: ${istek.kime}`,
    `Subject: =?UTF-8?B?${b64(istek.konu)}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${adres.split("@")[1] || "ezoter.ist"}>`,
    "MIME-Version: 1.0",
  ].join("\r\n");
  const mail = `${basliklar}\r\n${govde}`.replace(/\r?\n\./g, "\r\n.."); // nokta kaçışı

  return new Promise((tamam, hata) => {
    const soket = tls.connect({ host: SUNUCU, port: PORT, servername: SUNUCU });
    soket.setTimeout(20_000);
    let tampon = "";
    let adim = 0;
    let mesajId = "";
    const adimlar = [
      { bekle: 220 },
      { komut: "EHLO ezoter.ist", bekle: 250 },
      { komut: `AUTH PLAIN ${Buffer.from(`\0api_token\0${token}`, "utf8").toString("base64")}`, bekle: 235 },
      { komut: `MAIL FROM:<${adres}>`, bekle: 250 },
      { komut: `RCPT TO:<${istek.kime}>`, bekle: 250 },
      { komut: "DATA", bekle: 354 },
      { komut: `${mail}\r\n.`, bekle: 250 },
      { komut: "QUIT", bekle: 221 },
    ];
    let bitti = false;
    const bitir = (e) => {
      if (bitti) return;
      bitti = true;
      soket.destroy();
      if (e) hata(e);
      else tamam(mesajId);
    };
    soket.on("error", (e) => bitir(e instanceof Error ? e : new Error(String(e))));
    soket.on("timeout", () => bitir(new Error("SMTP zaman aşımı")));
    soket.on("data", (parca) => {
      tampon += parca.toString("utf8");
      // Çok satırlı yanıt: son satır "250 " gibi boşlukla ayrılmış olmalı.
      const satirlar = tampon.split("\r\n").filter(Boolean);
      const son = satirlar[satirlar.length - 1] || "";
      if (!/^\d{3} /.test(son)) return;
      tampon = "";
      const kod = Number(son.slice(0, 3));
      if (kod !== adimlar[adim].bekle) return bitir(new Error(`SMTP ${son.slice(0, 120)}`));
      if (adim === 6) mesajId = son.match(/<([^>]+)>/)?.[1] || "";
      adim += 1;
      const sonraki = adimlar[adim];
      if (!sonraki) return bitir();
      soket.write(`${sonraki.komut}\r\n`);
    });
  });
}

const htmlKacis = (deger) =>
  String(deger).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Ortak şablon: başlık + gövde + alt bilgi. */
function epostaSablon(baslik, govde, dugme) {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#f5f4ef;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#0b1020;color:#fff;border-radius:14px 14px 0 0;padding:18px 22px;border-bottom:3px solid #ff7a00">
      <div style="font-size:22px;font-weight:800;letter-spacing:.5px">Ezoter.ist</div>
      <div style="font-size:11px;letter-spacing:2px;opacity:.75;text-transform:uppercase">Ezoterik Bilgelik · Kendini Keşfet</div>
    </div>
    <div style="background:#fff;border:1px solid #e3e0d8;border-top:0;border-radius:0 0 14px 14px;padding:22px">
      <h1 style="margin:0 0 12px;font-size:18px;color:#0b1020">${baslik}</h1>
      <div style="font-size:14px;line-height:1.6;color:#2b2b2b">${govde}</div>
      ${dugme ? `<p style="margin:22px 0 4px"><a href="${dugme.url}" style="display:inline-block;background:#ff7a00;color:#fff;text-decoration:none;padding:11px 20px;border-radius:9px;font-weight:700">${dugme.yazi}</a></p>` : ""}
    </div>
    <p style="margin:14px 2px 0;font-size:11px;color:#8a8578">Bu ileti ezoter.ist hesabına kayıtlı adrese gönderildi.</p>
  </div></body></html>`;
}

/**
 * Gönderir; hata fırlatmaz, başarıyı true/false döner.
 * EPOSTA_TOKEN yoksa üretimde gönderim yapılamaz; geliştirmede ileti loga yazılır.
 */
async function epostaYolla({ kime, konu, metin, html }) {
  const adres = String(kime || "").trim();
  if (!adres || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adres)) return false;

  const token = String(process.env.EPOSTA_TOKEN || "").trim();
  if (!token) {
    if (process.env.NODE_ENV === "production") {
      console.error("EPOSTA_TOKEN tanımlı değil; e-posta gönderilemedi.");
      return false;
    }
    console.log(`[e-posta: geliştirme] Kime: ${adres}\nKonu: ${konu}\n${metin}`);
    return true;
  }

  const gonderen = String(process.env.EPOSTA_GONDEREN || "").trim() || VARSAYILAN_GONDEREN;
  try {
    await smtpGonder({ kime: adres, konu, metin, html, gonderen }, token);
    return true;
  } catch (error) {
    console.error(`E-posta gönderilemedi (${adres}):`, error.message);
    return false;
  }
}

module.exports = { epostaYolla, epostaSablon, htmlKacis, smtpGonder };
