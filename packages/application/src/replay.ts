import { createAnalysisRun } from "@isplay/analysis";
import { nowIso, ReplaySchema, stableHash, type CreateAnalysisRunInput, type FixtureRequirement, type Replay, type ReplayAttempt, type ToolFixture } from "@isplay/core";
import type { IsplayStore, PersistedAnalysis } from "@isplay/postgres";
import { applyInterventions, ReplayEngine } from "@isplay/replay";
import { recordErrorAttempt, recordOkAttempt, recordPausedAttempt, startAttempt } from "./replay-attempts.js";

export async function executeReplay(store: IsplayStore, replay: Replay): Promise<Replay> {
  let running: Replay | undefined;
  let attempt: ReplayAttempt | undefined;

  try {
    running = await store.updateReplay(ReplaySchema.parse({ ...replay, status: "running", startedAt: replay.startedAt ?? nowIso(), endedAt: undefined, error: undefined }));
    attempt = await startAttempt(store, running);
    const baseEvents = await store.getEvents(running.baseRunId);
    const branchEvents = running.branchId ? await eventsForBranch(store, running, baseEvents) : baseEvents;
    const fixtures = await verifiedFixtures(store, await store.listToolFixtures({ projectId: running.projectId, replayId: running.id, branchId: running.branchId }));
    const result = new ReplayEngine().run({
      replay: ReplaySchema.parse({ ...running, pausedRequirementId: undefined, error: undefined }),
      baseEvents,
      branchEvents,
      fixtures,
      policy: replay.policy
    });

    if (result.status === "paused") {
      const requirement = await reusableRequirement(store, result.requirement);
      await store.putReplayEvents(running.id, branchEvents, attempt.id);
      await store.putFixtureRequirement(requirement);
      await recordPausedAttempt(store, attempt, baseEvents, branchEvents, requirement);
      return store.updateReplay(ReplaySchema.parse({ ...result.replay, latestAttemptId: attempt.id, pausedRequirementId: requirement.id, endedAt: nowIso() }));
    }
    if (result.status === "error") {
      await recordErrorAttempt(store, attempt, result.error);
      return store.updateReplay(ReplaySchema.parse({ ...result.replay, latestAttemptId: attempt.id, endedAt: nowIso() }));
    }

    await store.putReplayEvents(running.id, result.events, attempt.id);
    for (const diff of result.diffs) await store.putDiff({ ...diff, metadata: { ...diff.metadata, attemptId: attempt.id } });
    for (const metric of result.metrics) await store.putMetric({ ...metric, metadata: { ...metric.metadata, attemptId: attempt.id } });
    await recordOkAttempt(store, attempt, result.replay, baseEvents, result.events);
    return store.updateReplay(ReplaySchema.parse({ ...result.replay, latestAttemptId: attempt.id, endedAt: nowIso() }));
  } catch (error) {
    await persistReplayFailure(store, running ?? replay, attempt, error);
    throw error;
  }
}

export async function createPersistedAnalysis(store: IsplayStore, input: CreateAnalysisRunInput): Promise<PersistedAnalysis> {
  const diffs = input.replayId ? await store.listDiffs(input.replayId) : [];
  const metrics = input.replayId ? await store.listMetrics(input.replayId) : [];
  return store.putAnalysisOutput(createAnalysisRun({ ...input, diffs, metrics }));
}

async function persistReplayFailure(store: IsplayStore, replay: Replay, attempt: ReplayAttempt | undefined, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  if (attempt) await recordErrorAttempt(store, attempt, message).catch(() => undefined);
  await store.updateReplay(ReplaySchema.parse({ ...replay, status: "error", latestAttemptId: attempt?.id ?? replay.latestAttemptId, endedAt: nowIso(), error: message })).catch(() => undefined);
}

async function eventsForBranch(store: IsplayStore, replay: Replay, baseEvents: Awaited<ReturnType<IsplayStore["getEvents"]>>) {
  const branch = replay.branchId ? await store.getBranch(replay.branchId) : undefined;
  if (!branch) throw new Error(`Branch not found: ${replay.branchId}`);
  const interventions = await store.listInterventions(branch.id);
  const checkpoint = (await store.listCheckpoints(replay.baseRunId)).find((item) => item.id === branch.checkpointId);
  if (!checkpoint) throw new Error(`Checkpoint not found for branch ${branch.id}: ${branch.checkpointId}`);
  const checkpointEvent = baseEvents.find((event) => event.refId === branch.checkpointId || event.id === branch.checkpointId || event.id === checkpoint.parentEventId);
  if (!checkpointEvent) {
    throw new Error(`Checkpoint ${branch.checkpointId} is not anchored in run ${replay.baseRunId}; emit checkpoint.created or set parentEventId before branching.`);
  }
  return applyInterventions(baseEvents, interventions, replay.id, replay.baseRunId, { checkpointSeq: checkpointEvent?.seq });
}

async function reusableRequirement(store: IsplayStore, requirement: FixtureRequirement): Promise<FixtureRequirement> {
  const existing = (await store.listFixtureRequirements(requirement.replayId)).find(
    (item) => item.status === "open" && item.toolName === requirement.toolName && item.argsHash === requirement.argsHash
  );
  return existing ?? requirement;
}

async function verifiedFixtures(store: IsplayStore, fixtures: ToolFixture[]): Promise<ToolFixture[]> {
  for (const fixture of fixtures) {
    if (!fixture.outputArtifactId || !fixture.outputHash) throw new Error(`Fixture ${fixture.id} is missing output artifact integrity fields.`);
    const artifact = await store.getArtifact(fixture.outputArtifactId);
    if (!artifact) throw new Error(`Fixture ${fixture.id} references missing artifact ${fixture.outputArtifactId}.`);
    if (stableHash(artifact.payload ?? null) !== fixture.outputHash) throw new Error(`Fixture ${fixture.id} output artifact does not match outputHash.`);
  }
  return fixtures;
}
