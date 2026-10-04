// Tek fotoğrafla bakılan bölümlerin ortak sayfa davranışı (yüz okuma, fotoğraf analizi): fotoğraf seçme ve
// küçültme, gönderme, günlük hak, sesli dinleme, günlük listesi ve uzman kartı. Her sayfa yalnızca sonucu çizer.
// Sayfada şu öğeler bulunur: #quota #photoSlots #falForm(soru) #falSubmit #sonuc #resultPhoto #resultDate #resultTitle
// #resultListen #journal #journalNote #expert* #voice #toast #topbarUser.
window.FotoSayfa = function FotoSayfa(ayar) {
  const $ = (id) => document.getElementById(id);
  let durum = { ses: false, ai: true, kalan: 3, sinir: 3 };
  let kayitlar = [];
  let acikKayit = null;
  let foto = null;
  let toastTimer;
  const toast = (text) => {
    $("toast").textContent = text;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; }, 4000);
  };
  const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));

  // --- Ses ---
  const voice = $("voice");
  let activeListen = null;
  function stopVoice() {
    voice.pause();
    if (activeListen) {
      activeListen.classList.remove("is-playing");
      activeListen.textContent = activeListen.dataset.label;
      activeListen.disabled = false;
    }
    activeListen = null;
  }
  function bindListen(button, getUrl) {
    button.dataset.label = button.dataset.label || button.textContent;
    button.hidden = !durum.ses;
    button.onclick = () => {
      if (activeListen === button) { stopVoice(); return; }
      stopVoice();
      activeListen = button;
      button.disabled = true;
      button.textContent = "⏳ Ses hazırlanıyor…";
      voice.src = getUrl();
      voice.play().catch(() => { toast("Ses çalınamadı."); stopVoice(); });
    };
  }
  voice.addEventListener("playing", () => {
    if (!activeListen) return;
    activeListen.disabled = false;
    activeListen.classList.add("is-playing");
    activeListen.textContent = "⏹ Durdur";
  });
  voice.addEventListener("ended", stopVoice);
  voice.addEventListener("error", () => { if (activeListen) toast("Seslendirme şu an hazır değil."); stopVoice(); });

  // --- Fotoğraf ---

  function renderSlot() {
    $("photoSlots").replaceChildren(fotoYuvasi({
      yuva: { ...ayar.yuva, zorunlu: true },
      foto,
      kamera: ayar.kamera || "environment",
      onSec: (veri) => { foto = veri; renderSlot(); },
      onSil: () => { foto = null; renderSlot(); },
      onHata: toast,
    }));
  }

  function renderKota() {
    $("quota").textContent = !durum.ai
      ? ayar.metinler.musaitDegil
      : !durum.sinir ? "" : durum.kalan > 0 ? `Bugün ${durum.kalan} hakkın kaldı (günde ${durum.sinir}).` : ayar.metinler.sinir;
    // Sınır kapalıysa (sinir null) düğme hep açık.
    $("falSubmit").disabled = (durum.sinir && durum.kalan <= 0) || !durum.ai;
  }

  const form = $("falForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!foto) { toast("Önce fotoğrafını ekle."); return; }
    const button = $("falSubmit");
    const yazi = button.textContent;
    button.disabled = true;
    button.textContent = ayar.metinler.bekleniyor;
    let hazirlik = null;
    try {
      // Bölüme özel hazırlık (yüz okumada yüz haritası): ek bilgi döndürür, gösterisi bitene kadar sonuç bekletilir.
      if (ayar.hazirla) hazirlik = await ayar.hazirla(foto);
      const response = await fetch(`${ayar.api}bak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fotolar: [foto], soru: form.elements.soru.value, ...(hazirlik?.ek || {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Okuma yapılamadı.");
      if (hazirlik?.bekle) await hazirlik.bekle;
      durum.kalan = data.kalan;
      kayitlar.unshift(data.kayit);
      foto = null;
      form.reset();
      renderSlot();
      goster(data.kayit, true);
      renderJournal();
    } catch (error) {
      ayar.hazirlikIptal?.();
      toast(error.message);
    } finally {
      button.textContent = yazi;
      renderKota();
    }
  });

  // --- Sonuç ---
  function goster(kayit, kaydir = false) {
    window.yorumcuGoster?.(kayit); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
    stopVoice();
    acikKayit = kayit;
    $("sonuc").hidden = false;
    $("resultPhoto").src = `${ayar.api}foto?id=${kayit.id}&n=0`;
    $("resultDate").textContent = tarih(kayit.tarih);
    $("resultTitle").textContent = kayit.fal.baslik;
    ayar.ciz(kayit.fal, kayit);
    bindListen($("resultListen"), () => `${ayar.api}ses?id=${kayit.id}`);
    uzmanKarti.goster();
    document.querySelectorAll(".journal-item").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
    if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const uzmanKarti = UzmanKarti({ bolum: ayar.bolum, bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

  // --- Günlük ---
  function renderJournal() {
    const list = $("journal");
    if (!kayitlar.length) {
      list.innerHTML = `<li class="journal-empty">${ayar.metinler.bosGunluk}</li>`;
      return;
    }
    $("journalNote").textContent = `${kayitlar.length} kayıt.`;
    list.replaceChildren(...kayitlar.map((k) => {
      const li = document.createElement("li");
      li.className = `journal-item${acikKayit?.id === k.id ? " is-current" : ""}`;
      li.dataset.id = k.id;
      const open = document.createElement("button");
      open.type = "button";
      open.className = "journal-open";
      open.innerHTML = `<img class="journal-thumb" src="${ayar.api}foto?id=${k.id}&n=0" alt="" loading="lazy" /><span class="journal-meta"><b></b><small></small><p></p></span>`;
      open.querySelector("b").textContent = k.fal.baslik;
      open.querySelector("small").textContent = tarih(k.tarih);
      open.querySelector("p").textContent = ayar.ozet(k.fal, k);
      open.addEventListener("click", () => goster(k, true));
      const sil = document.createElement("button");
      sil.type = "button";
      sil.className = "journal-delete";
      sil.setAttribute("aria-label", "Bu kaydı sil");
      sil.textContent = "✕";
      sil.addEventListener("click", async () => {
        if (!confirm("Bu kayıt ve fotoğrafı silinsin mi?")) return;
        const response = await fetch(`${ayar.api}sil`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id: k.id }),
        });
        if (!response.ok) { toast("Silinemedi."); return; }
        kayitlar = kayitlar.filter((x) => x.id !== k.id);
        if (acikKayit?.id === k.id) { acikKayit = null; $("sonuc").hidden = true; stopVoice(); }
        renderJournal();
      });
      li.append(open, sil);
      return li;
    }));
  }

  // --- Başlangıç ---
  (async () => {
    renderSlot();
    const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!me?.user) {
      window.location.replace(`/login?next=${encodeURIComponent(ayar.sayfaYolu)}`);
      return;
    }
    $("topbarUser").textContent = me.user.name || me.user.email;
    const data = await fetch(`${ayar.api}gunluk`, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (data) {
      durum = { ...durum, ses: data.ses, ai: data.ai, kalan: data.kalan, sinir: data.sinir };
      kayitlar = data.kayitlar;
    }
    renderKota();
    await uzmanKarti.yukle();
    renderJournal();
    if (kayitlar.length && window.location.hash === "#gunluk") goster(kayitlar[0]);
  })();
};
