const toast = document.getElementById("toast");
let toastTimer;

const authBar = document.getElementById("authBar");

// Oturumdaki kullanıcı (yoksa null); menü tıklamaları bunu bekler.
const currentUser = fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((data) => data?.user || null)
  .catch(() => null);

const openSection = (button) => {
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
        const next = `/${button.getAttribute("href")}`;
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

  const name = document.createElement("span");
  name.className = "auth-bar-user";
  name.textContent = user.name || user.email;

  const logout = document.createElement("button");
  logout.type = "button";
  logout.className = "auth-bar-link";
  logout.textContent = "Çıkış";
  logout.addEventListener("click", () => {
    fetch("/api/logout", { method: "POST", credentials: "same-origin" })
      .finally(() => window.location.reload());
  });

  authBar.replaceChildren(name, logout);
});

// Arka plan müziği: çok kısık, döngüde. Tarayıcılar sesi ilk dokunuş/tıklamadan önce başlatmaz.
// iPhone'da audio.volume değiştirilemediği için ses seviyesi Web Audio ile kısılır.
const MUSIC_VOLUME = 0.2;
const musicToggle = document.getElementById("musicToggle");
const music = new Audio("/audio/anamenu.m4a?v=1");
music.loop = true;
music.preload = "auto";

let musicMuted = false;
try { musicMuted = localStorage.getItem("ezo_muzik") === "kapali"; } catch {}

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

const renderMusicToggle = () => {
  musicToggle.classList.toggle("is-muted", musicMuted);
  musicToggle.setAttribute("aria-label", musicMuted ? "Müziği aç" : "Müziği kapat");
  musicToggle.setAttribute("aria-pressed", String(musicMuted));
};

musicToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  musicMuted = !musicMuted;
  try { localStorage.setItem("ezo_muzik", musicMuted ? "kapali" : "acik"); } catch {}
  renderMusicToggle();
  if (musicMuted) music.pause();
  else startMusic();
});

renderMusicToggle();
startMusic();
["pointerdown", "keydown", "touchstart"].forEach((type) =>
  document.addEventListener(type, startMusic, { once: true, capture: true }),
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) music.pause();
  else if (!musicMuted && audioContext) startMusic();
});
