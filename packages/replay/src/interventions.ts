import jsonPatch from "fast-json-patch";
import {
  createId,
  EventSchema,
  nowIso,
  stableHash,
  toJsonValue,
  type EventRecord,
  type Intervention,
  type JsonValue
} from "@isplay/core";

export function applyInterventions(baseEvents: EventRecord[], interventions: Intervention[], replayId: string, runId = baseEvents[0]?.runId ?? replayId): EventRecord[] {
  let events: EventRecord[] = baseEvents.map((event) => EventSchema.parse({ ...event, metadata: { ...event.metadata, replayId } }));
  for (const intervention of interventions) {
    const index = events.findIndex((event) => eventMatchesTarget(event, intervention.targetId));
    if (index >= 0) {
      events[index] = EventSchema.parse({
        ...events[index],
        data: patchValue(events[index].data, intervention.patch),
        metadata: { ...events[index].metadata, interventionId: intervention.id, interventionKind: intervention.kind }
      });
    } else {
      events = [...events, interventionEvent(intervention, events.at(-1)?.seq ?? -1, replayId, runId)];
    }
  }
  return events.map((event, seq) => EventSchema.parse({ ...event, seq }));
}

function eventMatchesTarget(event: EventRecord, targetId: string | undefined): boolean {
  if (!targetId) return false;
  return event.id === targetId || event.refId === targetId || event.type === targetId;
}

function patchValue(value: JsonValue, patch: JsonValue | undefined): JsonValue {
  if (!patch) return value;
  if (hasOperations(patch)) return applyOperations(value, patch.operations);
  if (isObject(value) && isObject(patch)) return normalizePatchedToolArgs({ ...value, ...patch }, patch);
  return patch;
}

function applyOperations(value: JsonValue, operations: JsonValue): JsonValue {
  if (!Array.isArray(operations)) return value;
  const document = JSON.parse(JSON.stringify(value ?? {})) as JsonValue;
  try {
    const normalized = operations.filter(isPatchOperation).map((operation) => {
      if (operation.op === "replace_text") return textOperation(document, operation);
      if (operation.op === "mask_span") return spanOperation(document, operation);
      return operation;
    });
    return jsonPatch.applyPatch(document as never, normalized as never, false, false).newDocument as JsonValue;
  } catch {
    return isObject(value) ? { ...value, isplayPatch: { operations } } : { original: value, isplayPatch: { operations } };
  }
}

function normalizePatchedToolArgs(value: Record<string, JsonValue>, patch: Record<string, JsonValue>): JsonValue {
  if (!("args" in patch)) return value;
  const next = { ...value };
  if (!("argsHash" in patch)) next.argsHash = stableHash(patch.args);
  if (!("argsArtifactId" in patch)) delete next.argsArtifactId;
  return next;
}

function interventionEvent(intervention: Intervention, lastSeq: number, replayId: string, runId: string): EventRecord {
  return EventSchema.parse({
    id: createId("event"),
    createdAt: nowIso(),
    projectId: intervention.projectId,
    runId,
    seq: lastSeq + 1,
    type: "intervention.created",
    refId: intervention.id,
    occurredAt: nowIso(),
    data: toJsonValue(intervention),
    metadata: { replayId, interventionKind: intervention.kind }
  });
}

function isObject(value: JsonValue): value is Record<string, JsonValue> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasOperations(value: JsonValue): value is { operations: JsonValue } {
  return isObject(value) && Array.isArray(value.operations);
}

function isPatchOperation(value: JsonValue): value is { op: string; path: string; value?: JsonValue; from?: string } {
  return isObject(value) && typeof value.op === "string" && typeof value.path === "string";
}

function textOperation(document: JsonValue, operation: { path: string; value?: JsonValue }) {
  const current = pointerValue(document, operation.path);
  const spec = operation.value !== undefined && isObject(operation.value) ? operation.value : {};
  const search = typeof spec.search === "string" ? spec.search : "";
  const replacement = typeof spec.replacement === "string" ? spec.replacement : "[MASKED]";
  return { op: "replace", path: operation.path, value: typeof current === "string" ? current.replaceAll(search, replacement) : (current ?? null) };
}

function spanOperation(document: JsonValue, operation: { path: string; value?: JsonValue }) {
  const current = pointerValue(document, operation.path);
  const spec = operation.value !== undefined && isObject(operation.value) ? operation.value : {};
  const start = typeof spec.start === "number" ? spec.start : 0;
  const end = typeof spec.end === "number" ? spec.end : typeof current === "string" ? current.length : 0;
  const replacement = typeof spec.replacement === "string" ? spec.replacement : "[MASKED]";
  return { op: "replace", path: operation.path, value: typeof current === "string" ? `${current.slice(0, start)}${replacement}${current.slice(end)}` : (current ?? null) };
}

function pointerValue(document: JsonValue, pointer: string): JsonValue | undefined {
  return pointer.split("/").slice(1).reduce<JsonValue | undefined>((value, segment) => (value !== undefined && isObject(value) ? value[segment.replaceAll("~1", "/").replaceAll("~0", "~")] : undefined), document);
}
