(() => {
  const { renkler, cakralar, ipuclari } = FotografAnalizVeri;
  const $ = (id) => document.getElementById(id);
  const buyuk = (s) => (s ? s[0].toLocaleUpperCase("tr-TR") + s.slice(1) : "");
  const renkKodu = (r) => r.hex || (renkler.find((x) => r.renk.toLocaleLowerCase("tr-TR").includes(x.ad.toLocaleLowerCase("tr-TR"))) || {}).kod || "#888";

  function kalemler(el, items, ad, anlam, oncesi) {
    el.replaceChildren(...items.map((x) => {
      const li = document.createElement("li");
      li.innerHTML = "<b></b><p></p>";
      if (oncesi) li.querySelector("b").prepend(oncesi(x));
      li.querySelector("b").append(ad(x));
      li.querySelector("p").textContent = anlam(x);
      return li;
    }));
  }

  const nokta = (renk) => {
    const span = document.createElement("span");
    span.className = "swatch";
    span.style.background = renk;
    return span;
  };

  function ciz(f) {
    $("resultSeen").textContent = f.gorulen;
    $("resultPalette").replaceChildren(...f.renkler.map((r) => nokta(renkKodu(r))));
    $("resultMood").textContent = f.ruhHali;
    kalemler($("resultColors"), f.renkler, (r) => r.renk, (r) => r.anlam, (r) => nokta(renkKodu(r)));
    $("symbolsCard").hidden = !f.semboller.length;
    kalemler($("resultSymbols"), f.semboller, (s) => s.sembol, (s) => s.anlam);
    const cakra = cakralar.find(([ad]) => ad.toLocaleLowerCase("tr-TR").includes(f.cakra));
    $("resultChakraTitle").textContent = f.cakra ? `🪷 ${buyuk(f.cakra)} çakrası` : "🪷 Çakra";
    $("resultChakra").textContent = f.cakraYorum || (cakra ? cakra[2] : "—");
    $("resultMessage").textContent = f.mesaj || "—";
    $("wishCard").hidden = !f.soru;
    $("resultWish").textContent = f.soru;
    $("resultAdvice").textContent = f.tavsiye ? `“${f.tavsiye}”` : "";
  }

  $("tips").replaceChildren(...ipuclari.map((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${i + 1}</b><span></span>`;
    li.querySelector("span").textContent = t;
    return li;
  }));
  kalemler($("colors"), renkler, (r) => r.ad, (r) => r.anlam, (r) => nokta(r.kod));
  kalemler($("chakras"), cakralar, ([ad, renk]) => `${ad} · ${renk}`, ([, , anlam]) => anlam);

  FotoSayfa({
    api: "/api/fotograf-analizi/",
    bolum: "fotograf-analizi",
    sayfaYolu: "/fotograf-analizi",
    yuva: { ad: "Fotoğrafın", ipucu: "Galeriden ya da kameradan", ikon: "📷" },
    metinler: {
      musaitDegil: "Enerji okuyucumuz şu an müsait değil, biraz sonra tekrar dene.",
      sinir: "Bugünkü 3 fotoğraf analizi hakkını kullandın. Yarın yeniden bekleriz.",
      bekleniyor: "✨ Fotoğrafının enerjisi okunuyor…",
      bosGunluk: "Henüz bir analizin yok. Fotoğrafını yukarıda yükle.",
    },
    ciz,
    ozet: (f) => f.gorulen || f.ruhHali,
  });
})();
