import jsonPatch from "fast-json-patch";
import {
  createId,
  EventSchema,
  nowIso,
  stableHash,
  toJsonValue,
  type EventRecord,
  type Intervention,
  type InterventionTarget,
  type JsonValue
} from "@isplay/core";

export type ApplyInterventionsOptions = {
  checkpointSeq?: number;
};

export function applyInterventions(
  baseEvents: EventRecord[],
  interventions: Intervention[],
  replayId: string,
  runId = baseEvents[0]?.runId ?? replayId,
  options: ApplyInterventionsOptions = {}
): EventRecord[] {
  let events: EventRecord[] = baseEvents.map((event) => EventSchema.parse({ ...event, metadata: { ...event.metadata, replayId } }));
  for (const intervention of interventions) {
    const match = findTargetEvent(events, intervention.target, options.checkpointSeq);
    if (match.status === "matched") {
      const index = match.index;
      const hashMatches = !intervention.expectedBaseHash || stableHash(events[index].data) === intervention.expectedBaseHash;
      if (!hashMatches) {
        const mismatchMetadata: Record<string, JsonValue> = {
          targetStatus: "hash_mismatch",
          actualBaseHash: stableHash(events[index].data)
        };
        if (intervention.expectedBaseHash) mismatchMetadata.expectedBaseHash = intervention.expectedBaseHash;
        events = [
          ...events,
          interventionEvent(intervention, events.at(-1)?.seq ?? -1, replayId, runId, mismatchMetadata)
        ];
        continue;
      }
      events[index] = EventSchema.parse({
        ...events[index],
        data: patchValue(events[index].data, intervention.patch, intervention.operations, intervention.target.jsonPointer),
        metadata: { ...events[index].metadata, interventionId: intervention.id, interventionKind: intervention.kind, targetStatus: "applied" }
      });
    } else {
      events = [...events, interventionEvent(intervention, events.at(-1)?.seq ?? -1, replayId, runId, { targetStatus: match.status })];
    }
  }
  return events.map((event, seq) => EventSchema.parse({ ...event, seq }));
}

type TargetMatch = { status: "matched"; index: number } | { status: "before_checkpoint" | "not_found" | "empty_target" };

function findTargetEvent(events: EventRecord[], target: InterventionTarget, checkpointSeq: number | undefined): TargetMatch {
  if (!hasTarget(target)) return { status: "empty_target" };
  const matches = events.map((event, index) => ({ event, index })).filter(({ event }) => eventMatchesTarget(event, target));
  if (!matches.length) return { status: "not_found" };
  const postCheckpoint = checkpointSeq === undefined ? matches[0] : matches.find(({ event }) => event.seq > checkpointSeq);
  if (!postCheckpoint) return { status: "before_checkpoint" };
  return { status: "matched", index: postCheckpoint.index };
}

function eventMatchesTarget(event: EventRecord, target: InterventionTarget): boolean {
  if (target.eventId && event.id !== target.eventId) return false;
  if (target.refId && event.refId !== target.refId) return false;
  if (target.eventType && event.type !== target.eventType) return false;
  if (target.toolName && eventToolName(event) !== target.toolName) return false;
  if (target.modelCallId && eventModelCallId(event) !== target.modelCallId) return false;
  if (target.artifactId && !eventReferencesArtifact(event, target.artifactId)) return false;
  if (target.contextItemId && eventContextItemId(event) !== target.contextItemId) return false;
  if (target.contextPath && eventContextPath(event) !== target.contextPath) return false;
  return true;
}

function patchValue(value: JsonValue, patch: JsonValue | undefined, operations: JsonValue[] = [], jsonPointer?: string): JsonValue {
  const patchOperations = operations.length > 0 ? operations : hasOperations(patch) ? patch.operations : [];
  if (patchOperations.length > 0) return applyOperations(value, prefixOperations(patchOperations, jsonPointer));
  if (!patch) return value;
  if (jsonPointer) return replacePointer(value, jsonPointer, patchValue(pointerValue(value, jsonPointer) ?? null, patch));
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

function interventionEvent(
  intervention: Intervention,
  lastSeq: number,
  replayId: string,
  runId: string,
  metadata: Record<string, JsonValue> = {}
): EventRecord {
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
    metadata: { replayId, interventionKind: intervention.kind, ...metadata }
  });
}

function isObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasOperations(value: JsonValue | undefined): value is { operations: JsonValue[] } {
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

function hasTarget(target: InterventionTarget): boolean {
  return Object.values(target).some((value) => value !== undefined && value !== "");
}

function prefixOperations(operations: JsonValue[], jsonPointer: string | undefined): JsonValue {
  if (!jsonPointer) return operations;
  const prefix = jsonPointer === "/" ? "" : jsonPointer;
  return operations.map((operation) => {
    if (!isPatchOperation(operation)) return operation;
    const prefixed: Record<string, JsonValue> = {
      op: operation.op,
      path: operation.path.startsWith(prefix) ? operation.path : `${prefix}${operation.path === "/" ? "" : operation.path}`
    };
    if (operation.value !== undefined) prefixed.value = operation.value;
    const from = operation.from && !operation.from.startsWith(prefix) ? `${prefix}${operation.from === "/" ? "" : operation.from}` : operation.from;
    if (from) prefixed.from = from;
    return prefixed;
  });
}

function replacePointer(document: JsonValue, pointer: string, value: JsonValue): JsonValue {
  const copy = JSON.parse(JSON.stringify(document ?? {})) as JsonValue;
  const op = pointerValue(copy, pointer) === undefined ? "add" : "replace";
  try {
    return jsonPatch.applyPatch(copy as never, [{ op, path: pointer, value }] as never, false, false).newDocument as JsonValue;
  } catch {
    return isObject(document) ? { ...document, isplayPatch: { pointer, value } } : { original: document, isplayPatch: { pointer, value } };
  }
}

function eventToolName(event: EventRecord): string | undefined {
  return stringDataField(event, "toolName") ?? stringMetadataField(event, "toolName") ?? (event.type.startsWith("tool.") ? event.refId : undefined);
}

function eventModelCallId(event: EventRecord): string | undefined {
  return stringDataField(event, "modelCallId") ?? stringMetadataField(event, "modelCallId") ?? (event.type.startsWith("model_call.") ? event.refId : undefined);
}

function eventContextItemId(event: EventRecord): string | undefined {
  return stringDataField(event, "contextItemId") ?? stringDataField(event, "id") ?? stringMetadataField(event, "contextItemId");
}

function eventContextPath(event: EventRecord): string | undefined {
  return stringDataField(event, "contextPath") ?? stringDataField(event, "path") ?? stringMetadataField(event, "contextPath");
}

function eventReferencesArtifact(event: EventRecord, artifactId: string): boolean {
  return Object.entries(flattenObject(event.data)).some(([key, value]) => key.toLowerCase().endsWith("artifactid") && value === artifactId);
}

function stringDataField(event: EventRecord, field: string): string | undefined {
  return isObject(event.data) && typeof event.data[field] === "string" ? event.data[field] : undefined;
}

function stringMetadataField(event: EventRecord, field: string): string | undefined {
  return typeof event.metadata[field] === "string" ? event.metadata[field] : undefined;
}

function flattenObject(value: JsonValue, prefix = ""): Record<string, JsonValue> {
  if (!isObject(value)) return prefix ? { [prefix]: value } : {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => Object.entries(flattenObject(child, prefix ? `${prefix}.${key}` : key)))
  );
}
