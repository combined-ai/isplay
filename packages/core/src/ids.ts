import { createHash, randomUUID } from "node:crypto";

export type IdPrefix =
  | "project"
  | "agent"
  | "run"
  | "event"
  | "model"
  | "proposal"
  | "tool"
  | "fixture"
  | "requirement"
  | "checkpoint"
  | "artifact"
  | "branch"
  | "context"
  | "prompt"
  | "experiment"
  | "arm"
  | "hypothesis"
  | "trial"
  | "attempt"
  | "step"
  | "replay"
  | "intervention"
  | "diff"
  | "metric"
  | "analysis"
  | "evidence"
  | "effect"
  | "export"
  | "job";

export function createId(prefix: IdPrefix): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function stableHash(value: unknown): string {
  const json = stableStringify(value);
  return createHash("sha256").update(json).digest("hex");
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value)) ?? "\"[UNDEFINED]\"";
}

function normalize(value: unknown): unknown {
  if (value === undefined) return { __isplayType: "undefined" };
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (value instanceof Date) return value.toISOString();
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    output[key] = normalize((value as Record<string, unknown>)[key]);
  }
  return output;
}
