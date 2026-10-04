(() => {
  const { elementler, bolgeler, ipuclari } = YuzOkumaVeri;
  const $ = (id) => document.getElementById(id);
  const buyuk = (s) => (s ? s[0].toLocaleUpperCase("tr-TR") + s.slice(1) : "");
  const liste = (el, items) => el.replaceChildren(...items.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- Biyometrik yüz haritası ---

  let sonHaritaFoto = null; // tuvalde çizili olan fotoğraf
  let tazeHarita = false; // az önce gösterisi yapılan harita; okuma gelince yeniden çizilmez

  const ADIMLAR = ["Yüz aranıyor", "468 yüz noktası", "Yüz ağı örülüyor", "Hatlar çiziliyor", "Oranlar ölçülüyor", "Yüzün okunuyor"];
  function adimGoster(aktif) {
    $("scanSteps").replaceChildren(...ADIMLAR.map((ad, i) => {
      const li = document.createElement("li");
      li.textContent = ad;
      if (i < aktif) li.className = "is-done";
      if (i === aktif) li.className = "is-active";
      return li;
    }));
  }

  function olcumleriGoster(o) {
    if (!o) { $("bioMetrics").replaceChildren(); return; }
    const kartlar = [
      ["Yüz oranı", o.oran.toFixed(2), "yükseklik / genişlik"],
      ["Altın oran uyumu", `%${o.altinUyum}`, "1,618 oranına yakınlık"],
      ["Yüz şekli", buyuk(o.sekil), "ölçümden tahmin"],
      ["Alın / çene", o.alinCene.toFixed(2), o.alinCene > 1.1 ? "alın baskın" : o.alinCene < 0.92 ? "çene baskın" : "dengeli"],
      ["Göz aralığı", o.gozAraligi.toFixed(2), "iç köşeler / göz genişliği"],
    ];
    $("bioMetrics").replaceChildren(...kartlar.map(([ad, deger, aciklama], i) => {
      const li = document.createElement("li");
      li.style.setProperty("--gecikme", `${i * 120}ms`);
      li.innerHTML = "<small></small><b></b><span></span>";
      li.querySelector("small").textContent = ad;
      li.querySelector("b").textContent = deger;
      li.querySelector("span").textContent = aciklama;
      return li;
    }));
  }

  // Gönderimden önce: yüzü bul, gösteriyi başlat. Yüz yoksa ya da birden fazlaysa hak harcamadan durdurur.
  async function hazirla(foto) {
    $("sonuc").hidden = false;
    $("readingBody").classList.add("is-waiting");
    $("expertCard").hidden = true;
    $("resultPhoto").src = foto;
    $("bioMap").classList.remove("is-hidden");
    $("bioMetrics").replaceChildren();
    $("scanSteps").hidden = false;
    adimGoster(0);
    $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });

    let analiz;
    try {
      analiz = await YuzHaritasi.analiz(foto);
    } catch (error) {
      // Harita kütüphanesi yüklenemezse okuma yine yapılır, yalnız harita gösterilmez.
      console.warn("Yüz haritası çıkarılamadı:", error);
      $("bioMap").classList.add("is-hidden");
      adimGoster(5);
      return { ek: {}, bekle: null };
    }
    if (analiz.yuzSayisi === 0) throw new Error("Fotoğrafta bir yüz bulamadım. Yüzünün önden ve aydınlık göründüğü bir fotoğrafla tekrar dene.");
    if (analiz.yuzSayisi > 1) throw new Error("Fotoğrafta birden fazla yüz var. Yalnızca senin olduğun bir fotoğraf seç.");
    sonHaritaFoto = foto;
    tazeHarita = true;

    // Gösteri ~5,6 sn; adımlar ona eşlik eder. Okuma bu sırada sunucuda hazırlanır.
    const gosteri = (async () => {
      const cizim = YuzHaritasi.ciz($("bioCanvas"), analiz, { animasyon: true });
      for (const [adim, ms] of [[1, 1100], [2, 1500], [3, 1200], [4, 1100]]) { adimGoster(adim); await bekle(ms); }
      await cizim;
      olcumleriGoster(analiz.olcumler);
      adimGoster(5);
      await bekle(900);
    })();
    return { ek: { olcumler: analiz.olcumler }, bekle: gosteri };
  }

  function hazirlikIptal() {
    tazeHarita = false;
    $("sonuc").hidden = true;
    $("scanSteps").hidden = true;
    $("readingBody").classList.remove("is-waiting");
  }

  // Günlükten açılan kayıtta harita, saklı fotoğraftan animasyonsuz yeniden çizilir.
  async function haritayiYenidenCiz(kayit) {
    const adres = `/api/yuz-okuma/foto?id=${kayit.id}&n=0`;
    if (sonHaritaFoto === adres) return;
    sonHaritaFoto = adres;
    try {
      const analiz = await YuzHaritasi.analiz(adres);
      if (!analiz.noktalar || sonHaritaFoto !== adres) return;
      $("bioMap").classList.remove("is-hidden");
      await YuzHaritasi.ciz($("bioCanvas"), analiz, { animasyon: false });
    } catch {
      $("bioMap").classList.add("is-hidden");
    }
  }

  // --- Okuma ---

  function ciz(f, kayit) {
    $("scanSteps").hidden = true;
    $("readingBody").classList.remove("is-waiting");
    olcumleriGoster(kayit.girdi.olcumler || null);
    if (!kayit.girdi.olcumler) $("bioMap").classList.add("is-hidden");
    else if (tazeHarita) tazeHarita = false;
    else haritayiYenidenCiz(kayit);

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
      if (b.netlik === "belirsiz") li.querySelector("b").append(Object.assign(document.createElement("span"), { className: "belirsiz-etiket", textContent: "belli belirsiz" }));
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

  // --- Rehber ---
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

  // Model sayfa açılır açılmaz arka planda yüklenmeye başlar; fotoğraf seçilene kadar hazır olur.
  setTimeout(() => YuzHaritasi.yukle().catch(() => {}), 1500);

  FotoSayfa({
    api: "/api/yuz-okuma/",
    bolum: "yuz-okuma",
    sayfaYolu: "/yuz-okuma",
    kamera: "user",
    yuva: { ad: "Yüzünün fotoğrafı", ipucu: "Önden, aydınlık", ikon: "🙂" },
    metinler: {
      musaitDegil: "Yüz okuma ustamız şu an müsait değil, biraz sonra tekrar dene.",
      sinir: "Bugünkü 3 yüz okuma hakkını kullandın. Yarın yeniden bekleriz.",
      bekleniyor: "🔬 Yüz haritan çıkarılıyor…",
      bosGunluk: "Henüz bir yüz okuman yok. Fotoğrafını yukarıda yükle.",
    },
    hazirla,
    hazirlikIptal,
    ciz,
    ozet: (f) => [f.yuzSekli && `${buyuk(f.yuzSekli)} yüz`, f.element && `${buyuk(f.element)} elementi`].filter(Boolean).join(" · ") || f.karakter,
  });
})();
