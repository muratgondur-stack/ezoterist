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
  function kucult(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const olcek = Math.min(1, 1280 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * olcek);
        canvas.height = Math.round(image.height * olcek);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Fotoğraf açılamadı.")); };
      image.src = url;
    });
  }

  function renderSlot() {
    const slot = document.createElement("label");
    slot.className = `photo-slot is-required${foto ? " has-photo" : ""}`;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (ayar.kamera) input.setAttribute("capture", ayar.kamera);
    input.hidden = true;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try { foto = await kucult(file); renderSlot(); } catch (error) { toast(error.message); }
    });
    slot.append(input);
    if (foto) {
      const img = document.createElement("img");
      img.src = foto;
      img.alt = ayar.yuva.ad;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "slot-remove";
      remove.setAttribute("aria-label", "Fotoğrafı kaldır");
      remove.textContent = "✕";
      remove.addEventListener("click", (e) => { e.preventDefault(); foto = null; renderSlot(); });
      slot.append(img, remove);
    } else {
      slot.insertAdjacentHTML("beforeend", `<span class="slot-icon">${ayar.yuva.ikon}</span><b></b><span></span>`);
      slot.querySelector("b").textContent = ayar.yuva.ad;
      slot.querySelector("span:last-child").textContent = ayar.yuva.ipucu;
    }
    $("photoSlots").replaceChildren(slot);
  }

  function renderKota() {
    $("quota").textContent = !durum.ai
      ? ayar.metinler.musaitDegil
      : durum.kalan > 0 ? `Bugün ${durum.kalan} hakkın kaldı (günde ${durum.sinir}).` : ayar.metinler.sinir;
    $("falSubmit").disabled = durum.kalan <= 0 || !durum.ai;
  }

  const form = $("falForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!foto) { toast("Önce fotoğrafını ekle."); return; }
    const button = $("falSubmit");
    const yazi = button.textContent;
    button.disabled = true;
    button.textContent = ayar.metinler.bekleniyor;
    try {
      const response = await fetch(`${ayar.api}bak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fotolar: [foto], soru: form.elements.soru.value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Okuma yapılamadı.");
      durum.kalan = data.kalan;
      kayitlar.unshift(data.kayit);
      foto = null;
      form.reset();
      renderSlot();
      goster(data.kayit, true);
      renderJournal();
    } catch (error) {
      toast(error.message);
    } finally {
      button.textContent = yazi;
      renderKota();
    }
  });

  // --- Sonuç ---
  function goster(kayit, kaydir = false) {
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
