import { rankEffects, summarizeExperimentStatistics } from "@isplay/analysis";
import { createId, type EffectCandidate, type ExperimentStatistics, type FixtureRequirement, type Replay } from "@isplay/core";
import type { IsplayStore } from "@isplay/postgres";
import { executeReplay } from "./replay.js";

export type ExperimentResults = Awaited<ReturnType<typeof getExperimentResults>>;

export async function runExperiment(store: IsplayStore, experimentId: string) {
  const experiment = await requireExperiment(store, experimentId);
  await store.updateExperiment({ ...experiment, status: "running" });
  const arms = await store.listExperimentArms(experimentId);
  for (const arm of arms) {
    let currentArm = arm;
    const existing = await Promise.all(arm.replayIds.map((id) => store.getReplay(id)));
    const present = existing.filter((replay): replay is Replay => Boolean(replay));
    for (const replay of present) {
      if (replay.status === "ok") continue;
      const executed = await executeReplay(store, replay);
      currentArm = await store.addReplayToArm(currentArm, executed);
      if (executed.status === "paused") break;
    }
    if ((await store.listExperimentRequirements(experimentId)).some((item) => item.status === "open")) continue;
    for (let index = currentArm.replayIds.length; index < experiment.trialPlan.repetitions; index += 1) {
      const replay = await store.createReplay({
        projectId: currentArm.projectId,
        runId: currentArm.baseRunId,
        branchId: currentArm.branchId,
        trialId: createId("trial"),
        policy: experiment.policy,
        metadata: { experimentId, armId: currentArm.id, repetition: index }
      });
      const executed = await executeReplay(store, replay);
      currentArm = await store.addReplayToArm(currentArm, executed);
      if (executed.status === "paused") break;
    }
  }
  const requirements = await store.listExperimentRequirements(experimentId);
  const status = requirements.some((item) => item.status === "open") ? "paused" : "completed";
  return store.updateExperiment({ ...(await requireExperiment(store, experimentId)), status });
}

export async function getExperimentResults(store: IsplayStore, experimentId: string) {
  const experiment = await requireExperiment(store, experimentId);
  const arms = await store.listExperimentArms(experimentId);
  const replays = await store.listExperimentReplays(experimentId);
  const requirements = await store.listExperimentRequirements(experimentId);
  const effects = await getExperimentEffects(store, experimentId);
  const statistics = await getExperimentStatistics(store, experimentId);
  return { experiment, arms, replays, requirements, effects, statistics };
}

export async function getExperimentEffects(store: IsplayStore, experimentId: string): Promise<EffectCandidate[]> {
  const replays = await store.listExperimentReplays(experimentId);
  const ranked = await Promise.all(
    replays.map(async (replay) => {
      const [diffs, metrics, attempts, fixtureUses] = await Promise.all([
        store.listDiffs(replay.id),
        store.listMetrics(replay.id),
        store.listReplayAttempts(replay.id),
        store.listFixtureUses(replay.id)
      ]);
      return rankEffects({ projectId: replay.projectId, experimentId, replayId: replay.id, baseRunId: replay.runId, branchId: replay.branchId, diffs, metrics, attempts, fixtureUses });
    })
  );
  return aggregateEffects(ranked.flat());
}

export async function getReplayEffects(store: IsplayStore, replayId: string): Promise<EffectCandidate[]> {
  const replay = await store.getReplay(replayId);
  if (!replay) throw new Error(`Replay not found: ${replayId}`);
  const [diffs, metrics, attempts, fixtureUses] = await Promise.all([
    store.listDiffs(replayId),
    store.listMetrics(replayId),
    store.listReplayAttempts(replayId),
    store.listFixtureUses(replayId)
  ]);
  return rankEffects({ projectId: replay.projectId, replayId, baseRunId: replay.runId, branchId: replay.branchId, diffs, metrics, attempts, fixtureUses });
}

export async function getExperimentStatistics(store: IsplayStore, experimentId: string): Promise<ExperimentStatistics> {
  const experiment = await requireExperiment(store, experimentId);
  const replays = await store.listExperimentReplays(experimentId);
  const metrics = (await Promise.all(replays.map((replay) => store.listMetrics(replay.id)))).flat();
  const attempts = (await Promise.all(replays.map((replay) => store.listReplayAttempts(replay.id)))).flat();
  const fixtureUses = (await Promise.all(replays.map((replay) => store.listFixtureUses(replay.id)))).flat();
  return summarizeExperimentStatistics({ projectId: experiment.projectId, experimentId, replays, metrics, attempts, fixtureUses });
}

export async function getExperimentTrialMatrix(store: IsplayStore, experimentId: string) {
  const arms = await store.listExperimentArms(experimentId);
  return Promise.all(
    arms.map(async (arm) => ({
      arm,
      trials: await Promise.all(
        arm.replayIds.map(async (replayId) => ({
          replay: await store.getReplay(replayId),
          attempts: await store.listReplayAttempts(replayId),
          metrics: await store.listMetrics(replayId),
          fixtureUses: await store.listFixtureUses(replayId)
        }))
      )
    }))
  );
}

export async function getExperimentRequirements(store: IsplayStore, experimentId: string): Promise<FixtureRequirement[]> {
  return store.listExperimentRequirements(experimentId);
}

async function requireExperiment(store: IsplayStore, experimentId: string) {
  const experiment = await store.getExperiment(experimentId);
  if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);
  return experiment;
}

function aggregateEffects(effects: EffectCandidate[]): EffectCandidate[] {
  const groups = new Map<string, EffectCandidate[]>();
  for (const effect of effects) {
    const key = `${effect.effectType}:${effect.title}`;
    groups.set(key, [...(groups.get(key) ?? []), effect]);
  }
  return Array.from(groups.values())
    .map((group) => mergeEffectGroup(group))
    .sort((left, right) => right.score - left.score)
    .map((effect, index) => ({ ...effect, rank: index + 1 }));
}

function mergeEffectGroup(group: EffectCandidate[]): EffectCandidate {
  const first = group[0]!;
  const n = group.reduce((sum, effect) => sum + Math.max(1, effect.confidence.n), 0);
  const score = group.reduce((sum, effect) => sum + effect.score, 0) / group.length;
  return {
    ...first,
    score,
    status: group.some((effect) => effect.status === "invalid") ? "invalid" : group.some((effect) => effect.status === "inconclusive") || n < 3 ? "inconclusive" : first.status,
    validityLabels: Array.from(new Set(group.flatMap((effect) => effect.validityLabels))),
    confidence: { n, low: Math.min(...group.map((effect) => effect.confidence.low ?? score)), high: Math.max(...group.map((effect) => effect.confidence.high ?? score)) },
    evidenceRefs: uniqueRefs(group.flatMap((effect) => effect.evidenceRefs)),
    recommendedNextActions: Array.from(new Set(group.flatMap((effect) => effect.recommendedNextActions))),
    metadata: { ...first.metadata, aggregatedTrialEffects: group.length }
  };
}

function uniqueRefs(refs: EffectCandidate["evidenceRefs"]): EffectCandidate["evidenceRefs"] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
