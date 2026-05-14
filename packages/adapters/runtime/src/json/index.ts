import type { JsonValue, SideEffectClass } from "@isplay/core";

export function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function textOf(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function sideEffectFromToolName(toolName: string): SideEffectClass {
  const lower = toolName.toLowerCase();
  if (lower.includes("read") || lower.includes("search") || lower.includes("fetch") || lower.includes("grep")) return "read";
  if (lower.includes("write") || lower.includes("edit") || lower.includes("patch") || lower.includes("bash")) return "write";
  if (lower.includes("send") || lower.includes("deploy") || lower.includes("delete")) return "external_mutation";
  return "unknown";
}

export function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}
