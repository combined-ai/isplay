import type { Noise } from "./noise";
import type { MouseState, WavePoint, WavesConfig } from "./types";

export function buildLines(width: number, height: number, config: WavesConfig) {
  const lines: WavePoint[][] = [];
  const oWidth = width + 50;
  const oHeight = height + 30;
  let { xGap, yGap } = config;
  const maxLines = 130;
  const maxPoints = 90;
  let totalLines = Math.ceil(oWidth / xGap);
  let totalPoints = Math.ceil(oHeight / yGap);

  if (totalLines > maxLines) {
    xGap *= totalLines / maxLines;
    totalLines = maxLines;
  }

  if (totalPoints > maxPoints) {
    yGap *= totalPoints / maxPoints;
    totalPoints = maxPoints;
  }

  const xStart = (width - xGap * totalLines) / 2;
  const yStart = (height - yGap * totalPoints) / 2;
  for (let i = 0; i <= totalLines; i++) {
    const points: WavePoint[] = [];
    for (let j = 0; j <= totalPoints; j++) {
      points.push({
        x: xStart + xGap * i,
        y: yStart + yGap * j,
        wave: { x: 0, y: 0 },
        cursor: { x: 0, y: 0, vx: 0, vy: 0 },
      });
    }
    lines.push(points);
  }

  return lines;
}

export function moveLines(
  lines: WavePoint[][],
  time: number,
  config: WavesConfig,
  noise: Noise,
  mouse: MouseState,
) {
  const { waveSpeedX, waveSpeedY, waveAmpX, waveAmpY, friction, tension, maxCursorMove } = config;

  lines.forEach((points) => {
    points.forEach((point) => {
      const move = noise.perlin2((point.x + time * waveSpeedX) * 0.002, (point.y + time * waveSpeedY) * 0.0015) * 12;
      point.wave.x = Math.cos(move) * waveAmpX;
      point.wave.y = Math.sin(move) * waveAmpY;

      const dx = point.x - mouse.sx;
      const dy = point.y - mouse.sy;
      const dist = Math.hypot(dx, dy);
      const radius = Math.max(175, mouse.vs);
      if (dist < radius) {
        const strength = 1 - dist / radius;
        const force = Math.cos(dist * 0.001) * strength;
        point.cursor.vx += Math.cos(mouse.a) * force * radius * mouse.vs * 0.00065;
        point.cursor.vy += Math.sin(mouse.a) * force * radius * mouse.vs * 0.00065;
      }

      point.cursor.vx += (0 - point.cursor.x) * tension;
      point.cursor.vy += (0 - point.cursor.y) * tension;
      point.cursor.vx *= friction;
      point.cursor.vy *= friction;
      point.cursor.x += point.cursor.vx * 2;
      point.cursor.y += point.cursor.vy * 2;
      point.cursor.x = Math.min(maxCursorMove, Math.max(-maxCursorMove, point.cursor.x));
      point.cursor.y = Math.min(maxCursorMove, Math.max(-maxCursorMove, point.cursor.y));
    });
  });
}

export function moved(point: WavePoint) {
  return {
    x: point.x + point.wave.x + point.cursor.x,
    y: point.y + point.wave.y + point.cursor.y,
  };
}
