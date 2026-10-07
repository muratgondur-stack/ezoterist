const $ = (id) => document.getElementById(id);
const { burclar } = AstrolojiVeri;
const AVATAR = "/sembol/asistan.webp?v=1";
const welcomeEl = document.getElementById("welcome"); // sohbet temizlenince yeniden eklenir
const SAYFALAR = ["/astroloji", "/dogum-haritasi", "/numeroloji", "/ruya", "/tarot", "/kahve-fali", "/el-fali", "/yuz-okuma", "/fotograf-analizi", "/ask-uyumu",
  "/melek-sayilari", "/iching", "/run-taslari", "/ay-takvimi", "/cakralar", "/kristaller", "/semboller", "/ruhsal-gunluk", "/arsiv"];
const ONERILER = [
  "Bugün Ay hangi burçta, bana ne anlatıyor?",
  "Haritama göre bu hafta neye odaklanmalıyım?",
  "Yaşam yolu sayım ne anlatıyor?",
  "Sürekli 11:11 görüyorum, ne demek?",
  "Kaygılı hissediyorum, hangi kristal bana iyi gelir?",
  "Bir karar vermem lazım, hangi açılımı yapayım?",
];

let durum = { ses: false, ai: false, kalan: 30, sinir: 30, ad: "" };
let sohbetler = [];
let aktif = null; // { id, mesajlar }
let gonderiliyor = false;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3600);
};
const zaman = (ms) => {
  const d = new Date(ms);
  const bugun = new Date().toDateString() === d.toDateString();
  return new Intl.DateTimeFormat("tr-TR", bugun ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" }).format(d);
};

// --- Ses ---

const voice = $("voice");
let activeListen = null;

function stopVoice() {
  voice.pause();
  if (activeListen) {
    activeListen.classList.remove("is-playing");
    activeListen.textContent = "🔊 Dinle";
    activeListen.disabled = false;
  }
  activeListen = null;
}

voice.addEventListener("playing", () => {
  if (!activeListen) return;
  activeListen.disabled = false;
  activeListen.classList.add("is-playing");
  activeListen.textContent = "⏹ Durdur";
});
voice.addEventListener("ended", stopVoice);
voice.addEventListener("error", () => { if (activeListen) toast("Seslendirme şu an hazır değil."); stopVoice(); });

// --- Mesaj çizimi (HTML'e çevrilmeden, güvenli DOM) ---

// Metindeki site adreslerini (/tarot gibi) bağlantıya çevirir.
function satirEkle(parent, metin) {
  const desen = new RegExp(`(${SAYFALAR.map((s) => s.replace(/[/-]/g, "\\$&")).join("|")})(?![\\w-])`, "g");
  let son = 0;
  for (const m of metin.matchAll(desen)) {
    parent.append(metin.slice(son, m.index));
    const a = document.createElement("a");
    a.href = m[0];
    a.textContent = m[0];
    parent.append(a);
    son = m.index + m[0].length;
  }
  parent.append(metin.slice(son));
}

// Paragraflar ve madde işaretli satırlar: ardışık madde satırları liste, diğerleri paragraf olur.
function metniCiz(bubble, metin) {
  const MADDE = /^\s*([-•*]|\d+[.)])\s+/;
  metin.split(/\n{2,}/).forEach((blok) => {
    let p = null;
    let ul = null;
    blok.split("\n").filter((s) => s.trim()).forEach((satir) => {
      if (MADDE.test(satir)) {
        p = null;
        if (!ul) { ul = document.createElement("ul"); bubble.append(ul); }
        const li = document.createElement("li");
        satirEkle(li, satir.replace(MADDE, ""));
        ul.append(li);
      } else {
        ul = null;
        if (p) p.append(document.createElement("br"));
        else { p = document.createElement("p"); bubble.append(p); }
        satirEkle(p, satir);
      }
    });
  });
}

function mesajEl(m, sohbetId) {
  const div = document.createElement("div");
  div.className = `msg ${m.rol}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (m.rol === "ezo") {
    const img = Object.assign(document.createElement("img"), { src: AVATAR, alt: "", className: "avatar", width: 34, height: 34 });
    metniCiz(bubble, m.metin);
    const sarici = document.createElement("div");
    sarici.append(bubble);
    if (durum.ses && sohbetId) {
      const tools = document.createElement("div");
      tools.className = "tools";
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "🔊 Dinle";
      b.addEventListener("click", () => {
        if (activeListen === b) { stopVoice(); return; }
        stopVoice();
        activeListen = b;
        b.disabled = true;
        b.textContent = "⏳ Hazırlanıyor…";
        voice.src = `/api/asistan/ses?sohbet=${sohbetId}&mesaj=${m.id}`;
        voice.play().catch(() => { toast("Ses çalınamadı."); stopVoice(); });
      });
      tools.append(b);
      sarici.append(tools);
    }
    div.append(img, sarici);
  } else {
    bubble.textContent = m.metin;
    div.append(bubble);
  }
  return div;
}

function asagi() { const k = $("messages"); k.scrollTop = k.scrollHeight; }

function renderSohbet() {
  stopVoice();
  const kutu = $("messages");
  kutu.replaceChildren();
  if (!aktif || !aktif.mesajlar.length) {
    kutu.append(welcomeEl);
  } else {
    aktif.mesajlar.forEach((m) => kutu.append(mesajEl(m, aktif.id)));
  }
  asagi();
  renderListe();
}

// --- Sohbet listesi ---

function renderListe() {
  const ul = $("threadList");
  if (!sohbetler.length) {
    ul.innerHTML = '<li class="bos">Henüz sohbetin yok.</li>';
    return;
  }
  ul.replaceChildren(...sohbetler.map((s) => {
    const li = document.createElement("li");
    li.className = aktif?.id === s.id ? "aktif" : "";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "open";
    b.innerHTML = "<span></span><small></small>";
    b.querySelector("span").textContent = s.baslik;
    b.querySelector("small").textContent = `${zaman(s.guncelleme)} · ${s.mesajSayisi / 2} soru`;
    b.addEventListener("click", () => sohbetAc(s.id));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.textContent = "✕";
    sil.title = "Sohbeti sil";
    sil.setAttribute("aria-label", "Sohbeti sil");
    sil.addEventListener("click", async () => {
      if (!confirm("Bu sohbet silinsin mi?")) return;
      const r = await fetch("/api/asistan/sil", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id: s.id }) });
      if (!r.ok) { toast("Silinemedi."); return; }
      sohbetler = sohbetler.filter((x) => x.id !== s.id);
      if (aktif?.id === s.id) aktif = null;
      renderSohbet();
    });
    li.append(b, sil);
    return li;
  }));
}

async function sohbetAc(id) {
  $("threads").classList.remove("acik");
  const r = await fetch(`/api/asistan/sohbet?id=${id}`, { credentials: "same-origin" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { toast(data.error || "Sohbet açılamadı."); return; }
  aktif = { id: data.sohbet.id, mesajlar: data.mesajlar };
  renderSohbet();
  $("composer").elements.metin.focus();
}

$("newChat").addEventListener("click", () => {
  aktif = null;
  $("threads").classList.remove("acik");
  renderSohbet();
  $("composer").elements.metin.focus();
});
$("threadsToggle").addEventListener("click", () => $("threads").classList.toggle("acik"));

// --- Gönderme ---

const alan = $("composer").elements.metin;
function boyutla() { alan.style.height = "auto"; alan.style.height = `${Math.min(alan.scrollHeight, 160)}px`; }
alan.addEventListener("input", boyutla);
alan.addEventListener("keydown", (e) => {
  // Masaüstünde Enter gönderir, Shift+Enter yeni satır; dokunmatikte Enter yeni satırdır.
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !matchMedia("(pointer: coarse)").matches) {
    e.preventDefault();
    $("composer").requestSubmit();
  }
});

function renderKota() {
  $("quota").textContent = durum.kalan == null ? "" : `Bugün ${durum.kalan} mesaj hakkın kaldı (bütün bölümlerde günde ${durum.sinir}).`;
}

async function gonder(metin) {
  if (gonderiliyor) return;
  metin = metin.trim();
  if (!metin) return;
  if (!durum.ai) { toast("Ezo şu an dinleniyor; lütfen biraz sonra tekrar dene."); return; }
  gonderiliyor = true;
  $("sendButton").disabled = true;
  const kutu = $("messages");
  if (!aktif || !aktif.mesajlar.length) kutu.replaceChildren();
  const gecici = { id: "", rol: "kullanici", metin, tarih: Date.now() };
  kutu.append(mesajEl(gecici));
  const yaziyor = document.createElement("div");
  yaziyor.className = "msg ezo";
  yaziyor.innerHTML = `<img class="avatar" src="${AVATAR}" alt="" width="34" height="34" /><div class="bubble typing"><img class="typing-goz" src="/bekleme/goz-gezegenler.webp?v=1" alt="" width="24" height="26" /><span></span><span></span><span></span></div>`;
  kutu.append(yaziyor);
  asagi();
  alan.value = "";
  boyutla();
  try {
    const r = await fetch("/api/asistan/mesaj", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ sohbetId: aktif?.id || "", metin }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Ezo şu an cevap veremedi.");
    durum.kalan = data.kalan;
    renderKota();
    if (!aktif || aktif.id !== data.sohbet.id) aktif = { id: data.sohbet.id, mesajlar: [] };
    aktif.mesajlar.push(...data.mesajlar);
    sohbetler = [data.sohbet, ...sohbetler.filter((s) => s.id !== data.sohbet.id)];
    yaziyor.replaceWith(mesajEl(data.mesajlar[1], aktif.id));
    asagi();
    renderListe();
  } catch (error) {
    yaziyor.remove();
    toast(error.message);
    if (!alan.value) { alan.value = metin; boyutla(); }
    if (!aktif || !aktif.mesajlar.length) renderSohbet();
    else kutu.lastElementChild?.remove();
  } finally {
    gonderiliyor = false;
    $("sendButton").disabled = false;
  }
}

$("composer").addEventListener("submit", (e) => { e.preventDefault(); gonder(alan.value); });

// --- Sesle sorma (rüya bölümündeki Whisper hattı) ---

let recorder = null;
async function kayitBaslat() {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast("Mikrofon izni verilmedi."); return; }
  const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
  recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const parcalar = [];
  recorder.addEventListener("dataavailable", (e) => { if (e.data.size) parcalar.push(e.data); });
  recorder.addEventListener("stop", async () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(parcalar, { type: recorder.mimeType || "audio/webm" });
    recorder = null;
    const mic = $("micButton");
    mic.classList.remove("is-recording");
    mic.textContent = "⏳";
    mic.disabled = true;
    try {
      const r = await fetch("/api/ruya/dinle", { method: "POST", headers: { "Content-Type": blob.type.split(";")[0] || "audio/webm" }, credentials: "same-origin", body: blob });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Ses yazıya çevrilemedi.");
      if (!data.metin) throw new Error("Sesin anlaşılamadı; biraz daha net konuşmayı dene.");
      alan.value = [alan.value.trim(), data.metin].filter(Boolean).join(" ").slice(0, 1500);
      boyutla();
      alan.focus();
    } catch (error) {
      toast(error.message);
    } finally {
      mic.textContent = "🎙️";
      mic.disabled = false;
    }
  });
  recorder.start();
  $("micButton").classList.add("is-recording");
  $("micButton").textContent = "⏹";
  setTimeout(() => recorder?.stop(), 90000);
}
$("micButton").hidden = !(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
$("micButton").addEventListener("click", () => { if (recorder) recorder.stop(); else kayitBaslat(); });

// --- Başlangıç ---

function renderSky() {
  const simdi = new Date();
  const faz = Astro.moonPhase(simdi);
  const burc = Astro.signOf(Astro.moonLongitude(Astro.julianDay(simdi)));
  $("sky").textContent = `${faz.icon} Ay ${burclar[burc].ad} burcunda · ${faz.name}`;
}

$("suggestions").replaceChildren(...ONERILER.map((o) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = o;
  b.addEventListener("click", () => gonder(o));
  return b;
}));

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/asistan")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/asistan/durum", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ses: data.ses, ai: data.ai, kalan: data.kalan, sinir: data.sinir, ad: data.ad };
    sohbetler = data.sohbetler;
  }
  if (durum.ad) welcomeEl.querySelector("h1").textContent = `Merhaba ${durum.ad}, ben Ezo.`;
  renderKota();
  renderSohbet();
}

renderSky();
init();
