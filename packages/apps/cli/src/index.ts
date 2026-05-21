#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runCli } from "./program.js";

export { runCli } from "./program.js";

if (isCliEntrypoint()) await runCli(process.argv);

function isCliEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entrypoint);
  } catch {
    return false;
  }
}
