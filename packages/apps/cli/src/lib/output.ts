import type { Command } from "commander";

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function jsonEnabled(command: Command): boolean {
  return Boolean(command.optsWithGlobals<{ json?: boolean }>().json);
}

export function printDoctor(value: unknown, command: Command): void {
  if (jsonEnabled(command)) {
    printJson(value);
    return;
  }
  const result = value as Record<string, string>;
  for (const [key, item] of Object.entries(result)) console.log(`${key}: ${item}`);
}
