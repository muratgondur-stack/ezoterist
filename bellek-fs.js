// Ziyaretçi verisi diske yazılmaz (Murat 2026-10-07: "hiç saklama yok").
// Bölümler kayıtlarını kullanıcı kimliğiyle adlandırılan dosyalara yazar; ziyaretçinin kimliği "z-<16 hex>" olduğu
// için yolunda bu parça geçen her dosya işlemi buradaki bellek içi dosya sistemine yönlenir. Böylece bölüm kodu
// değişmeden çalışır (yorumu yazıp sesini/resmini aynı sayfada göstermek gibi çok adımlı akışlar dahil), ama hiçbir
// şey diske düşmez. Ziyaretçi sayfadan ayrılınca (BOSTA_SURE işlem olmazsa) bellekteki her şeyi silinir; sunucu
// yeniden başlarsa zaten hepsi gider.
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");

const ZIYARETCI = /(?:^|[\\/])(z-[a-f0-9]{16})(?=[.\\/]|$)/;
const BOSTA_SURE = 20 * 60 * 1000;
const UST_SINIR = 400 * 1024 * 1024; // bellekte en fazla bu kadar; aşılırsa en eski ziyaretçi silinir

const dosyalar = new Map(); // yol -> { veri: Buffer, mtime: Date }
const sonIslem = new Map(); // ziyaretçi -> zaman

const ziyaretci = (p) => (typeof p === "string" ? ZIYARETCI.exec(p)?.[1] : null) || null;
const norm = (p) => path.resolve(String(p));
const yok = (p) => Object.assign(new Error(`ENOENT: no such file or directory, '${p}'`), { code: "ENOENT", errno: -2, path: p });
const dokun = (p) => sonIslem.set(ziyaretci(p), Date.now());

function ziyaretciSil(z) {
  for (const k of dosyalar.keys()) if (ziyaretci(k) === z) dosyalar.delete(k);
  sonIslem.delete(z);
}

function toplamBoyut() {
  let t = 0;
  for (const d of dosyalar.values()) t += d.veri.length;
  return t;
}

function yaz(p, veri) {
  dokun(p);
  dosyalar.set(norm(p), { veri: Buffer.isBuffer(veri) ? veri : Buffer.from(veri instanceof Uint8Array ? veri : String(veri)), mtime: new Date() });
  while (toplamBoyut() > UST_SINIR && sonIslem.size > 1) {
    const enEski = [...sonIslem.entries()].sort((a, b) => a[1] - b[1])[0][0];
    ziyaretciSil(enEski);
  }
}

function dizinMi(p) {
  const on = norm(p) + path.sep;
  for (const k of dosyalar.keys()) if (k.startsWith(on)) return true;
  return false;
}

function sahteStat(p) {
  const d = dosyalar.get(norm(p));
  if (d) return { isFile: () => true, isDirectory: () => false, size: d.veri.length, mtime: d.mtime, mtimeMs: d.mtime.getTime() };
  if (dizinMi(p)) { const t = new Date(); return { isFile: () => false, isDirectory: () => true, size: 0, mtime: t, mtimeMs: t.getTime() }; }
  return null;
}

function sil(p) {
  const n = norm(p);
  const on = n + path.sep;
  for (const k of [...dosyalar.keys()]) if (k === n || k.startsWith(on)) dosyalar.delete(k);
}

const P = fs.promises;
const asil = {
  readFile: P.readFile, writeFile: P.writeFile, mkdir: P.mkdir, rename: P.rename, rm: P.rm, unlink: P.unlink,
  stat: P.stat, readdir: P.readdir, stat_: fs.stat, createReadStream: fs.createReadStream, existsSync: fs.existsSync,
};

P.readFile = async function (p, sec, ...r) {
  if (!ziyaretci(p)) return asil.readFile.call(this, p, sec, ...r);
  dokun(p);
  const d = dosyalar.get(norm(p));
  if (!d) throw yok(p);
  const enc = typeof sec === "string" ? sec : sec?.encoding;
  return enc ? d.veri.toString(enc) : Buffer.from(d.veri);
};
P.writeFile = async function (p, veri, ...r) {
  if (!ziyaretci(p)) return asil.writeFile.call(this, p, veri, ...r);
  yaz(p, veri);
};
P.mkdir = async function (p, ...r) {
  if (!ziyaretci(p)) return asil.mkdir.call(this, p, ...r);
  return undefined;
};
P.rename = async function (a, b) {
  const za = ziyaretci(a), zb = ziyaretci(b);
  if (!za && !zb) return asil.rename.call(this, a, b);
  let veri;
  if (za) {
    const d = dosyalar.get(norm(a));
    if (!d) throw yok(a);
    veri = d.veri;
    dosyalar.delete(norm(a));
  } else {
    veri = await asil.readFile(a);
    await asil.rm(a, { force: true });
  }
  if (zb) yaz(b, veri);
  else await asil.writeFile(b, veri);
};
P.rm = async function (p, sec, ...r) {
  if (!ziyaretci(p)) return asil.rm.call(this, p, sec, ...r);
  if (!sahteStat(p) && !sec?.force) throw yok(p);
  sil(p);
};
P.unlink = async function (p, ...r) {
  if (!ziyaretci(p)) return asil.unlink.call(this, p, ...r);
  if (!dosyalar.has(norm(p))) throw yok(p);
  sil(p);
};
P.stat = async function (p, ...r) {
  if (!ziyaretci(p)) return asil.stat.call(this, p, ...r);
  const s = sahteStat(p);
  if (!s) throw yok(p);
  return s;
};
P.readdir = async function (p, sec, ...r) {
  if (!ziyaretci(p)) return asil.readdir.call(this, p, sec, ...r);
  const on = norm(p) + path.sep;
  const adlar = new Map();
  for (const k of dosyalar.keys()) {
    if (!k.startsWith(on)) continue;
    const kalan = k.slice(on.length);
    const ad = kalan.split(path.sep)[0];
    adlar.set(ad, adlar.get(ad) || kalan.includes(path.sep));
  }
  if (!adlar.size) throw yok(p);
  if (!sec?.withFileTypes) return [...adlar.keys()];
  return [...adlar.entries()].map(([name, dizin]) => ({ name, isFile: () => !dizin, isDirectory: () => dizin }));
};
fs.stat = function (p, ...r) {
  if (!ziyaretci(p)) return asil.stat_.call(this, p, ...r);
  const cb = r[r.length - 1];
  const s = sahteStat(p);
  process.nextTick(() => (s ? cb(null, s) : cb(yok(p))));
};
fs.createReadStream = function (p, sec, ...r) {
  if (!ziyaretci(p)) return asil.createReadStream.call(this, p, sec, ...r);
  dokun(p);
  const d = dosyalar.get(norm(p));
  if (!d) return new Readable({ read() { this.destroy(yok(p)); } });
  const bas = sec?.start ?? 0;
  const son = sec?.end ?? d.veri.length - 1;
  return Readable.from([d.veri.subarray(bas, son + 1)]);
};
fs.existsSync = function (p) {
  if (!ziyaretci(p)) return asil.existsSync.call(this, p);
  return Boolean(sahteStat(p));
};

setInterval(() => {
  const sinir = Date.now() - BOSTA_SURE;
  for (const [z, t] of [...sonIslem.entries()]) if (t < sinir) ziyaretciSil(z);
}, 60 * 1000).unref();

module.exports = { durum: () => ({ ziyaretci: sonIslem.size, dosya: dosyalar.size, bayt: toplamBoyut() }) };
