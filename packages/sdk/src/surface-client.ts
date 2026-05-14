import type {
  Branch,
  CreateAnalysisRunInput,
  CreateArtifactInput,
  CreateBranchInput,
  CreateCheckpointInput,
  CreateExperimentInput,
  CreateHypothesisBatchInput,
  CreateInterventionInput,
  CreateProjectInput,
  CreateReplayInput,
  CreateRunInput,
  CreateToolFixtureInput,
  EventRecord,
  ModelCall,
  RankEffectsInput,
  Run,
  RunExperimentInput,
  ToolExecution,
  ToolProposal
} from "@isplay/core";
import { ModelToolCaptureClient } from "./model-tool-client.js";

export class SdkSurfaceClient extends ModelToolCaptureClient {
  health() { return this.api.health(); }
  getJobEvents(id: string) { return this.api.getJobEvents(id); }
  createProject(input: CreateProjectInput) { return this.api.createProject(input); }
  getProject(id: string) { return this.api.getProject(id); }
  getProjectCatalog(id: string) { return this.api.getProjectCatalog(id); }
  createRun(input: Omit<CreateRunInput, "projectId"> & { projectId?: string }): Promise<Run> { return this.api.createRun({ ...input, projectId: input.projectId ?? this.projectId }); }
  getRun(id: string) { return this.api.getRun(id); }
  listRuns(projectId = this.projectId) { return this.api.listRuns(projectId); }
  patchRun(id: string, input: Partial<Run>) { return this.api.patchRun(id, input); }
  appendEvents(runId: string, events: EventRecord[]) { return this.api.appendEvents(runId, events); }
  getEvents(runId: string) { return this.api.getEvents(runId); }
  storeModelCall(runId: string, input: ModelCall) { return this.api.recordModelCall(runId, input); }
  storeToolProposal(runId: string, input: ToolProposal) { return this.api.recordToolProposal(runId, input); }
  storeToolExecution(runId: string, input: ToolExecution) { return this.api.recordToolExecution(runId, input); }
  createArtifact(input: Omit<CreateArtifactInput, "projectId"> & { projectId?: string }) { return this.api.createArtifact({ ...input, projectId: input.projectId ?? this.projectId }); }
  getArtifact(id: string) { return this.api.getArtifact(id); }
  createCheckpoint(runId: string, input: Omit<CreateCheckpointInput, "projectId" | "runId"> & { projectId?: string; runId?: string }) {
    return this.api.createCheckpoint(runId, { ...input, projectId: input.projectId ?? this.projectId, runId: input.runId ?? runId });
  }
  listCheckpoints(runId: string) { return this.api.listCheckpoints(runId); }
  createBranch(runId: string, input: Omit<CreateBranchInput, "projectId"> & { projectId?: string }) { return this.api.createBranch(runId, { ...input, projectId: input.projectId ?? this.projectId }); }
  getBranch(id: string) { return this.api.getBranch(id); }
  createIntervention(branchId: string, input: Omit<CreateInterventionInput, "projectId" | "branchId"> & { projectId?: string; branchId?: string }) {
    return this.api.createIntervention(branchId, { ...input, projectId: input.projectId ?? this.projectId, branchId: input.branchId ?? branchId });
  }
  listInterventions(branchId: string) { return this.api.listInterventions(branchId); }
  createReplay(input: Omit<CreateReplayInput, "projectId"> & { projectId?: string }) { return this.api.createReplay({ ...input, projectId: input.projectId ?? this.projectId }); }
  getReplay(id: string) { return this.api.getReplay(id); }
  getReplayEvents(id: string) { return this.api.getReplayEvents(id); }
  getReplayDiff(id: string) { return this.api.getReplayDiff(id); }
  getReplayMetrics(id: string) { return this.api.getReplayMetrics(id); }
  getFixtureRequirements(id: string) { return this.api.getFixtureRequirements(id); }
  addToolFixture(replayId: string, input: Omit<CreateToolFixtureInput, "projectId"> & { projectId?: string }) { return this.api.addToolFixture(replayId, { ...input, projectId: input.projectId ?? this.projectId }); }
  resumeReplay(replayId: string) { return this.api.resumeReplay(replayId); }
  getReplayEffects(id: string) { return this.api.getReplayEffects(id); }
  createAnalysisRun(input: Omit<CreateAnalysisRunInput, "projectId"> & { projectId?: string }) { return this.api.createAnalysisRun({ ...input, projectId: input.projectId ?? this.projectId }); }
  getAnalysisRun(id: string) { return this.api.getAnalysisRun(id); }
  getRunContextInventory(runId: string) { return this.api.getRunContextInventory(runId); }
  getModelCallContextInventory(id: string) { return this.api.getModelCallContextInventory(id); }
  getCheckpointContextInventory(id: string) { return this.api.getCheckpointContextInventory(id); }
  searchContext(input: Parameters<typeof this.api.searchContext>[0]) { return this.api.searchContext(input); }
  getRunCatalog(runId: string) { return this.api.getRunCatalog(runId); }
  createExperiment(input: Omit<CreateExperimentInput, "projectId"> & { projectId?: string }) { return this.api.createExperiment({ ...input, projectId: input.projectId ?? this.projectId }); }
  createHypothesisBatch(input: Omit<CreateHypothesisBatchInput, "projectId"> & { projectId?: string }) { return this.api.createHypothesisBatch({ ...input, projectId: input.projectId ?? this.projectId }); }
  getExperiment(id: string) { return this.api.getExperiment(id); }
  runExperiment(id: string, input?: RunExperimentInput) { return this.api.runExperiment(id, input); }
  getExperimentResults(id: string) { return this.api.getExperimentResults(id); }
  getExperimentRequirements(id: string) { return this.api.getExperimentRequirements(id); }
  getExperimentTrialMatrix(id: string) { return this.api.getExperimentTrialMatrix(id); }
  getExperimentStatistics(id: string) { return this.api.getExperimentStatistics(id); }
  getExperimentArmComparison(id: string) { return this.api.getExperimentArmComparison(id); }
  getExperimentEffects(id: string) { return this.api.getExperimentEffects(id); }
  rankEffects(input: Omit<RankEffectsInput, "projectId"> & { projectId?: string }) { return this.api.rankEffects({ ...input, projectId: input.projectId ?? this.projectId }); }
}
