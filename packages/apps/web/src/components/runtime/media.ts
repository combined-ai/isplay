export function initVideoScrollTriggers() {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-video="playpause"]'));
  if (!targets.length) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target.querySelector<HTMLVideoElement>("video");
        if (!video) return;

        if (entry.isIntersecting) {
          if (!video.src && video.dataset.src) video.src = video.dataset.src;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { root: null, rootMargin: "35% 0px", threshold: 0 },
  );

  targets.forEach((target) => {
    observer.observe(target);
  });

  return () => {
    targets.forEach((target) => {
      target.querySelector<HTMLVideoElement>("video")?.pause();
    });
    observer.disconnect();
  };
}
