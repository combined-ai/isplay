import jsonPatch from "fast-json-patch";
import {
  createId,
  DiffSchema,
  MetricSchema,
  nowIso,
  stableHash,
  type DiffRecord,
  type EventRecord,
  type JsonValue,
  type Metric
} from "@isplay/core";
import { changedKeys, isToolEvent, summarizeEvent } from "./event-summary.js";

export type ReplayDiffInput = {
  projectId: string;
  replayId: string;
  baseEvents: EventRecord[];
  branchEvents: EventRecord[];
  baseState?: JsonValue;
  branchState?: JsonValue;
};

export function computeReplayDiff(input: ReplayDiffInput): { diffs: DiffRecord[]; metrics: Metric[] } {
  const firstDivergenceIndex = findFirstDivergence(input.baseEvents, input.branchEvents);
  const comparability =
    firstDivergenceIndex === -1
      ? "exact"
      : firstDivergenceIndex < Math.min(input.baseEvents.length, input.branchEvents.length)
        ? "diverged_but_comparable"
        : "aligned";

  const tracePatch = {
    firstDivergenceIndex,
    baseEventId: firstDivergenceIndex >= 0 ? input.baseEvents[firstDivergenceIndex]?.id ?? null : null,
    branchEventId: firstDivergenceIndex >= 0 ? input.branchEvents[firstDivergenceIndex]?.id ?? null : null,
    baseEventCount: input.baseEvents.length,
    branchEventCount: input.branchEvents.length,
    baseEvent: summarizeEvent(input.baseEvents[firstDivergenceIndex]),
    branchEvent: summarizeEvent(input.branchEvents[firstDivergenceIndex])
  };

  const diffs: DiffRecord[] = [
    DiffSchema.parse({
      id: createId("diff"),
      createdAt: nowIso(),
      projectId: input.projectId,
      replayId: input.replayId,
      kind: "trace",
      comparability,
      patch: tracePatch,
      summary: firstDivergenceIndex === -1 ? "Replay trace matched the base event sequence." : "Replay diverged from the base event sequence.",
      metadata: {}
    })
  ];

  if (input.baseState !== undefined || input.branchState !== undefined) {
    diffs.push(
      DiffSchema.parse({
        id: createId("diff"),
        createdAt: nowIso(),
        projectId: input.projectId,
        replayId: input.replayId,
        kind: "state",
        comparability,
        patch: jsonPatch.compare((input.baseState ?? {}) as never, (input.branchState ?? {}) as never) as unknown as JsonValue,
        summary: "State JSON Patch between base checkpoint and replay branch.",
        metadata: {}
      })
    );
  }
  const toolChange = firstDivergenceIndex >= 0 ? changedToolDiff(input, firstDivergenceIndex, comparability) : undefined;
  if (toolChange) diffs.push(toolChange.diff);

  const metrics: Metric[] = [
    MetricSchema.parse({
      id: createId("metric"),
      createdAt: nowIso(),
      projectId: input.projectId,
      replayId: input.replayId,
      name: "first_divergence_step",
      value: firstDivergenceIndex,
      provenance: "deterministic",
      metadata: {}
    }),
    MetricSchema.parse({
      id: createId("metric"),
      createdAt: nowIso(),
      projectId: input.projectId,
      replayId: input.replayId,
      name: "tool_sequence_distance",
      value: toolSequenceDistance(input.baseEvents, input.branchEvents),
      provenance: "deterministic",
      metadata: {}
    }),
    MetricSchema.parse({
      id: createId("metric"),
      createdAt: nowIso(),
      projectId: input.projectId,
      replayId: input.replayId,
      name: "fixture_dependency_count",
      value: input.branchEvents.filter((event) => event.type === "fixture.created").length,
      provenance: "deterministic",
      metadata: {}
    })
  ];
  if (toolChange) {
    metrics.push(
      MetricSchema.parse({
        id: createId("metric"),
        createdAt: nowIso(),
        projectId: input.projectId,
        replayId: input.replayId,
        name: "tool_argument_changed",
        value: toolChange.changedFields.some((field) => ["args", "argsHash", "argsArtifactId"].includes(field)) ? 1 : 0,
        provenance: "deterministic",
        metadata: { step: firstDivergenceIndex }
      })
    );
  }

  return { diffs, metrics };
}

export function findFirstDivergence(left: EventRecord[], right: EventRecord[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (eventSignature(left[index]) !== eventSignature(right[index])) return index;
  }
  return left.length === right.length ? -1 : length;
}

function eventSignature(event: EventRecord | undefined): string {
  if (!event) return "";
  return stableHash({ type: event.type, refId: event.refId, data: normalizeEventData(event.data) });
}

function changedToolDiff(input: ReplayDiffInput, index: number, comparability: DiffRecord["comparability"]): { diff: DiffRecord; changedFields: string[] } | undefined {
  const base = input.baseEvents[index];
  const branch = input.branchEvents[index];
  if (!isToolEvent(base) && !isToolEvent(branch)) return undefined;
  const baseSummary = summarizeEvent(base);
  const branchSummary = summarizeEvent(branch);
  const changedFields = changedKeys(baseSummary, branchSummary);
  return {
    changedFields,
    diff: DiffSchema.parse({
      id: createId("diff"),
      createdAt: nowIso(),
      projectId: input.projectId,
      replayId: input.replayId,
      kind: "tool",
      comparability,
      patch: { step: index, base: baseSummary, branch: branchSummary, changedFields },
      summary: `Tool event changed at step ${index}: ${changedFields.join(", ") || "event shape changed"}.`,
      metadata: {}
    })
  };
}

function normalizeEventData(data: JsonValue): JsonValue {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const { id: _id, createdAt: _createdAt, startedAt: _startedAt, endedAt: _endedAt, occurredAt: _occurredAt, ...rest } = data as Record<string, JsonValue>;
  return rest;
}

function toolSequenceDistance(left: EventRecord[], right: EventRecord[]): number {
  const leftTools = left.filter((event) => String(event.type).startsWith("tool.")).map((event) => String(event.refId ?? event.type));
  const rightTools = right.filter((event) => String(event.type).startsWith("tool.")).map((event) => String(event.refId ?? event.type));
  const max = Math.max(leftTools.length, rightTools.length);
  if (!max) return 0;
  let changed = Math.abs(leftTools.length - rightTools.length);
  for (let index = 0; index < Math.min(leftTools.length, rightTools.length); index += 1) {
    if (leftTools[index] !== rightTools[index]) changed += 1;
  }
  return changed / max;
}
