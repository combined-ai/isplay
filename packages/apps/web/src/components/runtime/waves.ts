import { createWaves } from "@/lib/createWaves";

const heroWaveOptions = {
  lineColor: "#AEA6B6",
  backgroundColor: "#010101",
  waveSpeedX: 0.04,
  waveSpeedY: 0.01,
  waveAmpX: 20,
  waveAmpY: 20,
  friction: 0.9,
  tension: 0.01,
  maxCursorMove: 25,
  xGap: 10,
  yGap: 36,
  lineWidth: 2,
};

export function initHeroWaves() {
  const container = document.querySelector(".waves");
  if (!container) return () => {};

  return createWaves(container, heroWaveOptions);
}

export function initFooterWaves() {
  const container = document.querySelector(".footer-waves");
  if (!container) return () => {};

  let destroy: null | (() => void) = null;
  let isRunning = false;
  let footerHeight = (container as HTMLElement).offsetHeight;
  let ticking = false;

  const checkVisibility = () => {
    const scrolledToBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - footerHeight;
    if (scrolledToBottom && !isRunning) {
      destroy = createWaves(container, {
        lineColor: "#978EA1",
        backgroundColor: "#010101",
        waveSpeedX: 0.04,
        waveSpeedY: 0.01,
        waveAmpX: 20,
        waveAmpY: 20,
        friction: 0.9,
        tension: 0.01,
        maxCursorMove: 25,
        xGap: 12,
        yGap: 36,
        lineWidth: 2,
      });
      isRunning = true;
    } else if (!scrolledToBottom && isRunning) {
      destroy?.();
      destroy = null;
      isRunning = false;
    }
  };

  const updateFooterHeight = () => {
    footerHeight = (container as HTMLElement).offsetHeight;
    checkVisibility();
  };
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        checkVisibility();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", updateFooterHeight);
  checkVisibility();

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", updateFooterHeight);
    destroy?.();
  };
}
