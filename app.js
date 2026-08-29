const videos = document.querySelectorAll(".background-video");

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
    video.play().catch(() => {});
  });

  if (video.readyState >= 1) {
    video.play().catch(() => {});
  }
});
