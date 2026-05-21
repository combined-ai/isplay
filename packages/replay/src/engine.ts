import {
  createId,
  EventSchema,
  nowIso,
  ReplaySchema,
  stableHash,
  toJsonValue,
  type EventRecord,
  type JsonValue,
  type Replay,
  type ReplayPolicy,
  type ToolFixture
} from "@isplay/core";
import { computeReplayDiff } from "./diff.js";
import { ToolFixtureGateway, type ToolRequest } from "./fixture-gateway.js";

export type ReplayEngineInput = {
  replay: Replay;
  baseEvents: EventRecord[];
  branchEvents?: EventRecord[];
  fixtures?: ToolFixture[];
  divergentToolRequest?: Omit<ToolRequest, "projectId" | "replayId" | "branchId">;
  policy?: ReplayPolicy;
};

export type ReplayEngineResult =
  | {
      status: "ok";
      replay: Replay;
      events: EventRecord[];
      diffs: ReturnType<typeof computeReplayDiff>["diffs"];
      metrics: ReturnType<typeof computeReplayDiff>["metrics"];
    }
  | {
      status: "paused";
      replay: Replay;
      requirement: ReturnType<ToolFixtureGateway["resolve"]> extends infer R
        ? R extends { status: "required"; requirement: infer Q }
          ? Q
          : never
        : never;
    }
  | {
      status: "error";
      replay: Replay;
      error: string;
    };

export class ReplayEngine {
  run(input: ReplayEngineInput): ReplayEngineResult {
    const policy = input.policy ?? input.replay.policy;
    const liveError = unsupportedLivePolicy(policy);
    if (liveError) return this.error(input.replay, liveError);

    const branchEvents = input.branchEvents ?? input.baseEvents;
    if (branchEvents.length > policy.maxSteps) return this.error(input.replay, `Replay exceeded maxSteps policy: ${policy.maxSteps}`);
    const toolRequest = input.divergentToolRequest ? { ...input.divergentToolRequest, eventIndex: undefined } : findDivergentToolRequest(input.baseEvents, branchEvents);
    if (toolRequest) {
      if (policy.tool === "blocked") return this.error(input.replay, `Tool policy blocked divergent tool call: ${toolRequest.toolName}`);
      const request = {
        ...toolRequest,
        projectId: input.replay.projectId,
        replayId: input.replay.id,
        branchId: input.replay.branchId
      };
      const resolution = new ToolFixtureGateway(fixturesAllowedByPolicy(input.fixtures ?? [], policy)).resolve(request);
      if (resolution.status === "required") {
        if (policy.tool === "recorded-only") {
          return this.error(input.replay, `Missing recorded fixture for divergent tool call: ${toolRequest.toolName}`);
        }
        return {
          status: "paused",
          replay: ReplaySchema.parse({
            ...input.replay,
            status: "paused",
            pausedRequirementId: resolution.requirement.id
          }),
          requirement: resolution.requirement
        };
      }
      return this.finish({ ...input, branchEvents: substituteFixtureEvent(branchEvents, input.replay, resolution.fixture, toolRequest.eventIndex) }, "aligned");
    }

    return this.finish({ ...input, branchEvents }, policy.model === "recorded-only" && policy.tool === "recorded-only" ? "exact" : "aligned");
  }

  private finish(input: ReplayEngineInput, comparability: "exact" | "aligned"): Extract<ReplayEngineResult, { status: "ok" }> {
    const branchEvents = input.branchEvents ?? input.baseEvents;
    const { diffs, metrics } = computeReplayDiff({
      projectId: input.replay.projectId,
      replayId: input.replay.id,
      baseEvents: input.baseEvents,
      branchEvents
    });
    const firstDivergence = diffs.find((diff) => diff.kind === "trace")?.patch as { firstDivergenceIndex?: number } | undefined;
    return {
      status: "ok",
      replay: ReplaySchema.parse({
        ...input.replay,
        status: "ok",
        firstDivergenceEventId:
          firstDivergence?.firstDivergenceIndex !== undefined && firstDivergence.firstDivergenceIndex >= 0
            ? branchEvents[firstDivergence.firstDivergenceIndex]?.id
            : undefined,
        comparability: firstDivergence?.firstDivergenceIndex === -1 ? comparability : "diverged_but_comparable",
        metadata: { ...input.replay.metadata, replayMode: "recorded_transform" }
      }),
      events: branchEvents,
      diffs,
      metrics
    };
  }

  private error(replay: Replay, error: string): Extract<ReplayEngineResult, { status: "error" }> {
    return { status: "error", error, replay: ReplaySchema.parse({ ...replay, status: "error", error }) };
  }
}

function unsupportedLivePolicy(policy: ReplayPolicy): string | undefined {
  if (policy.model === "pinned-live" || policy.model === "compatible-live") return `Model policy ${policy.model} requires an explicit model executor.`;
  if (policy.tool === "live-readonly" || policy.tool === "live-explicit") return `Tool policy ${policy.tool} requires an explicit tool executor.`;
  return undefined;
}

type DivergentToolRequest = Omit<ToolRequest, "projectId" | "replayId" | "branchId"> & { eventIndex?: number };

function findDivergentToolRequest(baseEvents: EventRecord[], branchEvents: EventRecord[]): DivergentToolRequest | undefined {
  const length = Math.max(baseEvents.length, branchEvents.length);
  for (let index = 0; index < length; index += 1) {
    const branch = branchEvents[index];
    if (!branch || !String(branch.type).startsWith("tool.")) continue;
    if (stableHash(baseEvents[index]?.data) !== stableHash(branch.data)) return { ...eventToToolRequest(branch), eventIndex: index };
  }
  return undefined;
}

function eventToToolRequest(event: EventRecord): Omit<ToolRequest, "projectId" | "replayId" | "branchId"> {
  const data = event.data && typeof event.data === "object" && !Array.isArray(event.data) ? event.data : {};
  const record = data as Record<string, JsonValue>;
  return {
    toolName: typeof record.toolName === "string" ? record.toolName : String(event.refId ?? "unknown"),
    args: (record.args as JsonValue | undefined) ?? {},
    argsArtifactId: typeof record.argsArtifactId === "string" ? record.argsArtifactId : undefined,
    sideEffectClass: typeof record.sideEffectClass === "string" ? record.sideEffectClass : undefined
  };
}

function fixturesAllowedByPolicy(fixtures: ToolFixture[], policy: ReplayPolicy): ToolFixture[] {
  const allowed = allowedFixtureProvenances(policy.tool);
  return fixtures.filter((fixture) => allowed.has(fixture.provenance));
}

function allowedFixtureProvenances(toolPolicy: ReplayPolicy["tool"]): Set<ToolFixture["provenance"]> {
  if (toolPolicy === "recorded-only") return new Set(["recorded"]);
  if (toolPolicy === "analyst-fixture") return new Set(["analyst_fixture"]);
  if (toolPolicy === "simulated") return new Set(["simulator"]);
  if (toolPolicy === "pause-for-fixture") return new Set(["recorded", "analyst_fixture"]);
  return new Set();
}

function substituteFixtureEvent(events: EventRecord[], replay: Replay, fixture: ToolFixture, eventIndex: number | undefined): EventRecord[] {
  const targetIndex = targetToolResultIndex(events, eventIndex);
  const substituted = events.map((event, index) => {
    if (index !== targetIndex) return event;
    const data = event.data && typeof event.data === "object" && !Array.isArray(event.data) ? event.data : {};
    const rest = { ...data };
    delete rest.result;
    delete rest.output;
    return EventSchema.parse({
      ...event,
      data: toJsonValue({
        ...rest,
        status: "ok",
        resultArtifactId: fixture.outputArtifactId,
        resultHash: fixture.outputHash,
        fixtureId: fixture.id,
        fixtureProvenance: fixture.provenance
      }),
      metadata: { ...event.metadata, replayId: replay.id, fixtureId: fixture.id, fixtureProvenance: fixture.provenance, fixtureSubstitution: true }
    });
  });
  return [
    ...substituted,
    EventSchema.parse({
      id: createId("event"),
      createdAt: nowIso(),
      projectId: replay.projectId,
      runId: replay.baseRunId,
      seq: events.length,
      type: "fixture.created",
      refId: fixture.id,
      occurredAt: nowIso(),
      data: toJsonValue(fixture),
      metadata: { replayId: replay.id, provenance: fixture.provenance }
    })
  ].map((event, seq) => EventSchema.parse({ ...event, seq }));
}

function targetToolResultIndex(events: EventRecord[], eventIndex: number | undefined): number {
  if (eventIndex === undefined) return events.length - 1;
  const source = events[eventIndex];
  const refId = source?.refId;
  if (refId) {
    const resultIndex = events.findIndex((event, index) => index >= eventIndex && event.refId === refId && event.type === "tool.finished");
    if (resultIndex >= 0) return resultIndex;
  }
  return eventIndex;
}
