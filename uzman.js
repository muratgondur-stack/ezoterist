const $ = (id) => document.getElementById(id);
const DURUM = { sirada: "Sırada", inceleniyor: "İnceleniyor", hazir: "Teslim edildi" };

let talepler = [];
let seciliId = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3200);
};

const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

function kalanSure(ms) {
  const fark = ms - Date.now();
  const saat = Math.round(Math.abs(fark) / 3600000);
  return fark >= 0 ? `${saat} saat kaldı` : `${saat} saat gecikti`;
}

const kisiAdi = (t) => t.userName || t.userEmail;

// --- Ses ---

const voice = $("voice");
voice.addEventListener("ended", () => voice.removeAttribute("src"));
function dinle(button, url) {
  if (!voice.paused) {
    voice.pause();
    button.textContent = "🔊 Sesli dinle";
    return;
  }
  button.textContent = "⏳ Ses hazırlanıyor…";
  voice.src = url;
  voice.play().then(() => { button.textContent = "⏹ Durdur"; }).catch(() => {
    button.textContent = "🔊 Sesli dinle";
    toast("Ses çalınamadı.");
  });
  voice.onended = () => { button.textContent = "🔊 Sesli dinle"; };
}

// --- Liste ---

function renderList() {
  const acik = talepler.filter((t) => t.durum !== "hazir").length;
  $("panelSummary").textContent = acik ? `${acik} talep yorumunu bekliyor.` : "Bekleyen talep yok. Elinize sağlık!";
  $("panelList").replaceChildren(...talepler.map((t) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "panel-item";
    button.setAttribute("aria-current", String(t.id === seciliId));
    button.innerHTML = `<span class="chip chip-${t.durum}">${DURUM[t.durum]}</span><b></b><small></small><small></small>`;
    const [ad, burc, sure] = button.querySelectorAll("b, small");
    ad.textContent = kisiAdi(t);
    burc.textContent = `${t.bolumAdi[0].toLocaleUpperCase("tr-TR")}${t.bolumAdi.slice(1)} · ${t.kaynak.baslik}`;
    if (t.durum === "hazir") sure.textContent = `Teslim: ${tarih(t.cevap.tarih)}`;
    else {
      sure.textContent = `Son teslim ${tarih(t.sonTarih)} · ${kalanSure(t.sonTarih)}`;
      if (t.sonTarih < Date.now()) sure.classList.add("late");
    }
    button.addEventListener("click", () => sec(t.id));
    li.append(button);
    return li;
  }));
}

// --- Ayrıntı ---

async function sec(id) {
  seciliId = id;
  renderList();
  let t = talepler.find((x) => x.id === id);
  if (t.durum === "sirada") {
    // Açılan talep "inceleniyor" olur; kullanıcı da bunu görür.
    const response = await fetch("/api/uzman/panel/incele", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id }),
    });
    if (response.ok) {
      t = { ...t, ...(await response.json()).talep };
      talepler = talepler.map((x) => (x.id === id ? t : x));
      renderList();
    }
  }
  renderDetail(t);
}

function renderDetail(t) {
  const node = $("detailTemplate").content.cloneNode(true);
  const f = (name) => node.querySelector(`[data-f="${name}"]`);

  f("durum").textContent = `${DURUM[t.durum]} · ${t.bolumAdi} · ${(Uzmanlar.find((u) => u.id === t.uzman) || Uzmanlar[0]).ad}`;
  f("kisi").textContent = kisiAdi(t);
  f("dogum").textContent = `${t.kaynak.girdiMetni} — ${t.userEmail}`;
  f("sure").textContent = t.durum === "hazir" ? `Teslim edildi: ${tarih(t.cevap.tarih)}` : `Son teslim: ${tarih(t.sonTarih)}\n${kalanSure(t.sonTarih)}`;
  f("harita").textContent = t.kaynak.ozet;
  if (t.kaynak.fotoSayisi) {
    f("fotolar").replaceChildren(...[...Array(t.kaynak.fotoSayisi).keys()].map((n) => {
      const a = document.createElement("a");
      a.href = `/api/uzman/foto?id=${t.id}&n=${n}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = `<img src="/api/uzman/foto?id=${t.id}&n=${n}" alt="Fincan fotoğrafı ${n + 1}" loading="lazy" />`;
      return a;
    }));
  } else if (t.kaynak.kartlar) {
    // Tarot açılımında kartlar gösterilir (ters gelenler ters).
    f("fotoKutu").querySelector("h4").textContent = "Kartlar";
    f("fotolar").replaceChildren(...t.kaynak.kartlar.map((c) => {
      const img = document.createElement("img");
      img.src = `/tarot/kart/${c.id}.webp`;
      img.alt = c.id;
      img.className = "tarot-mini";
      if (c.ters) img.style.transform = "rotate(180deg)";
      return img;
    }));
  } else f("fotoKutu").remove();
  if (t.soru) f("soru").textContent = t.soru;
  else f("soruKutu").remove();
  f("ai").textContent = t.kaynak.aiMetin;

  if (t.durum === "hazir") {
    f("form").remove();
    f("cevap").textContent = t.cevap.metin;
    const dinleButon = f("dinle");
    dinleButon.addEventListener("click", () => dinle(dinleButon, `/api/uzman/ses?id=${t.id}`));
  } else {
    f("teslimKutu").remove();
    const form = f("form");
    const textarea = form.elements.metin;
    const sayac = f("sayac");
    const taslakKey = `ezo_uzman_taslak_${t.id}`;
    try { textarea.value = localStorage.getItem(taslakKey) || ""; } catch {}
    const say = () => { sayac.textContent = `${textarea.value.trim().split(/\s+/).filter(Boolean).length} kelime`; };
    textarea.addEventListener("input", () => {
      say();
      try { localStorage.setItem(taslakKey, textarea.value); } catch {}
    });
    say();
    f("taslak").addEventListener("click", () => {
      if (textarea.value.trim() && !confirm("Yazdığın metin yapay zekâ yorumuyla değiştirilsin mi?")) return;
      textarea.value = t.kaynak.aiMetin;
      textarea.dispatchEvent(new Event("input"));
      textarea.focus();
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!confirm(`${kisiAdi(t)} için yorumunu teslim edelim mi? Kullanıcıya e-posta gidecek.`)) return;
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        const response = await fetch("/api/uzman/panel/teslim", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ id: t.id, metin: textarea.value }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Teslim edilemedi.");
        try { localStorage.removeItem(taslakKey); } catch {}
        toast("Yorum teslim edildi, kullanıcıya haber verildi.");
        await yukle();
        sec(t.id);
      } catch (error) {
        toast(error.message);
      } finally {
        button.disabled = false;
      }
    });
  }
  $("panelDetail").replaceChildren(node);
}

// --- Başlangıç ---

async function yukle() {
  const response = await fetch("/api/uzman/panel", { credentials: "same-origin" });
  if (response.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent("/uzman")}`);
    return false;
  }
  if (!response.ok) {
    $("panelDenied").hidden = false;
    $("panelSummary").textContent = "";
    return false;
  }
  talepler = (await response.json()).talepler;
  $("panelLayout").hidden = false;
  renderList();
  return true;
}

(async () => {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (me?.user) $("topbarUser").textContent = me.user.name || me.user.email;
  if (await yukle()) {
    const ilk = talepler.find((t) => t.durum !== "hazir");
    if (ilk) sec(ilk.id);
  }
})();
