const toast = document.getElementById("toast");

const mobilePortrait = window.matchMedia("(orientation: portrait) and (max-width: 600px)");

// Banner'ı üst butonların arasına, menü butonlarını da ekrana sığdır.
const fitLayout = () => {
  const root = document.documentElement;
  const grid = document.querySelector(".menu-grid");
  const firstButton = grid?.querySelector(".menu-button");
  const leftEdge = document.getElementById("musicToggle")?.getBoundingClientRect().right || 58;
  const bar = document.getElementById("authBar")?.getBoundingClientRect();
  const barLeft = bar ? bar.left : window.innerWidth;

  if (mobilePortrait.matches) {
    // Telefon dikeyde ezo_E banner'ı kamera butonu ile Giriş butonu arasındaki boşluğa ortalanır.
    const gap = 8;
    document.body.classList.remove("banner-below");
    root.style.setProperty("--banner-w", `${Math.max(0, barLeft - leftEdge - 2 * gap)}px`);
    root.style.setProperty("--banner-shift", `${(leftEdge + barLeft) / 2 - window.innerWidth / 2}px`);
  } else {
    const side = Math.max(leftEdge, window.innerWidth - barLeft) + 12;
    const between = window.innerWidth - 2 * side;
    const below = between < 280;
    document.body.classList.toggle("banner-below", below);
    root.style.setProperty("--banner-w", `${Math.min(680, below ? window.innerWidth - 32 : between)}px`);
    root.style.setProperty("--banner-shift", "0px");
  }

  if (!grid || !firstButton) return;
  const count = grid.children.length;
  const gridStyle = getComputedStyle(grid);
  const rowGap = parseFloat(gridStyle.rowGap) || 0;
  const colGap = parseFloat(gridStyle.columnGap) || 0;
  const buttonStyle = getComputedStyle(firstButton);
  const padX = parseFloat(buttonStyle.paddingLeft) + parseFloat(buttonStyle.paddingRight);
  // Uzun etiketler iki satıra inebilir; en yüksek etiketli butona göre hesapla.
  const extraY = Math.max(
    ...[...grid.querySelectorAll(".menu-button")].map(
      (button) => button.getBoundingClientRect().height - button.querySelector("img").getBoundingClientRect().height,
    ),
  );
  const width = grid.parentElement.clientWidth;
  const height = window.innerHeight - (grid.getBoundingClientRect().top + window.scrollY) - 16;

  let best = { cols: 5, size: 0 };
  for (let cols = 2; cols <= 10; cols += 1) {
    const rows = Math.ceil(count / cols);
    const byWidth = (width - (cols - 1) * colGap) / cols - padX;
    const byHeight = ((height - (rows - 1) * rowGap) / rows - extraY) / 0.9;
    const size = Math.min(byWidth, byHeight, 220);
    if (size > best.size) best = { cols, size };
  }
  const size = Math.max(56, Math.floor(best.size));
  root.style.setProperty("--cols", best.cols);
  root.style.setProperty("--btn", `${size + padX}px`);
};

// İkinci geçiş: yeni boyutta etiketler farklı satıra inebilir, ölçüleri tazele.
const refit = () => {
  fitLayout();
  requestAnimationFrame(fitLayout);
};

refit();
window.addEventListener("resize", refit);
document.fonts?.ready.then(refit);
let toastTimer;

const authBar = document.getElementById("authBar");

// Oturumdaki kullanıcı (yoksa null); menü tıklamaları bunu bekler.
const currentUser = fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((data) => data?.user || null)
  .catch(() => null);

// Hazır olan bölümlerin kendi sayfaları var; diğerleri "çok yakında" der.
const SECTION_PAGES = { "#astroloji": "/astroloji", "#numeroloji": "/numeroloji", "#ruya-yorumu": "/ruya", "#kahve-fali": "/kahve-fali", "#el-fali": "/el-fali", "#tarot": "/tarot", "#yuz-okuma": "/yuz-okuma", "#fotograf-analizi": "/fotograf-analizi", "#ask-uyumu": "/ask-uyumu", "#dogum-haritasi": "/dogum-haritasi", "#melek-sayilari": "/melek-sayilari", "#i-ching": "/iching", "#run-taslari": "/run-taslari", "#ay-takvimi": "/ay-takvimi", "#cakralar": "/cakralar", "#kristaller": "/kristaller", "#kisisel-arsiv": "/arsiv" };

const openSection = (button) => {
  const page = SECTION_PAGES[button.getAttribute("href")];
  if (page) {
    window.location.assign(page);
    return;
  }
  toast.textContent = `${button.dataset.title} çok yakında.`;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
};

const menuButtons = document.querySelectorAll(".menu-button");

menuButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    currentUser.then((user) => {
      // Giriş yapılmamışsa giriş penceresini aç; girişten sonra bu bölüme dönülür.
      if (!user) {
        const next = SECTION_PAGES[button.getAttribute("href")] || `/${button.getAttribute("href")}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      openSection(button);
    });
  });
});

// Her 2 saniyede rastgele bir butona fareyle üzerine gelinmiş gibi animasyon yap.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let lastPulsed;
  setInterval(() => {
    if (document.hidden) return;
    const candidates = [...menuButtons].filter((button) => button !== lastPulsed);
    const button = candidates[Math.floor(Math.random() * candidates.length)];
    lastPulsed = button;
    button.classList.add("is-pulsing");
    setTimeout(() => button.classList.remove("is-pulsing"), 900);
  }, 2000);
}

// Girişten "/#bolum" adresine dönüldüyse o bölümü aç.
const returnedTo = [...menuButtons].find((button) => button.getAttribute("href") === window.location.hash);
if (returnedTo) {
  currentUser.then((user) => {
    history.replaceState(null, "", "/");
    if (!user) return;
    returnedTo.scrollIntoView({ block: "center" });
    returnedTo.focus({ preventScroll: true });
    openSection(returnedTo);
  });
}

currentUser.then((user) => {
  if (!user || !authBar) return;

  // Ad, kişisel arşive (profil, kontör, analizler) götürür.
  const name = document.createElement("a");
  name.className = "auth-bar-user";
  name.href = "/arsiv";
  name.title = "Kişisel arşivim";
  name.textContent = `👤 ${user.name || user.email}`;

  const logout = document.createElement("button");
  logout.type = "button";
  logout.className = "auth-bar-link";
  logout.textContent = "Çıkış";
  logout.addEventListener("click", () => {
    fetch("/api/logout", { method: "POST", credentials: "same-origin" })
      .finally(() => window.location.reload());
  });

  authBar.replaceChildren(name, logout);
  refit();
});

// Arka plan müziği: çok kısık, döngüde. Tarayıcılar sesi ilk dokunuş/tıklamadan önce başlatmaz.
// iPhone'da audio.volume değiştirilemediği için ses seviyesi Web Audio ile kısılır.
const MUSIC_VOLUME = 0.1;
const musicToggle = document.getElementById("musicToggle");
const music = new Audio("/audio/anamenu.m4a?v=1");
music.loop = true;
music.preload = "auto";

// Müzik her açılışta açık başlar; kullanıcı kapatırsa yalnızca bu ziyaret boyunca kapalı kalır.
let musicMuted = false;

let audioContext;
const startMusic = () => {
  if (musicMuted) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!audioContext && AudioContextClass) {
    audioContext = new AudioContextClass();
    const gain = audioContext.createGain();
    gain.gain.value = MUSIC_VOLUME;
    audioContext.createMediaElementSource(music).connect(gain).connect(audioContext.destination);
  } else if (!AudioContextClass) {
    music.volume = MUSIC_VOLUME;
  }
  audioContext?.resume().catch(() => {});
  music.play().catch(() => {});
};

// İkon gerçekten çalıp çalmadığını gösterir (tarayıcı ilk dokunuşa kadar sesi engelleyebilir).
const renderMusicToggle = () => {
  const silent = music.paused;
  musicToggle.classList.toggle("is-muted", silent);
  musicToggle.setAttribute("aria-label", silent ? "Müziği aç" : "Müziği kapat");
  musicToggle.setAttribute("aria-pressed", String(silent));
};
music.addEventListener("play", renderMusicToggle);
music.addEventListener("pause", renderMusicToggle);

musicToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  if (music.paused) {
    musicMuted = false;
    startMusic();
  } else {
    musicMuted = true;
    music.pause();
  }
});

renderMusicToggle();
startMusic();

// Tarayıcı sesi engellediyse sayfadaki ilk dokunuş/tuşla başlat (hoparlör butonu kendi işini yapar).
const unlockMusic = (event) => {
  if (musicToggle.contains(event.target)) return;
  ["pointerdown", "keydown", "touchstart"].forEach((type) => document.removeEventListener(type, unlockMusic, true));
  startMusic();
};
["pointerdown", "keydown", "touchstart"].forEach((type) => document.addEventListener(type, unlockMusic, true));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) music.pause();
  else if (!musicMuted && audioContext) startMusic();
});
