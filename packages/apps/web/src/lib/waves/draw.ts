import { moved } from "./field";
import type { Bounds, WavePoint, WavesConfig } from "./types";

function drawSmoothLine(context: CanvasRenderingContext2D, points: WavePoint[]) {
  if (points.length < 2) return;

  const p0 = moved(points[0]);
  context.moveTo(p0.x, p0.y);
  for (let i = 1; i < points.length - 1; i++) {
    const current = moved(points[i]);
    const next = moved(points[i + 1]);
    context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }

  const last = moved(points[points.length - 1]);
  context.lineTo(last.x, last.y);
}

export function drawLines(
  context: CanvasRenderingContext2D,
  bounds: Bounds,
  config: WavesConfig,
  lines: WavePoint[][],
) {
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.beginPath();
  context.strokeStyle = config.lineColor;
  context.lineWidth = config.lineWidth;
  lines.forEach((points) => drawSmoothLine(context, points));
  context.stroke();
}
