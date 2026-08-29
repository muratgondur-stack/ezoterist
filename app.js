const videos = document.querySelectorAll(".background-video");
const panel = document.getElementById("videoPanel");
const toggle = document.querySelector(".panel-toggle");
let isOpen = false;

const playVideos = () => {
  if (!isOpen) return;
  videos.forEach((video) => video.play().catch(() => {}));
};

toggle?.addEventListener("click", () => {
  isOpen = !isOpen;
  panel?.classList.toggle("is-open", isOpen);
  panel?.setAttribute("aria-hidden", String(!isOpen));
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.textContent = isOpen ? "Videoyu Kapat" : "Videoyu Aç";

  if (isOpen) {
    playVideos();
  } else {
    videos.forEach((video) => video.pause());
  }
});

videos.forEach((video) => {
  let direction = 1;
  let lastTime = 0;

  const reverse = (timestamp) => {
    if (!lastTime) lastTime = timestamp;
    const elapsed = Math.min(timestamp - lastTime, 100);
    lastTime = timestamp;

    if (video.readyState >= 2 && Number.isFinite(video.duration)) {
      const nextTime = video.currentTime - elapsed / 1000;

      if (nextTime <= 0) {
        direction = 1;
        lastTime = 0;
        video.currentTime = 0;
        video.play().catch(() => {});
        return;
      }

      video.currentTime = nextTime;
    }

    requestAnimationFrame(reverse);
  };

  video.addEventListener("ended", () => {
    direction = -1;
    lastTime = 0;
    video.pause();
    video.currentTime = Math.max(video.duration - 0.01, 0);
    requestAnimationFrame(reverse);
  });

  video.addEventListener("loadedmetadata", () => {
    playVideos();
  });

  if (video.readyState >= 1) {
    playVideos();
  }
});
