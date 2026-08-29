const videos = [...document.querySelectorAll(".background-video")];
const panel = document.getElementById("videoPanel");
const toggle = document.querySelector(".panel-toggle");
let isOpen = false;
const reverseFrames = new WeakMap();

const activeVideo = () => videos.find((video) => getComputedStyle(video).display !== "none");

const playActiveVideo = () => {
  if (!isOpen) return;
  const video = activeVideo();
  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.play().catch(() => {});
};

const reverseVideo = (video, timestamp) => {
  const previous = reverseFrames.get(video) || timestamp;
  const elapsed = Math.min(timestamp - previous, 100);
  const nextTime = video.currentTime - elapsed / 1000;

  if (nextTime <= 0) {
    reverseFrames.delete(video);
    video.currentTime = 0;
    if (isOpen && activeVideo() === video) playActiveVideo();
    return;
  }

  video.currentTime = nextTime;
  reverseFrames.set(video, timestamp);
  requestAnimationFrame((next) => reverseVideo(video, next));
};

videos.forEach((video) => {
  video.addEventListener("ended", () => {
    video.pause();
    video.currentTime = Math.max(video.duration - 0.01, 0);
    reverseFrames.set(video, 0);
    requestAnimationFrame((next) => reverseVideo(video, next));
  });
});

toggle?.addEventListener("click", () => {
  isOpen = !isOpen;
  panel?.classList.toggle("is-open", isOpen);
  panel?.setAttribute("aria-hidden", String(!isOpen));
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.textContent = isOpen ? "Videoyu Kapat" : "Videoyu Aç";

  if (isOpen) {
    playActiveVideo();
  } else {
    videos.forEach((video) => video.pause());
  }
});
