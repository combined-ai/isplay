import { describe, expect, it } from "vitest";
import { nowIso, type Experiment, type ExperimentArm, type Replay, type ReplayAttempt } from "@isplay/core";
import type { IsplayStore } from "@isplay/postgres";
import { runExperiment } from "./experiments.js";
import { executeReplay } from "./replay.js";

describe("@isplay/application orchestration", () => {
  it("marks replay and attempt error before rethrowing unexpected replay failures", async () => {
    const replay = makeReplay({ branchId: "branch_missing" });
    const attempts: ReplayAttempt[] = [];
    const replayUpdates: Replay[] = [];
    const store = {
      updateReplay: async (next: Replay) => {
        replayUpdates.push(next);
        return next;
      },
      putReplayAttempt: async (attempt: ReplayAttempt) => {
        attempts.push(attempt);
        return attempt;
      },
      getEvents: async () => [],
      getBranch: async () => undefined
    } as unknown as IsplayStore;

    await expect(executeReplay(store, replay)).rejects.toThrow("Branch not found");
    expect(attempts.at(-1)?.status).toBe("error");
    expect(replayUpdates.at(-1)).toMatchObject({ status: "error", error: "Branch not found: branch_missing" });
  });

  it("honors maxReplays when running experiment trials", async () => {
    const experiment = makeExperiment({ trialPlan: { repetitions: 3, concurrency: 1, maxReplays: 20, seedPolicy: "none", stopRule: "none" } });
    const arm: ExperimentArm = {
      id: "arm_1",
      createdAt: nowIso(),
      projectId: experiment.projectId,
      experimentId: experiment.id,
      baseRunId: "run_1",
      replayIds: [],
      status: "queued",
      metadata: {}
    };
    const replays = new Map<string, Replay>();
    const experimentUpdates: Experiment[] = [];
    let createdReplays = 0;

    const store = {
      getExperiment: async () => experimentUpdates.at(-1) ?? experiment,
      updateExperiment: async (next: Experiment) => {
        experimentUpdates.push(next);
        return next;
      },
      listExperimentArms: async () => [arm],
      getReplay: async (id: string) => replays.get(id),
      listExperimentRequirements: async () => [],
      createReplay: async (input: Partial<Replay>) => {
        createdReplays += 1;
        const replay = makeReplay({ id: `replay_${createdReplays}`, projectId: input.projectId, baseRunId: input.baseRunId, branchId: input.branchId, experimentId: input.experimentId, armId: input.armId, trialIndex: input.trialIndex });
        replays.set(replay.id, replay);
        return replay;
      },
      addReplayToArm: async (currentArm: ExperimentArm, replay: Replay) => {
        arm.replayIds = Array.from(new Set([...currentArm.replayIds, replay.id]));
        arm.status = replay.status === "ok" ? "ok" : "running";
        return arm;
      },
      updateReplay: async (next: Replay) => {
        replays.set(next.id, next);
        return next;
      },
      putReplayAttempt: async (attempt: ReplayAttempt) => attempt,
      getEvents: async () => [],
      listToolFixtures: async () => [],
      putReplayEvents: async () => [],
      putDiff: async (diff: unknown) => diff,
      putMetric: async (metric: unknown) => metric,
      listFixtureRequirements: async () => [],
      putFixtureUse: async (use: unknown) => use,
      putReplayStep: async (step: unknown) => step
    } as unknown as IsplayStore;

    const result = await runExperiment(store, experiment.id, { maxReplays: 1 });

    expect(createdReplays).toBe(1);
    expect(result.status).toBe("paused");
    expect(arm.replayIds).toHaveLength(1);
  });
});

function makeReplay(overrides: Partial<Replay> = {}): Replay {
  return {
    id: "replay_1",
    createdAt: nowIso(),
    projectId: "project_1",
    baseRunId: "run_1",
    status: "queued",
    policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 },
    metadata: {},
    ...overrides
  };
}

function makeExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    id: "experiment_1",
    createdAt: nowIso(),
    projectId: "project_1",
    baseRunIds: ["run_1"],
    checkpointSelector: { kind: "first" },
    trialPlan: { repetitions: 1, concurrency: 1, maxReplays: 20, seedPolicy: "none", stopRule: "none" },
    policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 },
    validityGates: [],
    status: "queued",
    metadata: {},
    ...overrides
  };
}
