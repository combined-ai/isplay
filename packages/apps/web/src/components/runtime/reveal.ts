const revealSelector = [
  '[data-fade-in="opacity"]',
  '[data-fade-in="move"]',
  '[data-fade-in-stagger="word"]',
  '[data-fade-in-stagger="line"]',
].join(",");

const loadingClass = "wf-ix3-loading";
const oldRevealedClass = "wf-ix3-revealed";
const pendingClass = "is-reveal-pending";
const visibleClass = "is-reveal-visible";

function isInRevealRange(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const preloadDistance = Math.min(160, window.innerHeight * 0.16);
  return rect.top < window.innerHeight + preloadDistance && rect.bottom > -preloadDistance;
}

export function initScrollReveals() {
  const root = document.documentElement;
  const targets = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));
  const transitionTimers = new Map<HTMLElement, number>();

  root.classList.remove(oldRevealedClass);

  if (!targets.length) {
    root.classList.remove(loadingClass);
    return () => {};
  }

  const reveal = (target: HTMLElement) => {
    if (target.classList.contains(visibleClass)) return;
    target.classList.add(visibleClass);
    transitionTimers.set(
      target,
      window.setTimeout(() => {
        target.classList.remove(pendingClass);
        transitionTimers.delete(target);
      }, 700),
    );
  };

  targets.forEach((target) => {
    target.classList.add(pendingClass);
    if (isInRevealRange(target)) reveal(target);
  });
  root.classList.remove(loadingClass);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    targets.forEach(reveal);
    return () => {
      transitionTimers.forEach((timer) => window.clearTimeout(timer));
      targets.forEach((target) => target.classList.remove(pendingClass, visibleClass));
    };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target as HTMLElement;
        reveal(target);
        observer.unobserve(target);
      });
    },
    { root: null, rootMargin: "0px 0px 16% 0px", threshold: 0.01 },
  );

  targets.forEach((target) => {
    if (!target.classList.contains(visibleClass)) observer.observe(target);
  });

  return () => {
    observer.disconnect();
    transitionTimers.forEach((timer) => window.clearTimeout(timer));
    targets.forEach((target) => target.classList.remove(pendingClass, visibleClass));
  };
}
