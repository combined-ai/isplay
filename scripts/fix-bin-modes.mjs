import { chmodSync, existsSync } from "node:fs";
import path from "node:path";

const bins = [
  path.resolve("packages/apps/cli/dist/index.js")
];

for (const bin of bins) {
  if (existsSync(bin)) chmodSync(bin, 0o755);
}
