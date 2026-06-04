import {
  createId,
  nowIso,
  stableHash,
  toJsonValue,
  type EventRecord,
  type FixtureRequirement,
  type Replay,
  type ReplayAttempt,
  type ToolFixture
} from "@isplay/core";
import type { IsplayStore } from "@isplay/postgres";

export async function startAttempt(store: IsplayStore, replay: Replay): Promise<ReplayAttempt> {
  return store.putReplayAttempt({
    id: createId("attempt"),
    createdAt: nowIso(),
    recordVersion: 1,
    projectId: replay.projectId,
    replayId: replay.id,
    baseRunId: replay.baseRunId,
    branchId: replay.branchId,
    experimentId: replay.experimentId,
    armId: replay.armId,
    trialIndex: replay.trialIndex,
    status: "running",
    mode: replay.branchId ? "counterfactual" : "recorded",
    policy: replay.policy,
    startedAt: nowIso(),
    metadata: {}
  });
}

export async function recordOkAttempt(
  store: IsplayStore,
  attempt: ReplayAttempt,
  replay: Replay,
  baseEvents: EventRecord[],
  derivedEvents: EventRecord[]
): Promise<void> {
  await recordSteps(store, attempt, baseEvents, derivedEvents);
  await recordFixtureUses(store, attempt, derivedEvents);
  await store.putReplayAttempt({ ...attempt, status: "ok", comparability: replay.comparability, endedAt: nowIso() });
}

export async function recordPausedAttempt(
  store: IsplayStore,
  attempt: ReplayAttempt,
  baseEvents: EventRecord[],
  derivedEvents: EventRecord[],
  requirement: FixtureRequirement
): Promise<void> {
  await recordSteps(store, attempt, baseEvents, derivedEvents);
  await store.putReplayStep({
    id: createId("step"),
    createdAt: nowIso(),
    recordVersion: 1,
    projectId: attempt.projectId,
    attemptId: attempt.id,
    replayId: attempt.replayId,
    seq: derivedEvents.length,
    decision: "require_fixture",
    inputHash: requirement.argsHash,
    details: toJsonValue(requirement),
    metadata: {}
  });
  await store.putReplayAttempt({ ...attempt, status: "paused", endedAt: nowIso(), failure: { reason: "missing_fixture", message: requirement.reason, requirementId: requirement.id, recoverable: true } });
}

export async function recordErrorAttempt(store: IsplayStore, attempt: ReplayAttempt, message: string): Promise<void> {
  await store.putReplayAttempt({
    ...attempt,
    status: "error",
    endedAt: nowIso(),
    failure: { reason: failureReason(message), message, recoverable: false }
  });
}

async function recordSteps(store: IsplayStore, attempt: ReplayAttempt, baseEvents: EventRecord[], derivedEvents: EventRecord[]): Promise<void> {
  const length = Math.max(baseEvents.length, derivedEvents.length);
  for (let seq = 0; seq < length; seq += 1) {
    const base = baseEvents[seq];
    const derived = derivedEvents[seq];
    await store.putReplayStep({
      id: createId("step"),
      createdAt: nowIso(),
      recordVersion: 1,
      projectId: attempt.projectId,
      attemptId: attempt.id,
      replayId: attempt.replayId,
      seq,
      baseEventId: base?.id,
      derivedEventId: derived?.id,
      decision: stepDecision(base, derived),
      inputHash: base ? stableHash(base) : undefined,
      outputHash: derived ? stableHash(derived) : undefined,
      details: derived ? toJsonValue({ type: derived.type, refId: derived.refId, metadata: derived.metadata }) : undefined,
      metadata: {}
    });
  }
}

async function recordFixtureUses(store: IsplayStore, attempt: ReplayAttempt, events: EventRecord[]): Promise<void> {
  const requirements = await store.listFixtureRequirements(attempt.replayId);
  for (const event of events.filter((item) => item.type === "fixture.created")) {
    const fixture = fixtureData(event.data);
    const requirement = requirements.find((item) => item.toolName === event.refId || item.argsHash === fixture.matcherArgsHash);
    await store.putFixtureUse({
      id: createId("fixture"),
      createdAt: nowIso(),
      recordVersion: 1,
      projectId: attempt.projectId,
      attemptId: attempt.id,
      replayId: attempt.replayId,
      fixtureId: fixture.id,
      requirementId: requirement?.id,
      injectedEventId: event.id,
      argsHash: fixture.matcherArgsHash,
      outputHash: fixture.outputHash,
      metadata: fixture.provenance ? { provenance: fixture.provenance } : {}
    });
  }
}

function stepDecision(base: EventRecord | undefined, derived: EventRecord | undefined) {
  if (!derived) return "stop";
  if (derived.type === "fixture.created") return "inject_fixture";
  if (derived.metadata.interventionId || derived.type === "intervention.created") return "apply_intervention";
  return base && stableHash(base.data) === stableHash(derived.data) && base.type === derived.type ? "copy_recorded" : "apply_intervention";
}

function failureReason(message: string) {
  if (message.includes("policy")) return "unsupported_live_policy";
  if (message.includes("Artifact") || message.includes("artifact")) return "artifact_missing";
  if (message.includes("conflict") || message.includes("Conflicting")) return "store_conflict";
  if (message.includes("target") || message.includes("Target")) return "target_not_found";
  return "missing_fixture";
}

function fixtureData(data: EventRecord["data"]): { id: string; matcherArgsHash?: string; outputHash?: string; provenance?: string } {
  const fixture = data && typeof data === "object" && !Array.isArray(data) ? (data as Partial<ToolFixture> & { matcher?: unknown }) : {};
  const matcher = fixture.matcher && typeof fixture.matcher === "object" && !Array.isArray(fixture.matcher) ? (fixture.matcher as { argsHash?: string }) : {};
  return {
    id: typeof fixture.id === "string" ? fixture.id : "fixture_unknown",
    matcherArgsHash: matcher.argsHash,
    outputHash: fixture.outputHash,
    provenance: fixture.provenance
  };
}
