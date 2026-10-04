// "İstersen uzmanımıza da yorumlat" kartı (bütün bölüm sayfaları ortak kullanır): yalnız gerçek uzmanlara sipariş;
// "Uzman ekibimiz" (o bölümü seçmiş bütün uzmanlar) ya da kendi adıyla görünen bir uzman, 48 saat içinde cevaplar.
// Sanal uzmanlar burada yok: bölümün yorumunu zaten müşterinin baştan seçtiği sanal uzman yazar (ust-cubuk.js).
// Sayfada #expertCard, #expertGrid, #expertForm ve #expertStatus öğeleri bulunur. ekVeri: talebe eklenecek bölüme
// özel bilgi (ör. rüyada hangi kayıt).
window.UzmanKarti = function UzmanKarti({ bolum, bindListen, toast, ekVeri }) {
  const $ = (id) => document.getElementById(id);
  const HAVUZ = "havuz";
  let talep = null; // gösterilen son cevap
  let bekleyen = null; // gerçek uzmanda bekleyen sipariş
  const tum = () => window.Uzmanlar || [];
  const sanallar = () => [];
  const gercekler = () => [
    ...((window.UzmanHavuzu || {})[bolum] ? [{ id: HAVUZ, tip: "gercek", ad: "Uzman ekibimiz", unvan: "Gerçek uzman · 48 saat", resim: "" }] : []),
    ...tum().filter((u) => u.secilebilir && u.tip === "gercek" && u.bolumler.includes(bolum)),
  ];
  // Bekleyen sipariş varken yalnız sanal uzmanlar seçilebilir.
  const secilebilirler = () => [...sanallar(), ...(bekleyen ? [] : gercekler())];
  let secili = secilebilirler()[0]?.id;
  const uzmanBul = (id) => (id === HAVUZ ? { ad: "Uzman ekibimiz", resim: "" } : tum().find((u) => u.id === id) || { ad: "Uzmanımız", unvan: "", resim: "" });
  const seciliKart = () => secilebilirler().find((u) => u.id === secili);
  const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

  function slot(u) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `expert-slot${u.tip === "sanal" ? " sanal" : ""}`;
    button.setAttribute("aria-pressed", String(u.id === secili));
    button.innerHTML = u.resim
      ? `<span class="expert-face"><img src="${u.resim}" alt="" width="84" height="84" /></span>`
      : `<span class="expert-q">${u.id === HAVUZ ? "👥" : "?"}</span>`;
    const ad = document.createElement("b");
    ad.textContent = u.ad;
    const unvan = document.createElement("small");
    unvan.textContent = u.unvan;
    button.append(ad, unvan);
    if (u.tanitim) button.title = u.tanitim;
    button.addEventListener("click", () => { secili = u.id; renderUzmanlar(); });
    li.append(button);
    return li;
  }
  const grupBasligi = (metin, alt) => {
    const li = document.createElement("li");
    li.className = "expert-grup";
    li.innerHTML = "<b></b><small></small>";
    li.querySelector("b").textContent = metin;
    li.querySelector("small").textContent = alt;
    return li;
  };

  function renderUzmanlar() {
    const lead = $("expertCard").querySelector(".expert-lead");
    if (lead) lead.textContent = "Dilersen gerçek uzmanlarımızdan biri analizini kendi gözüyle de incelesin; 48 saat içinde sana özel, kişisel bir yorum hazırlar (yazılı, sesli ya da videolu).";
    if (!secilebilirler().length) {
      const li = document.createElement("li");
      li.className = "expert-yok";
      li.textContent = bekleyen ? "Talebin uzmanımızda; hazır olunca e-posta ile haber vereceğiz." : "Gerçek uzmanlarımız bu bölüme çok yakında katılacak.";
      $("expertGrid").replaceChildren(li);
      $("expertForm").hidden = true;
      return;
    }
    if (!seciliKart()) secili = secilebilirler()[0].id;
    const ogeler = [];
    if (sanallar().length) ogeler.push(grupBasligi("✨ Sanal uzmanlarımız", "Hemen yorumlar"), ...sanallar().map(slot));
    if (bekleyen) ogeler.push(grupBasligi("Talebin hazırlanıyor", "Bitince yeni bir talep verebilirsin"));
    else ogeler.push(...gercekler().map(slot));
    $("expertGrid").replaceChildren(...ogeler);
    const k = seciliKart();
    const dugme = $("expertForm").querySelector('button[type="submit"]');
    dugme.textContent = k?.tip === "sanal" ? `✨ ${k.ad} şimdi yorumlasın` : "Gerçek uzmandan yorum iste (48 saat)";
    const etiket = $("expertForm").querySelector("label span");
    if (etiket) etiket.textContent = k?.tip === "sanal" ? `${k.ad} için bir sorun var mı? (isteğe bağlı)` : "Uzmanına notun (isteğe bağlı)";
  }

  function renderDurum() {
    const status = $("expertStatus");
    $("expertForm").hidden = !secilebilirler().length;
    $("expertGrid").hidden = false;
    if (!talep && !bekleyen) { status.hidden = true; return; }
    status.hidden = false;
    status.replaceChildren();
    if (bekleyen) {
      const satir = document.createElement("p");
      satir.className = "status-line";
      satir.innerHTML = '<span class="status-dot"></span><span></span>';
      satir.lastChild.textContent = bekleyen.durum === "inceleniyor"
        ? `Gerçek uzmanımız şu an analizini inceliyor. Yorumun en geç ${tarih(bekleyen.sonTarih)} tarihinde hazır olacak.`
        : `Talebin gerçek uzmanımıza iletildi. Yorumun en geç ${tarih(bekleyen.sonTarih)} tarihinde hazır olacak; hazır olunca e-posta ile haber vereceğiz.`;
      status.append(satir);
    }
    if (!talep) return;
    const uzman = talep.yazan || uzmanBul(talep.uzman);
    const kutu = document.createElement("div");
    status.append(kutu);
    kutu.innerHTML = `<div class="expert-answer"><div class="expert-answer-head">${uzman.resim ? `<span class="expert-face"><img src="${uzman.resim}" alt="" /></span>` : ""}<div><b></b><small></small></div></div>
      <div class="expert-medya"></div><p class="reading-text"></p><button type="button" class="listen" id="expertListen">🔊 Sesli dinle</button></div>`;
    kutu.querySelector(".expert-answer-head b").textContent = `${uzman.ad} yorumladı`;
    kutu.querySelector(".expert-answer-head small").textContent = tarih(talep.cevap.tarih);
    // Sesli / videolu cevap (gerçek uzman).
    const medya = talep.cevap.medya;
    if (medya) {
      const m = document.createElement(medya.tur === "video" ? "video" : "audio");
      m.controls = true;
      m.preload = "metadata";
      m.playsInline = true;
      m.className = `expert-${medya.tur}`;
      m.src = `/api/uzman/medya?id=${talep.id}`;
      kutu.querySelector(".expert-medya").append(m);
    }
    kutu.querySelector(".reading-text").textContent = talep.cevap.metin || "";
    if (talep.cevap.metin) bindListen($("expertListen"), () => `/api/uzman/ses?id=${talep.id}`);
    else $("expertListen").remove();
  }

  $("expertForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter || $("expertForm").querySelector("button");
    const k = seciliKart();
    if (!k) return;
    const sanal = k.tip === "sanal";
    button.disabled = true;
    try {
      const response = await fetch(sanal ? "/api/uzman/sanal" : "/api/uzman/talep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ uzman: k.id, bolum, soru: $("expertForm").elements.soru.value, ...(ekVeri ? ekVeri() : {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Talep gönderilemedi.");
      if (sanal) talep = data.talep;
      else bekleyen = data.talep;
      $("expertForm").reset();
      renderUzmanlar();
      renderDurum();
      if (sanal) $("expertStatus").scrollIntoView({ behavior: "smooth", block: "start" });
      toast(sanal ? `${k.ad} yorumunu yazdı.` : "Talebin uzmanımıza iletildi.");
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });

  return {
    // Kullanıcının bu bölümdeki son talebini ve uzman yetkisini yükler; uzmana panel bağlantısı gösterir.
    async yukle() {
      const durum = await fetch(`/api/uzman/durum?bolum=${bolum}`, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      talep = durum?.talep || null;
      bekleyen = durum?.bekleyen || null;
      if (durum?.uzman) {
        const link = document.createElement("a");
        link.href = "/uzman";
        link.className = "topbar-back";
        link.textContent = "Uzman Paneli";
        $("topbarUser").replaceChildren(link);
      }
    },
    // Analiz ekrana gelince kart görünür olur.
    goster() {
      $("expertCard").hidden = false;
      renderUzmanlar();
      renderDurum();
    },
  };
};
