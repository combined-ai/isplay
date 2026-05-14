import { describe, expect, it } from "vitest";
import { IsplaySdk } from "./index.js";

describe("SDK feature surface", () => {
  it("exposes the same read/replay/analysis surface as the API client", () => {
    const sdk = new IsplaySdk({ projectId: "project_1" });
    for (const method of parityMethods) expect(typeof (sdk as unknown as Record<string, unknown>)[method]).toBe("function");
  });
});

const parityMethods = [
  "health",
  "getJobEvents",
  "createProject",
  "getProject",
  "getProjectCatalog",
  "createRun",
  "getRun",
  "listRuns",
  "patchRun",
  "appendEvents",
  "getEvents",
  "createArtifact",
  "getArtifact",
  "createCheckpoint",
  "listCheckpoints",
  "createBranch",
  "getBranch",
  "createIntervention",
  "listInterventions",
  "createReplay",
  "getReplay",
  "getReplayEvents",
  "getReplayDiff",
  "getReplayMetrics",
  "getFixtureRequirements",
  "addToolFixture",
  "resumeReplay",
  "getReplayEffects",
  "createAnalysisRun",
  "getAnalysisRun",
  "getRunContextInventory",
  "getModelCallContextInventory",
  "getCheckpointContextInventory",
  "searchContext",
  "getRunCatalog",
  "createExperiment",
  "createHypothesisBatch",
  "getExperiment",
  "runExperiment",
  "getExperimentResults",
  "getExperimentRequirements",
  "getExperimentTrialMatrix",
  "getExperimentStatistics",
  "getExperimentArmComparison",
  "getExperimentEffects",
  "rankEffects"
] as const;
