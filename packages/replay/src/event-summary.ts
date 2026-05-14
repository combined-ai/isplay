import { stableHash, type EventRecord, type JsonValue } from "@isplay/core";

export function summarizeEvent(event: EventRecord | undefined): Record<string, JsonValue> | null {
  if (!event) return null;
  const data = isRecord(event.data) ? event.data : {};
  return {
    id: event.id,
    seq: event.seq,
    type: event.type,
    refId: event.refId ?? null,
    toolName: stringField(data, "toolName"),
    status: stringField(data, "status"),
    args: data.args ?? null,
    result: data.result ?? data.output ?? null,
    argsHash: stringField(data, "argsHash"),
    argsArtifactId: stringField(data, "argsArtifactId"),
    resultHash: stringField(data, "resultHash"),
    resultArtifactId: stringField(data, "resultArtifactId"),
    sideEffectClass: stringField(data, "sideEffectClass"),
    interventionId: stringField(event.metadata, "interventionId"),
    interventionKind: stringField(event.metadata, "interventionKind")
  };
}

export function isToolEvent(event: EventRecord | undefined): boolean {
  return Boolean(event && String(event.type).startsWith("tool."));
}

export function changedKeys(left: Record<string, JsonValue> | null, right: Record<string, JsonValue> | null): string[] {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  return Array.from(keys).filter((key) => stableHash(left?.[key]) !== stableHash(right?.[key]));
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringField(record: Record<string, JsonValue>, key: string): JsonValue {
  return typeof record[key] === "string" ? record[key] : null;
}
