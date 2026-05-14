import {
  ContextItemKindSchema,
  ContextItemSchema,
  stableHash,
  type ContextItem,
  type EventRecord,
  type JsonValue
} from "@isplay/core";

export function contextFromEvents(projectId: string, runId: string, events: EventRecord[]): ContextItem[] {
  return events.flatMap((event) => {
    if (event.type === "context.annotation") return annotationItem(projectId, runId, event);
    if (event.type.includes("retrieval") || event.type.includes("memory")) {
      return [
        item(projectId, runId, event.type.includes("memory") ? "memory_item" : "retrieval_chunk", `event.${event.seq}`, event.data, {
          sourceEventId: event.id
        })
      ];
    }
    return [];
  });
}

function annotationItem(projectId: string, runId: string, event: EventRecord): ContextItem[] {
  const data = objectData(event.data);
  const kind = ContextItemKindSchema.safeParse(data.kind).success ? ContextItemKindSchema.parse(data.kind) : "prompt_clause";
  const path = typeof data.path === "string" ? data.path : `annotation.${event.seq}`;
  const value = data.value ?? data.label ?? event.data;
  return [
    item(projectId, runId, kind, path, value, {
      sourceEventId: event.id,
      modelCallId: typeof data.modelCallId === "string" ? data.modelCallId : undefined,
      checkpointId: typeof data.checkpointId === "string" ? data.checkpointId : undefined,
      contentArtifactId: typeof data.artifactId === "string" ? data.artifactId : undefined,
      contentHash: typeof data.contentHash === "string" ? data.contentHash : undefined,
      ordinal: typeof data.ordinal === "number" ? data.ordinal : undefined,
      provenance: typeof data.provenance === "string" ? data.provenance : "annotation",
      visibility: validVisibility(data.visibility, kind),
      redactionState: validRedaction(data.redactionState),
      metadata: objectData(data.metadata)
    })
  ];
}

function item(
  projectId: string,
  runId: string,
  kind: ContextItem["kind"],
  path: string,
  value: JsonValue,
  extra: Partial<ContextItem> = {}
): ContextItem {
  const contentHash = extra.contentHash ?? stableHash(value);
  const id = stableHash({ projectId, runId, kind, path, contentHash, sourceEventId: extra.sourceEventId });
  return ContextItemSchema.parse({
    id: `context_${id.slice(0, 32)}`,
    createdAt: new Date(0).toISOString(),
    projectId,
    runId,
    kind,
    path,
    contentHash,
    provenance: "captured",
    visibility: kind === "state_field" ? "state_only" : "model_visible",
    redactionState: "raw",
    metadata: {},
    ...extra
  });
}

function objectData(value: unknown): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, JsonValue>) : {};
}

function validVisibility(value: JsonValue | undefined, kind: ContextItem["kind"]): ContextItem["visibility"] {
  if (value === "model_visible" || value === "tool_visible" || value === "state_only" || value === "metadata_only") return value;
  return kind === "state_field" ? "state_only" : "model_visible";
}

function validRedaction(value: JsonValue | undefined): ContextItem["redactionState"] {
  if (value === "raw" || value === "redacted" || value === "metadata_only") return value;
  return "raw";
}
