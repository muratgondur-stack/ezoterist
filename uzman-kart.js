// "İstersen uzmanımıza da yorumlat" kartı: astroloji ve numeroloji sayfaları ortak kullanır.
// Sayfada #expertCard, #expertGrid, #expertForm ve #expertStatus öğeleri bulunur.
// ekVeri: talebe eklenecek bölüme özel bilgi (ör. rüyada hangi kayıt).
window.UzmanKarti = function UzmanKarti({ bolum, bindListen, toast, ekVeri }) {
  const $ = (id) => document.getElementById(id);
  let talep = null;
  let secili = Uzmanlar.find((u) => u.aktif)?.id;
  const uzmanBul = (id) => Uzmanlar.find((u) => u.id === id) || Uzmanlar[0];
  const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

  function renderUzmanlar() {
    $("expertGrid").replaceChildren(...Uzmanlar.map((u) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "expert-slot";
      button.disabled = !u.aktif;
      button.setAttribute("aria-pressed", String(u.id === secili));
      button.innerHTML = u.resim
        ? `<span class="expert-face"><img src="${u.resim}" alt="" width="84" height="84" />${u.video ? `<video src="${u.video}" muted loop playsinline preload="none" aria-hidden="true"></video>` : ""}</span>`
        : '<span class="expert-q">?</span>';
      const ad = document.createElement("b");
      ad.textContent = u.ad;
      const unvan = document.createElement("small");
      unvan.textContent = u.unvan;
      button.append(ad, unvan);
      button.addEventListener("click", () => { secili = u.id; renderUzmanlar(); });
      li.append(button);
      // Fare üzerine gelince (ya da dokununca) numeroloğun kısa videosu oynar.
      const video = button.querySelector("video");
      if (video) {
        li.addEventListener("pointerenter", () => { video.play().then(() => li.classList.add("is-playing")).catch(() => {}); });
        li.addEventListener("pointerleave", () => { video.pause(); li.classList.remove("is-playing"); });
      }
      return li;
    }));
  }

  function renderDurum() {
    const status = $("expertStatus");
    const bekliyor = talep && talep.durum !== "hazir";
    $("expertForm").hidden = Boolean(bekliyor);
    $("expertGrid").hidden = Boolean(bekliyor);
    if (!talep) { status.hidden = true; return; }
    status.hidden = false;
    const uzman = uzmanBul(talep.uzman);

    if (bekliyor) {
      status.innerHTML = '<p class="status-line"><span class="status-dot"></span><span></span></p>';
      status.querySelector("span:last-child").textContent = talep.durum === "inceleniyor"
        ? `${uzman.ad} şu an analizini inceliyor. Yorumun en geç ${tarih(talep.sonTarih)} tarihinde hazır olacak.`
        : `Talebin ${uzman.ad} için sıraya alındı. Yorumun en geç ${tarih(talep.sonTarih)} tarihinde hazır olacak; hazır olunca e-posta ile haber vereceğiz.`;
      return;
    }

    status.innerHTML = `<div class="expert-answer"><div class="expert-answer-head">${uzman.resim ? `<img src="${uzman.resim}" alt="" />` : ""}<div><b></b><small></small></div></div>
      <p class="reading-text"></p><button type="button" class="listen" id="expertListen">🔊 Sesli dinle</button></div>`;
    status.querySelector(".expert-answer-head b").textContent = `${uzman.ad} yorumladı`;
    status.querySelector(".expert-answer-head small").textContent = tarih(talep.cevap.tarih);
    status.querySelector(".reading-text").textContent = talep.cevap.metin;
    bindListen($("expertListen"), () => `/api/uzman/ses?id=${talep.id}`);
  }

  $("expertForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter || $("expertForm").querySelector("button");
    button.disabled = true;
    try {
      const response = await fetch("/api/uzman/talep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ uzman: secili, bolum, soru: $("expertForm").elements.soru.value, ...(ekVeri ? ekVeri() : {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Talep gönderilemedi.");
      talep = data.talep;
      $("expertForm").reset();
      renderDurum();
      toast("Talebin uzmanımıza iletildi.");
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
