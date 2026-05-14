import {
  createId,
  EffectCandidateSchema,
  ExperimentStatisticsSchema,
  nowIso,
  type DiffRecord,
  type EffectCandidate,
  type ExperimentStatistics,
  type FixtureUse,
  type Metric,
  type Replay,
  type ReplayAttempt,
  type ValidityLabel
} from "@isplay/core";
import { validityLabelsFor } from "./validity.js";

export type RankEffectsInput = {
  projectId: string;
  experimentId?: string;
  replayId?: string;
  baseRunId?: string;
  branchId?: string;
  diffs: DiffRecord[];
  metrics: Metric[];
  attempts?: ReplayAttempt[];
  fixtureUses?: FixtureUse[];
};

export function rankEffects(input: RankEffectsInput): EffectCandidate[] {
  const labels = validityLabelsFor(input.diffs, input.metrics);
  const n = Math.max(input.attempts?.length ?? 0, input.replayId ? 1 : 0);
  const candidates = [
    toolArgsEffect(input, labels, n),
    fixtureEffect(input, labels, n),
    divergenceEffect(input, labels, n)
  ].filter((effect): effect is EffectCandidate => Boolean(effect));
  return candidates
    .sort((left, right) => right.score - left.score)
    .map((effect, index) => EffectCandidateSchema.parse({ ...effect, rank: index + 1 }));
}

export function summarizeExperimentStatistics(input: {
  projectId: string;
  experimentId: string;
  replays: Replay[];
  metrics: Metric[];
  attempts: ReplayAttempt[];
  fixtureUses: FixtureUse[];
}): ExperimentStatistics {
  const trials = input.attempts.length || input.replays.length;
  const comparable = input.replays.filter((replay) => replay.comparability !== "non_comparable").length;
  const fixtureReplayIds = new Set(input.fixtureUses.map((use) => use.replayId));
  const nonComparable = input.replays.filter((replay) => replay.comparability === "non_comparable").length;
  return ExperimentStatisticsSchema.parse({
    projectId: input.projectId,
    experimentId: input.experimentId,
    trialCount: trials,
    comparableCount: comparable,
    fixtureDependencyRate: rate(fixtureReplayIds.size, input.replays.length),
    nonComparableRate: rate(nonComparable, input.replays.length),
    metrics: [
      rateStat("success_rate", input.replays.filter((replay) => replay.status === "ok").length, input.replays.length),
      rateStat("tool_argument_changed_rate", metricCount(input.metrics, "tool_argument_changed"), input.replays.length),
      meanStat("first_divergence_step", input.metrics.filter((metric) => metric.name === "first_divergence_step").map((metric) => metric.value))
    ],
    metadata: { lowN: trials < 3 }
  });
}

function toolArgsEffect(input: RankEffectsInput, labels: ValidityLabel[], n: number): EffectCandidate | undefined {
  const metric = input.metrics.find((item) => item.name === "tool_argument_changed" && item.value > 0);
  if (!metric) return undefined;
  return candidate(input, {
    title: "Tool arguments changed under the intervention",
    score: n < 3 ? 0.55 : 0.75,
    status: n < 3 ? "inconclusive" : "supported",
    effectType: "tool_args_changed",
    labels,
    evidenceRefs: [{ kind: "metric", id: metric.id }],
    actions: ["Run repeated trials", "Inspect tool diff", "Try a narrower prompt or context patch"]
  });
}

function fixtureEffect(input: RankEffectsInput, labels: ValidityLabel[], n: number): EffectCandidate | undefined {
  const count = input.fixtureUses?.length ?? input.metrics.find((metric) => metric.name === "fixture_dependency_count")?.value ?? 0;
  if (!count) return undefined;
  return candidate(input, {
    title: "Counterfactual depends on injected tool fixture output",
    score: 0.45,
    status: "inconclusive",
    effectType: "fixture_sensitive",
    labels: Array.from(new Set([...labels, "sensitive_to_fixture"])),
    evidenceRefs: input.fixtureUses?.map((use) => ({ kind: "fixture" as const, id: use.fixtureId })) ?? [],
    actions: ["Add alternate fixtures", "Run fixture sensitivity checks", "Mark conclusions as fixture-dependent"]
  });
}

function divergenceEffect(input: RankEffectsInput, labels: ValidityLabel[], n: number): EffectCandidate | undefined {
  const metric = input.metrics.find((item) => item.name === "first_divergence_step");
  if (!metric || metric.value < 0) return undefined;
  return candidate(input, {
    title: `Trace first diverged at step ${metric.value}`,
    score: metric.value <= 2 ? 0.7 : 0.5,
    status: labels.includes("non_comparable") ? "invalid" : n < 3 ? "inconclusive" : "supported",
    effectType: labels.includes("non_comparable") ? "non_comparable" : "early_divergence",
    labels,
    evidenceRefs: [{ kind: "metric", id: metric.id }],
    actions: ["Inspect unchanged prefix", "Compare descendants after first divergence", "Run sibling hypotheses at the same checkpoint"]
  });
}

function candidate(input: RankEffectsInput, values: { title: string; score: number; status: EffectCandidate["status"]; effectType: EffectCandidate["effectType"]; labels: ValidityLabel[]; evidenceRefs: EffectCandidate["evidenceRefs"]; actions: string[] }): EffectCandidate {
  return EffectCandidateSchema.parse({
    id: createId("effect"),
    createdAt: nowIso(),
    projectId: input.projectId,
    experimentId: input.experimentId,
    replayId: input.replayId,
    branchId: input.branchId,
    baseRunId: input.baseRunId,
    rank: 1,
    title: values.title,
    score: values.score,
    status: values.status,
    effectType: values.effectType,
    validityLabels: values.labels,
    confidence: { n: Math.max(0, input.attempts?.length ?? (input.replayId ? 1 : 0)), low: Math.max(0, values.score - 0.2), high: Math.min(1, values.score + 0.2) },
    evidenceRefs: values.evidenceRefs,
    recommendedNextActions: values.actions,
    metadata: {}
  });
}

function metricCount(metrics: Metric[], name: string): number {
  return metrics.filter((metric) => metric.name === name && metric.value > 0).length;
}

function rateStat(name: string, count: number, total: number) {
  const value = rate(count, total);
  const margin = total ? 1.96 * Math.sqrt((value * (1 - value)) / total) : undefined;
  return { name, n: total, rate: value, confidenceLow: margin === undefined ? undefined : Math.max(0, value - margin), confidenceHigh: margin === undefined ? undefined : Math.min(1, value + margin), method: "binomial" as const };
}

function meanStat(name: string, values: number[]) {
  return { name, n: values.length, mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined, method: "deterministic" as const };
}

function rate(count: number, total: number): number {
  return total ? count / total : 0;
}
