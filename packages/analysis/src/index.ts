import {
  AnalysisRunSchema,
  createId,
  EvidenceEdgeSchema,
  EvidenceNodeSchema,
  MetricSchema,
  nowIso,
  type AnalysisRun,
  type DiffRecord,
  type EvidenceEdge,
  type EvidenceNode,
  type Metric,
  type ValidityLabel
} from "@isplay/core";
import { validityLabelsFor } from "./validity.js";

export type AnalysisInput = {
  projectId: string;
  baseRunId: string;
  experimentId?: string;
  replayId?: string;
  diffs: DiffRecord[];
  metrics: Metric[];
};

export type AnalysisOutput = {
  analysisRun: AnalysisRun;
  evidenceNodes: EvidenceNode[];
  evidenceEdges: EvidenceEdge[];
  scores: Metric[];
};

export function createAnalysisRun(input: AnalysisInput): AnalysisOutput {
  const labels = validityLabelsFor(input.diffs, input.metrics);
  const parsedAnalysisRun = AnalysisRunSchema.parse({
    id: createId("analysis"),
    createdAt: nowIso(),
    projectId: input.projectId,
    baseRunId: input.baseRunId,
    experimentId: input.experimentId,
    replayId: input.replayId,
    validityLabels: labels,
    summary: summarize(labels),
    metadata: {}
  });
  const analysisRun: AnalysisRun = input.replayId ? { ...parsedAnalysisRun, replayId: input.replayId } : parsedAnalysisRun;
  const evidenceNodes = input.diffs.map((diff) =>
    EvidenceNodeSchema.parse({
      id: createId("evidence"),
      createdAt: nowIso(),
      projectId: input.projectId,
      analysisRunId: analysisRun.id,
      type: diff.kind === "state" ? "state_field" : diff.kind === "tool" ? "tool_fixture" : "metric_delta",
      label: diff.summary ?? `${diff.kind} diff`,
      refId: diff.id,
      weight: diff.comparability === "exact" ? 1 : diff.comparability === "non_comparable" ? 0 : 0.5,
      metadata: { comparability: diff.comparability }
    })
  );
  const metricNodes = input.metrics.map((metric) =>
    EvidenceNodeSchema.parse({
      id: createId("evidence"),
      createdAt: nowIso(),
      projectId: input.projectId,
      analysisRunId: analysisRun.id,
      type: "metric_delta",
      label: metric.name,
      refId: metric.id,
      weight: metric.value,
      metadata: { provenance: metric.provenance }
    })
  );
  const nodes = [...evidenceNodes, ...metricNodes];
  const edges = nodes.slice(1).map((node) =>
    EvidenceEdgeSchema.parse({
      id: createId("evidence"),
      createdAt: nowIso(),
      projectId: input.projectId,
      analysisRunId: analysisRun.id,
      fromNodeId: node.id,
      toNodeId: nodes[0]?.id ?? node.id,
      relation: labels.includes("unsupported") ? "contradicts" : "supports",
      weight: node.weight,
      metadata: {}
    })
  );
  return {
    analysisRun,
    evidenceNodes: nodes,
    evidenceEdges: edges,
    scores: scoreValidity(input.projectId, analysisRun.id, labels)
  };
}

function scoreValidity(projectId: string, analysisRunId: string, labels: ValidityLabel[]): Metric[] {
  const score = labels.includes("confirmed_by_replay")
    ? 1
    : labels.includes("diverged_but_comparable")
      ? 0.6
      : labels.includes("sensitive_to_fixture")
        ? 0.4
        : 0.1;
  return [
    MetricSchema.parse({
      id: createId("metric"),
      createdAt: nowIso(),
      projectId,
      analysisRunId,
      name: "analysis_validity_score",
      value: score,
      provenance: "deterministic",
      metadata: { labels }
    })
  ];
}

export { rankEffects, summarizeExperimentStatistics } from "./effects.js";
export { validityLabelsFor } from "./validity.js";

function summarize(labels: ValidityLabel[]): string {
  if (labels.includes("confirmed_by_replay")) return "Replay-backed analysis produced comparable evidence.";
  if (labels.includes("non_comparable")) return "Branch drift made at least one comparison non-comparable.";
  if (labels.includes("sensitive_to_fixture")) return "Analysis depends on analyst, AI, simulator, or live tool fixture outputs.";
  return "Analysis evidence is incomplete or unsupported.";
}
