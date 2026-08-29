const videos = document.querySelectorAll(".background-video");

videos.forEach((video) => {
  let direction = 1;
  let lastTime = 0;

  const animate = (timestamp) => {
    if (!lastTime) lastTime = timestamp;
    const elapsed = Math.min(timestamp - lastTime, 100);
    lastTime = timestamp;

    if (video.readyState >= 2 && Number.isFinite(video.duration)) {
      const step = (elapsed / 1000) * direction;
      const nextTime = video.currentTime + step;

      if (nextTime >= video.duration) {
        direction = -1;
        video.currentTime = Math.max(video.duration - 0.01, 0);
      } else if (nextTime <= 0) {
        direction = 1;
        video.currentTime = 0;
      } else {
        video.currentTime = nextTime;
      }
    }

    requestAnimationFrame(animate);
  };

  video.addEventListener("loadedmetadata", () => {
    video.pause();
    requestAnimationFrame(animate);
  });

  if (video.readyState >= 1) {
    video.pause();
    requestAnimationFrame(animate);
  }
});
