import type { WavesConfig, WavesOptions } from "./types";

const DEFAULT_CONFIG: WavesConfig = {
  lineColor: "white",
  backgroundColor: "#010101",
  waveSpeedX: 0.0125,
  waveSpeedY: 0.005,
  waveAmpX: 32,
  waveAmpY: 16,
  xGap: 10,
  yGap: 32,
  friction: 0.925,
  tension: 0.005,
  maxCursorMove: 100,
  lineWidth: 2,
};

export function resolveWavesConfig(options: WavesOptions): WavesConfig {
  return { ...DEFAULT_CONFIG, ...options };
}

export function prepareWaveContainer(container: Element, backgroundColor: string) {
  const htmlContainer = container as HTMLElement;
  htmlContainer.style.position = htmlContainer.style.position || "absolute";
  htmlContainer.style.top = htmlContainer.style.top || "0";
  htmlContainer.style.left = htmlContainer.style.left || "0";
  htmlContainer.style.width = htmlContainer.style.width || "100%";
  htmlContainer.style.height = htmlContainer.style.height || "100%";
  htmlContainer.style.overflow = "hidden";
  htmlContainer.style.backgroundColor = backgroundColor;
  return htmlContainer;
}

export function applyResponsiveConfig(config: WavesConfig, baseConfig: WavesConfig, width: number) {
  Object.assign(config, baseConfig);

  if (width < 480) {
    config.waveAmpX *= 0.5;
    config.waveAmpY *= 0.5;
    config.xGap *= 1.4;
    config.yGap *= 1.4;
    config.lineWidth *= 0.8;
    return;
  }

  if (width < 768) {
    config.waveAmpX *= 0.7;
    config.waveAmpY *= 0.7;
    config.xGap *= 1.2;
    config.yGap *= 1.2;
    config.lineWidth *= 0.9;
    return;
  }

  if (width > 1200) {
    const scale = width / 1200;
    config.xGap *= 1 + 1.3 * (scale - 1);
    config.yGap *= 1 + 1.3 * (scale - 1);
    config.waveAmpX *= 0.9;
    config.waveAmpY *= 0.9;
  }
}
