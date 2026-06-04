import type {
  Artifact,
  Branch,
  Catalog,
  Checkpoint,
  AnalysisRun,
  ContextInventory,
  ContextItem,
  ContextSearchInput,
  CreateArtifactInput,
  CreateAnalysisRunInput,
  CreateBranchInput,
  CreateCheckpointInput,
  CreateExperimentInput,
  CreateHypothesisBatchInput,
  CreateInterventionInput,
  CreateProjectInput,
  CreateReplayInput,
  CreateRunInput,
  CreateToolFixtureInput,
  DiffRecord,
  EffectCandidate,
  EventRecord,
  Experiment,
  ExperimentStatistics,
  FixtureRequirement,
  Intervention,
  Metric,
  ModelCall,
  Project,
  RankEffectsInput,
  Replay,
  ReplayAttempt,
  Run,
  RunExperimentInput,
  ToolExecution,
  ToolFixture,
  ToolProposal
} from "@isplay/core";
import { AnalysisResource } from "./resources/analysis.js";
import { BranchResource } from "./resources/branches.js";
import { ProjectResource } from "./resources/projects.js";
import { ReplayResource } from "./resources/replays.js";
import { RunResource } from "./resources/runs.js";
import { ApiTransport } from "./transport.js";
import type { ApiClientOptions } from "./options.js";
import type {
  AnalysisRunCreateResponse,
  ArmComparisonRow,
  CreateExperimentResponse,
  ExperimentResultsResponse,
  ExperimentRunResponse,
  HypothesisBatchCreateResponse,
  PageQuery,
  PatchRunInput,
  TrialMatrixRow
} from "./paths.js";

export class IsplayApiClient {
  readonly baseUrl: string;
  readonly projects: ProjectResource;
  readonly runs: RunResource;
  readonly branches: BranchResource;
  readonly replays: ReplayResource;
  readonly analysis: AnalysisResource;
  private readonly transport: ApiTransport;

  constructor(options: ApiClientOptions = {}) {
    const transport = new ApiTransport(options);
    this.transport = transport;
    this.baseUrl = transport.baseUrl;
    this.projects = new ProjectResource(transport);
    this.runs = new RunResource(transport);
    this.branches = new BranchResource(transport);
    this.replays = new ReplayResource(transport);
    this.analysis = new AnalysisResource(transport);
  }

  async health(): Promise<{ ok: boolean }> {
    return this.transport.unwrap(await this.transport.client.GET("/health"), "GET", "/health");
  }
  async getJobEvents(id: string): Promise<string> {
    return this.transport.unwrap(
      await this.transport.client.GET("/v1/jobs/{id}/events", { params: { path: { id } }, parseAs: "text" }),
      "GET",
      "/v1/jobs/{id}/events"
    );
  }

  createProject(input: CreateProjectInput): Promise<Project> { return this.projects.create(input); }
  getProject(id: string): Promise<Project> { return this.projects.get(id); }
  getProjectCatalog(id: string): Promise<Catalog> { return this.projects.catalog(id); }
  createRun(input: CreateRunInput): Promise<Run> { return this.runs.create(input); }
  getRun(id: string): Promise<Run> { return this.runs.get(id); }
  listRuns(projectId?: string, page?: PageQuery): Promise<Run[]> { return this.runs.list(projectId, page); }
  patchRun(id: string, input: PatchRunInput): Promise<Run> { return this.runs.patch(id, input); }
  appendEvents(runId: string, events: EventRecord[]): Promise<{ inserted: number }> { return this.runs.appendEvents(runId, events); }
  getEvents(runId: string, page?: PageQuery): Promise<EventRecord[]> { return this.runs.events(runId, page); }
  recordModelCall(runId: string, input: ModelCall): Promise<ModelCall> { return this.runs.recordModelCall(runId, input); }
  recordToolProposal(runId: string, input: ToolProposal): Promise<ToolProposal> { return this.runs.recordToolProposal(runId, input); }
  recordToolExecution(runId: string, input: ToolExecution): Promise<ToolExecution> { return this.runs.recordToolExecution(runId, input); }
  createArtifact(input: CreateArtifactInput): Promise<Artifact> { return this.runs.createArtifact(input); }
  getArtifact(id: string): Promise<Artifact & { payload?: unknown }> { return this.runs.artifact(id); }
  createCheckpoint(runId: string, input: CreateCheckpointInput): Promise<Checkpoint> { return this.runs.createCheckpoint(runId, input); }
  listCheckpoints(runId: string): Promise<Checkpoint[]> { return this.runs.checkpoints(runId); }
  createBranch(runId: string, input: CreateBranchInput): Promise<Branch> { return this.runs.createBranch(runId, input); }
  getBranch(id: string): Promise<Branch> { return this.branches.get(id); }
  createIntervention(branchId: string, input: CreateInterventionInput): Promise<Intervention> { return this.branches.createIntervention(branchId, input); }
  listInterventions(branchId: string): Promise<Intervention[]> { return this.branches.interventions(branchId); }
  createReplay(input: CreateReplayInput): Promise<Replay> { return this.replays.create(input); }
  getReplay(id: string): Promise<Replay> { return this.replays.get(id); }
  getReplayEvents(id: string, page?: PageQuery): Promise<EventRecord[]> { return this.replays.events(id, page); }
  getReplayAttempts(id: string, page?: PageQuery): Promise<ReplayAttempt[]> { return this.replays.attempts(id, page); }
  getReplayDiff(id: string): Promise<DiffRecord[]> { return this.replays.diff(id); }
  getReplayMetrics(id: string): Promise<Metric[]> { return this.replays.metrics(id); }
  getFixtureRequirements(id: string): Promise<FixtureRequirement[]> { return this.replays.fixtureRequirements(id); }
  addToolFixture(replayId: string, input: CreateToolFixtureInput): Promise<ToolFixture> { return this.replays.addToolFixture(replayId, input); }
  resumeReplay(replayId: string): Promise<Replay> { return this.replays.resume(replayId); }
  getReplayEffects(id: string): Promise<EffectCandidate[]> { return this.replays.effects(id); }
  createAnalysisRun(input: CreateAnalysisRunInput): Promise<AnalysisRunCreateResponse> { return this.analysis.create(input); }
  getAnalysisRun(id: string): Promise<AnalysisRun> { return this.analysis.get(id); }
  getRunContextInventory(runId: string): Promise<ContextInventory> { return this.runs.contextInventory(runId); }
  getModelCallContextInventory(id: string): Promise<ContextInventory> { return this.analysis.modelCallInventory(id); }
  getCheckpointContextInventory(id: string): Promise<ContextInventory> { return this.analysis.checkpointInventory(id); }
  searchContext(input: ContextSearchInput): Promise<ContextItem[]> { return this.analysis.searchContext(input); }
  getRunCatalog(runId: string): Promise<Catalog> { return this.runs.catalog(runId); }
  createExperiment(input: CreateExperimentInput): Promise<CreateExperimentResponse> { return this.analysis.createExperiment(input); }
  createHypothesisBatch(input: CreateHypothesisBatchInput): Promise<HypothesisBatchCreateResponse> { return this.analysis.createHypothesisBatch(input); }
  getExperiment(id: string): Promise<Experiment> { return this.analysis.experiment(id); }
  runExperiment(id: string, input: RunExperimentInput = { wait: true }): Promise<ExperimentRunResponse> { return this.analysis.runExperiment(id, input); }
  getExperimentResults(id: string, page?: PageQuery): Promise<ExperimentResultsResponse> { return this.analysis.experimentResults(id, page); }
  getExperimentRequirements(id: string, page?: PageQuery): Promise<FixtureRequirement[]> { return this.analysis.experimentRequirements(id, page); }
  getExperimentTrialMatrix(id: string, page?: PageQuery): Promise<TrialMatrixRow[]> { return this.analysis.experimentTrialMatrix(id, page); }
  getExperimentStatistics(id: string): Promise<ExperimentStatistics> { return this.analysis.experimentStatistics(id); }
  getExperimentArmComparison(id: string, page?: PageQuery): Promise<ArmComparisonRow[]> { return this.analysis.experimentArmComparison(id, page); }
  getExperimentEffects(id: string): Promise<EffectCandidate[]> { return this.analysis.experimentEffects(id); }
  rankEffects(input: RankEffectsInput): Promise<EffectCandidate[]> { return this.analysis.rankEffects(input); }
}
