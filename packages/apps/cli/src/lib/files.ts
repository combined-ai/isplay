import { readFile } from "node:fs/promises";

export async function readJsonInput(value: string): Promise<unknown> {
  if (value.trim().startsWith("{") || value.trim().startsWith("[")) return JSON.parse(value);
  if (value.endsWith(".yml") || value.endsWith(".yaml")) {
    throw new Error("YAML input is not enabled in this build. Use JSON input or install a YAML parser integration.");
  }
  return JSON.parse(await readFile(value, "utf8"));
}

export function looksLikeJsonInput(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[") || value.endsWith(".json") || value.endsWith(".yml") || value.endsWith(".yaml");
}
