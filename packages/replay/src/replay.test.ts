import { describe, expect, it } from "vitest";
import { createId, EventSchema, nowIso, stableHash, type Intervention, type Replay } from "@isplay/core";
import { applyInterventions } from "./interventions.js";
import { computeReplayDiff } from "./diff.js";
import { ReplayEngine } from "./engine.js";
import { ToolFixtureGateway } from "./fixture-gateway.js";

describe("@isplay/replay", () => {
  it("pauses for missing divergent tool fixtures", () => {
    const replay = makeReplay();
    const result = new ReplayEngine().run({
      replay,
      baseEvents: [],
      policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 },
      divergentToolRequest: {
        toolName: "send_email",
        args: { to: "user@example.com" }
      }
    });
    expect(result.status).toBe("paused");
    if (result.status === "paused") {
      expect(result.requirement.toolName).toBe("send_email");
      expect(result.replay.status).toBe("paused");
    }
  });

  it("resolves analyst fixtures by args hash", () => {
    const args = { query: "refund policy" };
    const gateway = new ToolFixtureGateway([
      {
        id: "fixture_1",
        createdAt: nowIso(),
        projectId: "project_1",
        toolName: "search",
        matcher: { argsHash: stableHash(args) },
        provenance: "analyst_fixture",
        sideEffectClass: "read",
        metadata: {}
      }
    ]);
    expect(gateway.resolve({ projectId: "project_1", replayId: "replay_1", toolName: "search", args }).status).toBe("resolved");
  });

  it("does not resolve fixtures across projects", () => {
    const args = { query: "refund policy" };
    const gateway = new ToolFixtureGateway([
      {
        id: "fixture_1",
        createdAt: nowIso(),
        projectId: "project_other",
        toolName: "search",
        matcher: { argsHash: stableHash(args) },
        provenance: "analyst_fixture",
        sideEffectClass: "read",
        metadata: {}
      }
    ]);
    expect(gateway.resolve({ projectId: "project_1", replayId: "replay_1", toolName: "search", args }).status).toBe("required");
  });

  it("blocks unsupported live replay policies", () => {
    const result = new ReplayEngine().run({
      replay: makeReplay(),
      baseEvents: [],
      policy: { model: "pinned-live", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }
    });
    expect(result.status).toBe("error");
  });

  it("rejects provider fixture model policy until model fixture replay is implemented", () => {
    const result = new ReplayEngine().run({
      replay: makeReplay(),
      baseEvents: [],
      policy: { model: "provider-fixture", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }
    });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.error).toContain("provider-fixture");
  });

  it("applies targeted interventions to branch events", () => {
    const base = [event(0, "tool.started", "tool_1", { toolName: "search", args: { query: "old" }, argsArtifactId: "artifact_old" })];
    const interventions: Intervention[] = [
      {
        id: "intervention_1",
        createdAt: nowIso(),
        projectId: "project_1",
        branchId: "branch_1",
        kind: "input_patch",
        target: { refId: "tool_1" },
        operations: [],
        patch: { args: { query: "new" } },
        metadata: {}
      }
    ];
    expect(applyInterventions(base, interventions, "replay_1", "run_1")[0]?.data).toMatchObject({
      args: { query: "new" },
      argsHash: stableHash({ query: "new" })
    });
    expect(applyInterventions(base, interventions, "replay_1", "run_1")[0]?.data).not.toHaveProperty("argsArtifactId");
  });

  it("records patch failures without marking target events as applied", () => {
    const base = [event(0, "model_call.started", "model_1", { prompt: "Use strict fraud rules." })];
    const interventions: Intervention[] = [
      {
        id: "intervention_1",
        createdAt: nowIso(),
        projectId: "project_1",
        branchId: "branch_1",
        kind: "message_patch",
        target: { refId: "model_1" },
        operations: [{ op: "replace", path: "/missing", value: "new" }],
        metadata: {}
      }
    ];
    const branch = applyInterventions(base, interventions, "replay_1", "run_1");
    expect(branch[0]?.data).toEqual(base[0]?.data);
    expect(branch[0]?.metadata.targetStatus).toBeUndefined();
    expect(branch[1]).toMatchObject({
      type: "intervention.created",
      refId: "intervention_1",
      metadata: {
        targetStatus: "patch_failed",
        targetEventId: base[0]?.id
      }
    });
    expect(branch[1]?.metadata.patchError).toEqual(expect.any(String));
  });

  it("applies typed JSON Patch interventions to prompt-like event data", () => {
    const base = [event(0, "model_call.started", "model_1", { prompt: "Use strict fraud rules.", settings: { temperature: 0.4 } })];
    const interventions: Intervention[] = [
      {
        id: "intervention_1",
        createdAt: nowIso(),
        projectId: "project_1",
        branchId: "branch_1",
        kind: "message_patch",
        target: { refId: "model_1" },
        operations: [{ op: "replace_text", path: "/prompt", value: { search: "strict", replacement: "lenient" } }],
        patch: { operations: [{ op: "replace_text", path: "/prompt", value: { search: "strict", replacement: "lenient" } }] },
        metadata: {}
      }
    ];
    expect(applyInterventions(base, interventions, "replay_1", "run_1")[0]?.data).toMatchObject({
      prompt: "Use lenient fraud rules."
    });
  });

  it("skips pre-checkpoint target matches and applies the first post-checkpoint match", () => {
    const base = [
      event(0, "checkpoint.created", "checkpoint_1", { name: "before-tools" }),
      event(1, "tool.finished", "tool_before", { toolName: "search", result: { tier: "gold" } }),
      event(2, "tool.finished", "tool_after", { toolName: "search", result: { tier: "gold" } })
    ];
    const interventions: Intervention[] = [
      {
        id: "intervention_1",
        createdAt: nowIso(),
        projectId: "project_1",
        branchId: "branch_1",
        kind: "tool_args_patch",
        target: { eventType: "tool.finished", toolName: "search" },
        operations: [{ op: "add", path: "/metadata", value: { source: "post-checkpoint" } }],
        metadata: {}
      }
    ];
    const branch = applyInterventions(base, interventions, "replay_1", "run_1", { checkpointSeq: 1 });
    expect(branch[1]?.data).not.toHaveProperty("metadata");
    expect(branch[2]?.data).toMatchObject({ metadata: { source: "post-checkpoint" } });
  });

  it("keeps synthetic branch events linked to the observed run", () => {
    const synthetic = applyInterventions([], [intervention("intervention_1")], "replay_1", "run_1")[0];
    expect(synthetic?.runId).toBe("run_1");
    expect(synthetic?.metadata).toMatchObject({ replayId: "replay_1" });
  });

  it("computes first-divergence metrics", () => {
    const base = [
      event(0, "model_call.finished", "model_1", { text: "A" }),
      event(1, "tool.finished", "tool_1", { ok: true })
    ];
    const branch = [
      event(0, "model_call.finished", "model_1", { text: "A" }),
      event(1, "tool.finished", "tool_2", { ok: true })
    ];
    const { diffs, metrics } = computeReplayDiff({
      projectId: "project_1",
      replayId: "replay_1",
      baseEvents: base,
      branchEvents: branch
    });
    expect(diffs[0]?.comparability).toBe("diverged_but_comparable");
    expect(metrics.find((metric) => metric.name === "first_divergence_step")?.value).toBe(1);
  });

  it("aligns length-only divergence comparability between diff and engine", () => {
    const base = [event(0, "model_call.finished", "model_1", { text: "A" })];
    const branch = [
      event(0, "model_call.finished", "model_1", { text: "A" }),
      event(1, "model_call.finished", "model_2", { text: "B" })
    ];
    const { diffs } = computeReplayDiff({ projectId: "project_1", replayId: "replay_1", baseEvents: base, branchEvents: branch });
    const result = new ReplayEngine().run({ replay: makeReplay(), baseEvents: base, branchEvents: branch });
    expect(diffs[0]?.comparability).toBe("aligned");
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.replay.comparability).toBe("aligned");
  });

  it("emits actionable tool diffs at the divergence point", () => {
    const base = [event(0, "tool.started", "tool_1", { toolName: "search", argsHash: "old", argsArtifactId: "artifact_old" })];
    const branch = [event(0, "tool.started", "tool_1", { toolName: "search", argsHash: "new", argsArtifactId: "artifact_new" })];
    const { diffs, metrics } = computeReplayDiff({ projectId: "project_1", replayId: "replay_1", baseEvents: base, branchEvents: branch });
    const tool = diffs.find((diff) => diff.kind === "tool");
    expect(tool?.patch).toMatchObject({ changedFields: expect.arrayContaining(["argsHash", "argsArtifactId"]) });
    expect(metrics.find((metric) => metric.name === "tool_argument_changed")?.value).toBe(1);
  });

  it("surfaces inline counterfactual tool args in diffs", () => {
    const base = [event(0, "tool.started", "tool_1", { toolName: "search", argsArtifactId: "artifact_old" })];
    const branch = [event(0, "tool.started", "tool_1", { toolName: "search", args: { query: "new" }, argsArtifactId: "artifact_old" })];
    const { diffs } = computeReplayDiff({ projectId: "project_1", replayId: "replay_1", baseEvents: base, branchEvents: branch });
    expect(diffs.find((diff) => diff.kind === "tool")?.patch).toMatchObject({
      branch: { args: { query: "new" } },
      changedFields: expect.arrayContaining(["args"])
    });
  });

  it("substitutes fixture artifact evidence without retaining stale inline tool output", () => {
    const args = { query: "customer" };
    const base = [event(0, "tool.finished", "tool_1", { toolName: "search", args, result: { tier: "gold" } })];
    const branch = [event(0, "tool.finished", "tool_1", { toolName: "search", args, result: { tier: "platinum" } })];
    const result = new ReplayEngine().run({
      replay: makeReplay(),
      baseEvents: base,
      branchEvents: branch,
      fixtures: [
        {
          id: "fixture_1",
          createdAt: nowIso(),
          projectId: "project_1",
          toolName: "search",
          matcher: { argsHash: stableHash(args) },
          outputArtifactId: "artifact_fixture",
          outputHash: stableHash({ tier: "diamond" }),
          provenance: "analyst_fixture",
          sideEffectClass: "read",
          metadata: {}
        }
      ],
      policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.events[0]?.data).not.toHaveProperty("result");
      expect(result.events[0]?.data).not.toHaveProperty("output");
      expect(result.events[0]?.data).toMatchObject({ resultArtifactId: "artifact_fixture", fixtureId: "fixture_1" });
    }
  });

  it("uses explicit divergent tool request eventIndex when substituting fixture output", () => {
    const args = { query: "customer" };
    const base = [
      event(0, "tool.started", "tool_1", { toolName: "search", args }),
      event(1, "tool.finished", "tool_1", { toolName: "search", args, result: { tier: "gold" } }),
      event(2, "model_call.finished", "model_1", { text: "done" })
    ];
    const branch = [
      event(0, "tool.started", "tool_1", { toolName: "search", args }),
      event(1, "tool.finished", "tool_1", { toolName: "search", args, result: { tier: "platinum" } }),
      event(2, "model_call.finished", "model_1", { text: "done" })
    ];
    const result = new ReplayEngine().run({
      replay: makeReplay(),
      baseEvents: base,
      branchEvents: branch,
      divergentToolRequest: { toolName: "search", args, eventIndex: 0 },
      fixtures: [
        {
          id: "fixture_1",
          createdAt: nowIso(),
          projectId: "project_1",
          toolName: "search",
          matcher: { argsHash: stableHash(args) },
          outputArtifactId: "artifact_fixture",
          outputHash: stableHash({ tier: "diamond" }),
          provenance: "analyst_fixture",
          sideEffectClass: "read",
          metadata: {}
        }
      ],
      policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.events[1]?.metadata).toMatchObject({ fixtureId: "fixture_1", fixtureSubstitution: true });
      expect(result.events[2]?.metadata.fixtureId).toBeUndefined();
    }
  });
});

function makeReplay(): Replay {
  return {
    id: "replay_1",
    createdAt: nowIso(),
    projectId: "project_1",
    baseRunId: "run_1",
    status: "running",
    policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 },
    metadata: {}
  };
}

function intervention(id: string): Intervention {
  return {
    id,
    createdAt: nowIso(),
    projectId: "project_1",
    branchId: "branch_1",
    kind: "input_patch",
    target: {},
    operations: [],
    metadata: {}
  };
}

function event(seq: number, type: string, refId: string, data: unknown) {
  return EventSchema.parse({
    id: createId("event"),
    createdAt: nowIso(),
    projectId: "project_1",
    runId: "run_1",
    seq,
    type,
    refId,
    occurredAt: nowIso(),
    data,
    metadata: {}
  });
}
