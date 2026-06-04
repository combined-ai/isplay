import { rankEffects, summarizeExperimentStatistics } from "@isplay/analysis";
import { nowIso, type EffectCandidate, type Experiment, type ExperimentStatistics, type FixtureRequirement, type Replay } from "@isplay/core";
import type { IsplayStore } from "@isplay/postgres";
import { executeReplay } from "./replay.js";

export type ExperimentResults = Awaited<ReturnType<typeof getExperimentResults>>;
export type PageOptions = { limit?: number; offset?: number };
export type RunExperimentOptions = { maxReplays?: number };

export async function runExperiment(store: IsplayStore, experimentId: string, options: RunExperimentOptions = {}): Promise<Experiment> {
  const experiment = await requireExperiment(store, experimentId);
  const running = await store.updateExperiment({ ...experiment, status: "running", startedAt: experiment.startedAt ?? nowIso(), endedAt: undefined });
  const replayBudget = createReplayBudget(options.maxReplays);

  try {
    const arms = await store.listExperimentArms(experimentId);
    for (const arm of arms) {
      let currentArm = arm;
      const existing = await Promise.all(arm.replayIds.map((id) => store.getReplay(id)));
      const present = existing.filter((replay): replay is Replay => Boolean(replay));
      for (const replay of present) {
        if (replay.status === "ok") continue;
        if (!replayBudget.take()) break;
        const executed = await executeReplay(store, replay);
        currentArm = await store.addReplayToArm(currentArm, executed);
        if (executed.status === "paused") break;
      }
      if (replayBudget.exhausted) break;
      if ((await store.listExperimentRequirements(experimentId)).some((item) => item.status === "open")) continue;
      for (let index = currentArm.replayIds.length; index < running.trialPlan.repetitions; index += 1) {
        if (!replayBudget.take()) break;
        const replay = await store.createReplay({
          projectId: currentArm.projectId,
          baseRunId: currentArm.baseRunId,
          branchId: currentArm.branchId,
          experimentId,
          armId: currentArm.id,
          trialIndex: index,
          policy: running.policy,
          metadata: { experimentId, armId: currentArm.id, repetition: index }
        });
        const executed = await executeReplay(store, replay);
        currentArm = await store.addReplayToArm(currentArm, executed);
        if (executed.status === "paused") break;
      }
      if (replayBudget.exhausted) break;
    }
    const requirements = await store.listExperimentRequirements(experimentId);
    const status = requirements.some((item) => item.status === "open") || (replayBudget.exhausted && (await hasRemainingTrials(store, experimentId, running))) ? "paused" : "completed";
    return store.updateExperiment({ ...(await requireExperiment(store, experimentId)), status, endedAt: nowIso() });
  } catch (error) {
    await store.updateExperiment({ ...(await requireExperiment(store, experimentId).catch(() => running)), status: "invalid", endedAt: nowIso(), metadata: { ...running.metadata, error: error instanceof Error ? error.message : String(error) } }).catch(() => undefined);
    throw error;
  }
}

export async function getExperimentResults(store: IsplayStore, experimentId: string, page?: PageOptions) {
  const experiment = await requireExperiment(store, experimentId);
  const arms = await store.listExperimentArms(experimentId);
  const replays = await store.listExperimentReplays(experimentId);
  const requirements = await store.listExperimentRequirements(experimentId);
  const effects = await getExperimentEffects(store, experimentId);
  const statistics = await getExperimentStatistics(store, experimentId);
  return page
    ? { experiment, arms: paginate(arms, page), replays: paginate(replays, page), requirements: paginate(requirements, page), effects: paginate(effects, page), statistics }
    : { experiment, arms, replays, requirements, effects, statistics };
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
      return rankEffects({ projectId: replay.projectId, experimentId, replayId: replay.id, baseRunId: replay.baseRunId, branchId: replay.branchId, diffs, metrics, attempts, fixtureUses });
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
  return rankEffects({ projectId: replay.projectId, replayId, baseRunId: replay.baseRunId, branchId: replay.branchId, diffs, metrics, attempts, fixtureUses });
}

export async function getExperimentStatistics(store: IsplayStore, experimentId: string): Promise<ExperimentStatistics> {
  const experiment = await requireExperiment(store, experimentId);
  const replays = await store.listExperimentReplays(experimentId);
  const metrics = (await Promise.all(replays.map((replay) => store.listMetrics(replay.id)))).flat();
  const attempts = (await Promise.all(replays.map((replay) => store.listReplayAttempts(replay.id)))).flat();
  const fixtureUses = (await Promise.all(replays.map((replay) => store.listFixtureUses(replay.id)))).flat();
  return summarizeExperimentStatistics({ projectId: experiment.projectId, experimentId, replays, metrics, attempts, fixtureUses });
}

export async function getExperimentTrialMatrix(store: IsplayStore, experimentId: string, page?: PageOptions) {
  const arms = paginate(await store.listExperimentArms(experimentId), page);
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

function createReplayBudget(maxReplays: number | undefined): { exhausted: boolean; take: () => boolean } {
  let remaining = maxReplays;
  return {
    get exhausted() {
      return remaining !== undefined && remaining <= 0;
    },
    take() {
      if (remaining === undefined) return true;
      if (remaining <= 0) return false;
      remaining -= 1;
      return true;
    }
  };
}

async function hasRemainingTrials(store: IsplayStore, experimentId: string, experiment: Experiment): Promise<boolean> {
  const arms = await store.listExperimentArms(experimentId);
  return arms.some((arm) => arm.replayIds.length < experiment.trialPlan.repetitions);
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

function paginate<T>(items: T[], page?: PageOptions): T[] {
  if (!page) return items;
  const limit = Math.min(Math.max(Math.trunc(page.limit ?? 100), 1), 500);
  const offset = Math.max(Math.trunc(page.offset ?? 0), 0);
  return items.slice(offset, offset + limit);
}
