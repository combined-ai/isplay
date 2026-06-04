import { toJsonValue as coreToJsonValue, type JsonValue, type SideEffectClass } from "@isplay/core";

export function toJsonValue(value: unknown): JsonValue {
  return coreToJsonValue(value);
}

export function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function textOf(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function sideEffectFromToolName(toolName: string): SideEffectClass {
  const lower = toolName.toLowerCase();
  if (/(bash|shell|exec|terminal|command|code|python|node|script|deploy|send|delete|remove|write|edit|patch|apply)/.test(lower)) return "external_mutation";
  if (/(read|search|fetch|grep|get|list|query|lookup|retrieve)/.test(lower)) return "read";
  return "unknown";
}

export function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}
