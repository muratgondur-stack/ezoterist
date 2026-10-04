// Cifir sayfası: ad, anne adı ve soru harflere ayrılır; sunucu toplamı tarh eder, Gemma yorumlar. Sonuç adım adım
// (harfler → toplam → tarh → cevap harfleri → vefk → yorum) gösterilir ve deftere kaydedilir.
const { $, el, toast, tarih, sayi, karo, vefkCiz, bindListen, sesAyarla, durdur, gunluk, postJson } = EC;
const { UNSURLAR, cevir } = EbcedVeri;

let kayitlar = [];
let acikKayit = null;
let durum = { kalan: 3, sinir: 3 };
const elle = {};

// Arapça yazılışlar otomatik dolar; kullanıcı değiştirirse ona dokunulmaz.
[["isim", "isimArapca"], ["anne", "anneArapca"], ["soru", "soruArapca"]].forEach(([kaynak, hedef]) => {
  $(kaynak).addEventListener("input", () => { if (!elle[hedef]) $(hedef).value = cevir($(kaynak).value); });
  $(hedef).addEventListener("input", () => { elle[hedef] = $(hedef).value.trim() !== ""; });
});

function adim(baslik, ...icerik) {
  return el("div", { className: "cf-adim" }, el("h4", { textContent: baslik }), ...icerik);
}

function goster(k, kaydir = false) {
  window.yorumcuGoster?.(k); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
  acikKayit = k;
  const h = k.hesap;
  $("sonuc").hidden = false;
  $("sonucUst").textContent = `${k.girdi.isim}${k.girdi.anne ? ` · anne adı ${k.girdi.anne}` : ""} · ${tarih(k.tarih)}`;
  $("sonucSoru").textContent = `“${k.girdi.soru}”`;
  const parca = (ad, p) => el("div", { className: "cf-parca" }, el("span", { textContent: ad }), el("span", { className: "ar", textContent: p.arapca || "—" }), el("b", { textContent: sayi(p.toplam) }));
  const cevap = el("div", { className: "cf-cevap" }, ...h.cevapHarfleri.map((x, i) => karo(x, el("span", { className: "anahtar", textContent: x.anahtar.join(" · ") }), 0.3 + i * 0.25)));
  const vefk = el("div", { className: "ec-vefk" });
  vefkCiz(vefk, h.vefk);
  const adimlar = [
    adim("Harflere ayırma ve ebced değerleri", parca("Adın", h.parcalar.isim), ...(k.girdi.anne ? [parca("Annenin adı", h.parcalar.anne)] : []), parca("Sorun", h.parcalar.soru)),
    adim("Cifir toplamı", el("div", { className: "ec-toplam" }, el("small", { textContent: "Sorunun mührü" }), el("b", { textContent: sayi(h.toplam) }))),
    adim("Tarh (bölüp kalanı alma)", el("div", { className: "cf-tarh" },
      el("div", {}, el("small", { textContent: "28'e tarh → cevap harfi" }), el("b", { textContent: `${h.toplam % 28 || 28} · ${h.cevapHarfleri[0].ad}` })),
      el("div", {}, el("small", { textContent: "12'ye tarh → burç" }), el("b", { textContent: `${h.toplam % 12 || 12} · ${h.burc.ad}` })),
      el("div", {}, el("small", { textContent: "7'ye tarh → gezegen" }), el("b", { textContent: `${h.gezegen.ad} · ${h.gezegen.gun}` })),
      el("div", {}, el("small", { textContent: "4'e tarh → unsur" }), el("b", { textContent: UNSURLAR[h.unsur].ad })),
      el("div", {}, el("small", { textContent: "3'e tarh → eğilim" }), el("b", { textContent: `${h.egilim.ikon} ${h.egilim.ad}` })))),
    adim("Cevap harfleri", cevap, el("div", { className: "cf-egilim" }, el("span", { textContent: h.egilim.ikon }), el("div", {}, el("b", { textContent: h.egilim.ad }), el("small", { textContent: h.egilim.anahtar })))),
    adim("Vefk", el("div", { className: "ec-vefk-kutu" }, vefk, el("p", { className: "ec-vefk-not" }, "Sorunun toplamı ", el("b", { textContent: sayi(h.vefk.hedef) }), " bu 4×4 vefke yerleşti: her satır, sütun ve köşegen aynı sayıyı verir."))),
  ];
  adimlar.forEach((a, i) => { a.style.animationDelay = `${i * 0.35}s`; });
  $("adimlar").replaceChildren(...adimlar);
  const y = k.yorum;
  const bolum = (bas, metin) => (metin ? [el("h4", { textContent: bas }), el("p", { textContent: metin })] : []);
  $("yorum").replaceChildren(el("h3", { textContent: y.baslik }), el("p", { textContent: y.ozet }),
    ...bolum("Harflerin dili", y.harflerinDili), ...bolum("Zamanlama", y.zaman), ...bolum("Öneri", y.tavsiye));
  bindListen($("dinle"), () => `/api/cifir/ses?id=${k.id}`);
  uzmanKarti.goster();
  renderGunluk();
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "cifir", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

$("cifirForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const b = $("cifirSubmit");
  b.disabled = true;
  try {
    const govde = Object.fromEntries(["isim", "anne", "soru", "isimArapca", "anneArapca", "soruArapca"].map((id) => [id, $(id).value]));
    const d = await postJson("/api/cifir/yorum", govde);
    kayitlar.unshift(d.kayit);
    durum.kalan = d.kalan;
    renderKota();
    goster(d.kayit, true);
  } catch (error) {
    toast(error.message);
  } finally {
    b.disabled = false;
  }
});

const renderKota = () => { $("kota").textContent = `Bugün ${durum.kalan} / ${durum.sinir} soru hakkın kaldı.`; };

function renderGunluk() {
  gunluk({
    liste: $("gunlukListe"), kayitlar, acik: acikKayit?.id, bos: "Henüz bir soru açmadın.",
    baslik: (k) => `${k.hesap.egilim.ikon} ${k.girdi.soru}`,
    alt: (k) => `${tarih(k.tarih)} · ${sayi(k.hesap.toplam)} · ${k.yorum.baslik}`,
    ac: (k) => goster(k, true),
    sil: async (k) => {
      if (!confirm("Bu kayıt defterinden silinsin mi?")) return;
      try {
        await postJson("/api/cifir/sil", { id: k.id });
        kayitlar = kayitlar.filter((x) => x.id !== k.id);
        if (acikKayit?.id === k.id) { acikKayit = null; $("sonuc").hidden = true; durdur(); }
        renderGunluk();
      } catch (error) { toast(error.message); }
    },
  });
}

async function init() {
  EC.yuzenHarfler($("yuzen"));
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/cifir")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const ilkAd = (me.user.name || "").split(/\s+/)[0];
  if (ilkAd) { $("isim").value = ilkAd; $("isim").dispatchEvent(new Event("input")); }
  const d = await fetch("/api/cifir/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (d) {
    kayitlar = d.kayitlar;
    durum = { kalan: d.kalan, sinir: d.sinir };
    sesAyarla(d.ses);
  }
  renderKota();
  await uzmanKarti.yukle();
  renderGunluk();
  if (kayitlar.length && location.hash === "#gunluk") goster(kayitlar[0], true);
}
init();
