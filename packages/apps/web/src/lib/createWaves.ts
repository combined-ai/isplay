import { applyResponsiveConfig, prepareWaveContainer, resolveWavesConfig } from "./waves/config";
import { drawLines } from "./waves/draw";
import { buildLines, moveLines } from "./waves/field";
import { Noise } from "./waves/noise";
import type { Bounds, MouseState, WavePoint, WavesOptions } from "./waves/types";

function createMouseState(): MouseState {
  return { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
}

export function createWaves(container: Element, options: WavesOptions = {}) {
  const canvas = container.querySelector<HTMLCanvasElement>(".waves-canvas");
  if (!canvas) return () => {};

  const context = canvas.getContext("2d");
  if (!context) return () => {};

  const canvasEl = canvas;
  const ctx = context;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const config = resolveWavesConfig(options);
  const baseConfig = { ...config };
  const htmlContainer = prepareWaveContainer(container, config.backgroundColor);
  const bounding: Bounds = { width: 0, height: 0 };
  const noise = new Noise(Math.random());
  const lines: WavePoint[][] = [];
  const mouse = createMouseState();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const frameInterval = 1000 / 30;
  let frameId = 0;
  let lastFrame = 0;
  let running = false;
  let inViewport = true;
  let boundsRect = container.getBoundingClientRect();

  function setSize() {
    const rect = container.getBoundingClientRect();
    boundsRect = rect;
    bounding.width = rect.width;
    bounding.height = rect.height;
    applyResponsiveConfig(config, baseConfig, bounding.width);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvasEl.width = bounding.width * dpr;
    canvasEl.height = bounding.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function setLines() {
    lines.splice(0, lines.length, ...buildLines(bounding.width, bounding.height, config));
  }

  function tick(time: number) {
    if (!running) return;
    frameId = requestAnimationFrame(tick);
    if (document.hidden || !inViewport || time - lastFrame < frameInterval) return;

    lastFrame = time;
    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;

    const dx = mouse.x - mouse.lx;
    const dy = mouse.y - mouse.ly;
    const distance = Math.hypot(dx, dy);
    mouse.v = distance;
    mouse.vs += (distance - mouse.vs) * 0.1;
    mouse.vs = Math.min(100, mouse.vs);
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);

    htmlContainer.style.setProperty("--x", `${mouse.sx}px`);
    htmlContainer.style.setProperty("--y", `${mouse.sy}px`);
    moveLines(lines, time, config, noise, mouse);
    drawLines(ctx, bounding, config, lines);
  }

  function onResize() {
    setSize();
    setLines();
    drawLines(ctx, bounding, config, lines);
  }

  function updateMouse(x: number, y: number) {
    mouse.x = x - boundsRect.left;
    mouse.y = y - boundsRect.top;
    if (mouse.set) return;

    mouse.sx = mouse.x;
    mouse.sy = mouse.y;
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.set = true;
  }

  function onMouseMove(event: MouseEvent) {
    updateMouse(event.clientX, event.clientY);
  }

  function onTouchMove(event: TouchEvent) {
    const touch = event.touches[0];
    if (touch) updateMouse(touch.clientX, touch.clientY);
  }

  function start() {
    if (running || document.hidden || !inViewport || reduceMotion.matches) return;
    running = true;
    frameId = requestAnimationFrame(tick);
  }

  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frameId);
  }

  function syncRunning() {
    if (document.hidden || !inViewport || reduceMotion.matches) stop();
    else start();
  }

  const viewportObserver = new IntersectionObserver(
    (entries) => {
      inViewport = entries.some((entry) => entry.isIntersecting);
      syncRunning();
    },
    { root: null, rootMargin: "160px 0px", threshold: 0 },
  );

  setSize();
  setLines();
  drawLines(ctx, bounding, config, lines);
  viewportObserver.observe(htmlContainer);
  start();

  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", syncRunning);
  reduceMotion.addEventListener("change", syncRunning);
  htmlContainer.addEventListener("mousemove", onMouseMove);
  htmlContainer.addEventListener("touchmove", onTouchMove, { passive: true });

  return function destroy() {
    stop();
    viewportObserver.disconnect();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", syncRunning);
    reduceMotion.removeEventListener("change", syncRunning);
    htmlContainer.removeEventListener("mousemove", onMouseMove);
    htmlContainer.removeEventListener("touchmove", onTouchMove);
  };
}
