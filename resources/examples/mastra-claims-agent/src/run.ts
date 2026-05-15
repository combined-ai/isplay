import { runLab } from "./isplay-lab.js";

runLab().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
