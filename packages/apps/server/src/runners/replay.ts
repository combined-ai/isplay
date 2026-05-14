import { createAnalysisRun } from "@isplay/analysis";
import { ReplaySchema, type CreateAnalysisRunInput, type FixtureRequirement, type Replay } from "@isplay/core";
import type { IsplayStore, PersistedAnalysis } from "@isplay/postgres";
import { applyInterventions, ReplayEngine } from "@isplay/replay";
import { recordErrorAttempt, recordOkAttempt, recordPausedAttempt, startAttempt } from "./replay-attempts.js";

export async function executeReplay(store: IsplayStore, replay: Replay): Promise<Replay> {
  await store.clearReplayOutputs(replay.id);
  const attempt = await startAttempt(store, replay);
  const baseEvents = await store.getEvents(replay.runId);
  const branchEvents = replay.branchId ? await eventsForBranch(store, replay, baseEvents) : baseEvents;
  const fixtures = await store.listToolFixtures({ projectId: replay.projectId, replayId: replay.id, branchId: replay.branchId });
  const result = new ReplayEngine().run({
    replay: ReplaySchema.parse({ ...replay, status: "running", pausedRequirementId: undefined, error: undefined }),
    baseEvents,
    branchEvents,
    fixtures,
    policy: replay.policy
  });

  if (result.status === "paused") {
    const requirement = await reusableRequirement(store, result.requirement);
    await store.putReplayEvents(replay.id, branchEvents);
    await store.putFixtureRequirement(requirement);
    await recordPausedAttempt(store, attempt, baseEvents, branchEvents, requirement);
    return store.updateReplay(ReplaySchema.parse({ ...result.replay, pausedRequirementId: requirement.id }));
  }
  if (result.status === "error") {
    await recordErrorAttempt(store, attempt, result.error);
    return store.updateReplay(result.replay);
  }

  await store.putReplayEvents(replay.id, result.events);
  for (const diff of result.diffs) await store.putDiff(diff);
  for (const metric of result.metrics) await store.putMetric(metric);
  await recordOkAttempt(store, attempt, result.replay, baseEvents, result.events);
  return store.updateReplay(result.replay);
}

export async function createPersistedAnalysis(store: IsplayStore, input: CreateAnalysisRunInput): Promise<PersistedAnalysis> {
  const diffs = input.replayId ? await store.listDiffs(input.replayId) : [];
  const metrics = input.replayId ? await store.listMetrics(input.replayId) : [];
  return store.putAnalysisOutput(createAnalysisRun({ ...input, diffs, metrics }));
}

async function eventsForBranch(store: IsplayStore, replay: Replay, baseEvents: Awaited<ReturnType<IsplayStore["getEvents"]>>) {
  const branch = replay.branchId ? await store.getBranch(replay.branchId) : undefined;
  if (!branch) throw new Error(`Branch not found: ${replay.branchId}`);
  const interventions = await store.listInterventions(branch.id);
  return applyInterventions(baseEvents, interventions, replay.id, replay.runId);
}

async function reusableRequirement(store: IsplayStore, requirement: FixtureRequirement): Promise<FixtureRequirement> {
  const existing = (await store.listFixtureRequirements(requirement.replayId)).find(
    (item) => item.status === "open" && item.toolName === requirement.toolName && item.argsHash === requirement.argsHash
  );
  return existing ?? requirement;
}
