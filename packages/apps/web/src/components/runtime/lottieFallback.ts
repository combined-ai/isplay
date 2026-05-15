function hasEnhancedLottie(container: HTMLElement) {
  return Array.from(container.children).some((child) => {
    if (!(child instanceof SVGElement) && !(child instanceof HTMLCanvasElement)) return false;
    return !child.classList.contains("platform-static-icon");
  });
}

export function observeLottieFallbacks() {
  const containers = Array.from(document.querySelectorAll<HTMLElement>('.enterprice_img[data-animation-type="lottie"]'));
  if (!containers.length) return () => {};

  const sync = (container: HTMLElement) => {
    container.classList.toggle("is-lottie-enhanced", hasEnhancedLottie(container));
  };

  const observers = containers.map((container) => {
    sync(container);
    const observer = new MutationObserver(() => sync(container));
    observer.observe(container, { childList: true });
    return observer;
  });

  return () => observers.forEach((observer) => observer.disconnect());
}
