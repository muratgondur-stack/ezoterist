const panel = document.getElementById("videoPanel");
const toggle = document.querySelector(".panel-toggle");
const video = document.getElementById("backgroundVideo");
const portraitQuery = window.matchMedia("(orientation: portrait)");

let isOpen = false;

const sourceForViewport = () =>
  portraitQuery.matches ? "/ezoterist-bg-portrait.mp4?v=3" : "/ezoterist-bg-landscape.mp4?v=3";

const loadVideo = (shouldPlay = false) => {
  const source = sourceForViewport();
  if (video.dataset.source === source) {
    if (shouldPlay) video.play().catch(() => {});
    return;
  }

  video.dataset.source = source;
  video.src = source;
  video.loop = true;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.load();

  if (shouldPlay) video.play().catch(() => {});
};

toggle?.addEventListener("click", () => {
  isOpen = !isOpen;
  panel?.classList.toggle("is-open", isOpen);
  panel?.setAttribute("aria-hidden", String(!isOpen));
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.textContent = isOpen ? "Videoyu Kapat" : "Videoyu Aç";

  if (isOpen) {
    loadVideo(true);
  } else {
    video.pause();
  }
});

portraitQuery.addEventListener("change", () => {
  loadVideo(isOpen);
});

loadVideo();
