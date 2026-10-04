// Ebced sayfası: yazdıkça harf karoları ve toplam canlı görünür; "yorumla" deyince sunucu hesabı doğrular,
// Gemma yorumlar, sonuç (unsurlar, isim burcu, vefk) gösterilir ve deftere kaydedilir.
const { $, el, toast, tarih, sayi, karolar, karo, klavye, unsurCiz, vefkCiz, bindListen, sesAyarla, durdur, gunluk, postJson } = EC;
const { HARFLER, UNSURLAR, cevir, hesapla } = EbcedVeri;

let kayitlar = [];
let acikKayit = null;
let durum = { kalan: 5, sinir: 5 };
let arapcaElle = false;
let anneElle = false;

// --- Canlı hesap ---

function canli() {
  if (!arapcaElle) $("arapca").value = cevir($("metin").value);
  const h = hesapla($("arapca").value);
  karolar($("canliKarolar"), h.harfler, 0.04);
  $("canliToplam").textContent = sayi(h.toplam);
}
$("metin").addEventListener("input", canli);
$("arapca").addEventListener("input", () => { arapcaElle = $("arapca").value.trim() !== "" && $("arapca").value !== cevir($("metin").value); canli(); });
$("anne").addEventListener("input", () => { if (!anneElle) $("anneArapca").value = cevir($("anne").value); });
$("anneArapca").addEventListener("input", () => { anneElle = $("anneArapca").value.trim() !== ""; });
klavye($("klavye"), $("arapca"));

// --- Sonuç ---

function goster(k, kaydir = false) {
  acikKayit = k;
  const h = k.hesap;
  $("sonuc").hidden = false;
  $("sonucUst").textContent = `${k.girdi.metin}${k.girdi.anne ? ` · anne adı ${k.girdi.anne}` : ""} · ${tarih(k.tarih)}`;
  $("sonucArapca").textContent = k.girdi.arapca;
  karolar($("sonucKarolar"), h.harfler, 0.07);
  $("sonucToplam").textContent = sayi(h.toplam);
  $("sonucBilgiler").replaceChildren(
    el("span", { className: "ec-bilgi", textContent: `Küçük ebced: ${h.kucuk}` }),
    el("span", { className: "ec-bilgi", textContent: `Baskın unsur: ${UNSURLAR[h.baskin].ad} (${UNSURLAR[h.baskin].sifat})` }),
    el("span", { className: "ec-bilgi", textContent: `İsim burcu: ${h.burc.ad} · ${h.burc.eski}` }),
    el("span", { className: "ec-bilgi", textContent: `${h.harfler.length} harf` }),
  );
  unsurCiz($("unsurlar"), h.unsur, h.baskin);
  vefkCiz($("vefk"), h.vefk);
  $("vefkNot").replaceChildren("Bu, ", el("b", { textContent: sayi(h.vefk.hedef) }), " sayısının 4×4 vefkidir: her satır, her sütun ve iki köşegen toplamı aynı sayıyı verir. Eski hat ustaları isimlerin vefkini kâğıda çizip saklardı; burada yalnızca bir süs ve tefekkür aracıdır.");
  const y = k.yorum;
  const parca = (bas, metin) => (metin ? [el("h4", { textContent: bas }), el("p", { textContent: metin })] : []);
  $("yorum").replaceChildren(el("h3", { textContent: y.baslik }), el("p", { textContent: y.ozet }),
    ...parca(`${sayi(h.toplam)} sayısının dili`, y.sayininDili), ...parca("Unsur dengen", y.unsurDengesi), ...parca(`İsim burcun: ${h.burc.ad}`, y.burcYorumu), ...parca("Öneri", y.tavsiye));
  bindListen($("dinle"), () => `/api/ebced/ses?id=${k.id}`);
  uzmanKarti.goster();
  renderGunluk();
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "ebced", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

$("ebcedForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const b = $("ebcedSubmit");
  b.disabled = true;
  try {
    const d = await postJson("/api/ebced/yorum", { metin: $("metin").value, arapca: $("arapca").value, anne: $("anne").value, anneArapca: $("anneArapca").value });
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

// --- Tablo ve defter ---

function renderTablo() {
  $("ebcedTablo").replaceChildren(...HARFLER.map((h) => karo(h)), ...Object.keys(EbcedVeri.EK).map((h) => karo({ h })));
}
const renderKota = () => { $("kota").textContent = `Bugün ${durum.kalan} / ${durum.sinir} yorum hakkın kaldı.`; };

function renderGunluk() {
  gunluk({
    liste: $("gunlukListe"), kayitlar, acik: acikKayit?.id, bos: "Henüz bir isim hesaplamadın.",
    baslik: (k) => `${k.girdi.metin} · ${sayi(k.hesap.toplam)} · ${k.yorum.baslik}`,
    alt: (k) => `${tarih(k.tarih)} · ${k.girdi.arapca} · ${k.hesap.burc.ad}`,
    ac: (k) => goster(k, true),
    sil: async (k) => {
      if (!confirm("Bu kayıt defterinden silinsin mi?")) return;
      try {
        await postJson("/api/ebced/sil", { id: k.id });
        kayitlar = kayitlar.filter((x) => x.id !== k.id);
        if (acikKayit?.id === k.id) { acikKayit = null; $("sonuc").hidden = true; durdur(); }
        renderGunluk();
      } catch (error) { toast(error.message); }
    },
  });
}

async function init() {
  EC.yuzenHarfler($("yuzen"));
  renderTablo();
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/ebced")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  // Kendi adını hazır getir: ilk deneme tek tıkla olsun.
  const ilkAd = (me.user.name || "").split(/\s+/)[0];
  if (ilkAd) { $("metin").value = ilkAd; canli(); }
  const d = await fetch("/api/ebced/gunluk", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
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
