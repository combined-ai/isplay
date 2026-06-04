import { describe, expect, it } from "vitest";
import { createId, DiffSchema, MetricSchema, nowIso } from "@isplay/core";
import { createAnalysisRun, rankEffects, summarizeExperimentStatistics, validityLabelsFor } from "./index.js";

describe("@isplay/analysis", () => {
  it("labels diverged comparable evidence", () => {
    const labels = validityLabelsFor(
      [
        DiffSchema.parse({
          id: createId("diff"),
          createdAt: nowIso(),
          projectId: "project_1",
          replayId: "replay_1",
          kind: "trace",
          comparability: "diverged_but_comparable",
          patch: {},
          metadata: {}
        })
      ],
      []
    );
    expect(labels).toContain("diverged_but_comparable");
  });

  it("creates machine-readable evidence and scores", () => {
    const output = createAnalysisRun({
      projectId: "project_1",
      baseRunId: "run_1",
      replayId: "replay_1",
      diffs: [],
      metrics: [
        MetricSchema.parse({
          id: createId("metric"),
          createdAt: nowIso(),
          projectId: "project_1",
          replayId: "replay_1",
          name: "tool_sequence_distance",
          value: 0,
          provenance: "deterministic",
          metadata: {}
        })
      ]
    });
    expect(output.analysisRun.replayId).toBe("replay_1");
    expect(output.analysisRun.validityLabels).toContain("unsupported");
    expect(output.analysisRun.validityLabels).not.toContain("confirmed_by_replay");
    expect(output.evidenceNodes.length).toBeGreaterThan(0);
    expect(output.scores[0]?.name).toBe("analysis_validity_score");
  });

  it("does not confirm replay evidence from metrics alone", () => {
    const labels = validityLabelsFor(
      [],
      [
        MetricSchema.parse({
          id: createId("metric"),
          createdAt: nowIso(),
          projectId: "project_1",
          replayId: "replay_1",
          name: "tool_sequence_distance",
          value: 0,
          provenance: "deterministic",
          metadata: {}
        })
      ]
    );
    expect(labels).toEqual(["unsupported"]);
  });

  it("ranks actionable effects and marks low-N results inconclusive", () => {
    const effects = rankEffects({
      projectId: "project_1",
      replayId: "replay_1",
      diffs: [],
      metrics: [
        MetricSchema.parse({
          id: createId("metric"),
          createdAt: nowIso(),
          projectId: "project_1",
          replayId: "replay_1",
          name: "tool_argument_changed",
          value: 1,
          provenance: "deterministic",
          metadata: {}
        })
      ]
    });
    expect(effects[0]).toMatchObject({ effectType: "tool_args_changed", status: "inconclusive" });
  });

  it("computes experiment-level rates for repeated trials", () => {
    const stats = summarizeExperimentStatistics({
      projectId: "project_1",
      experimentId: "experiment_1",
      replays: [{ id: "replay_1", createdAt: nowIso(), projectId: "project_1", baseRunId: "run_1", status: "ok", policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }, metadata: {} }],
      metrics: [],
      attempts: [],
      fixtureUses: []
    });
    expect(stats.metrics.find((metric) => metric.name === "success_rate")?.rate).toBe(1);
  });
});
