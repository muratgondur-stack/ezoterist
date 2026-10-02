(() => {
  const { elementler, bolgeler, ipuclari } = YuzOkumaVeri;
  const $ = (id) => document.getElementById(id);
  const buyuk = (s) => (s ? s[0].toLocaleUpperCase("tr-TR") + s.slice(1) : "");
  const liste = (el, items) => el.replaceChildren(...items.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));

  function ciz(f) {
    const ikon = (elementler.find(([ad]) => ad.toLocaleLowerCase("tr-TR") === f.element) || [])[1] || "";
    $("resultBadges").replaceChildren(...[f.yuzSekli && `${buyuk(f.yuzSekli)} yüz`, f.element && `${ikon} ${buyuk(f.element)} elementi`].filter(Boolean).map((t) => {
      const span = document.createElement("button");
      span.type = "button";
      span.setAttribute("aria-pressed", "true");
      span.textContent = t;
      return span;
    }));
    const bilgi = elementler.find(([ad]) => ad.toLocaleLowerCase("tr-TR") === f.element);
    $("resultElement").textContent = f.elementYorum || (bilgi ? bilgi[3] : "");
    $("resultRegions").replaceChildren(...f.bolgeler.map((b) => {
      const li = document.createElement("li");
      li.innerHTML = '<b></b><span class="gorunum"></span><p></p>';
      li.querySelector("b").textContent = b.bolge;
      li.querySelector(".gorunum").textContent = b.gozlem || "";
      li.querySelector(".gorunum").hidden = !b.gozlem;
      li.querySelector("p").textContent = b.anlam;
      return li;
    }));
    $("resultCharacter").textContent = f.karakter || "—";
    $("resultLove").textContent = f.ask || "—";
    $("resultWork").textContent = f.kariyer || "—";
    $("strongCard").hidden = !f.guclu.length;
    liste($("resultStrong"), f.guclu);
    $("wishCard").hidden = !f.soru;
    $("resultWish").textContent = f.soru;
    $("resultAdvice").textContent = f.tavsiye ? `“${f.tavsiye}”` : "";
  }

  // Rehber
  $("tips").replaceChildren(...ipuclari.map((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${i + 1}</b><span></span>`;
    li.querySelector("span").textContent = t;
    return li;
  }));
  $("elements").replaceChildren(...elementler.map(([ad, ikon, sekil, anlam]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="el-icon">${ikon}</span><b></b><span class="el-signs"></span><p></p>`;
    li.querySelector("b").textContent = ad;
    li.querySelector(".el-signs").textContent = sekil;
    li.querySelector("p").textContent = anlam;
    return li;
  }));
  $("regions").replaceChildren(...bolgeler.map(([ad, anlam]) => {
    const li = document.createElement("li");
    li.innerHTML = "<b></b><p></p>";
    li.querySelector("b").textContent = ad;
    li.querySelector("p").textContent = anlam;
    return li;
  }));

  FotoSayfa({
    api: "/api/yuz-okuma/",
    bolum: "yuz-okuma",
    sayfaYolu: "/yuz-okuma",
    kamera: "user",
    yuva: { ad: "Yüzünün fotoğrafı", ipucu: "Önden, aydınlık", ikon: "🙂" },
    metinler: {
      musaitDegil: "Yüz okuma ustamız şu an müsait değil, biraz sonra tekrar dene.",
      sinir: "Bugünkü 3 yüz okuma hakkını kullandın. Yarın yeniden bekleriz.",
      bekleniyor: "🔮 Yüzün okunuyor…",
      bosGunluk: "Henüz bir yüz okuman yok. Fotoğrafını yukarıda yükle.",
    },
    ciz,
    ozet: (f) => [f.yuzSekli && `${buyuk(f.yuzSekli)} yüz`, f.element && `${buyuk(f.element)} elementi`].filter(Boolean).join(" · ") || f.karakter,
  });
})();
