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
  ExperimentArm,
  ExperimentStatistics,
  FixtureRequirement,
  Intervention,
  Metric,
  ModelCall,
  Project,
  RankEffectsInput,
  Replay,
  Run,
  RunExperimentInput,
  ToolExecution,
  ToolFixture,
  ToolProposal
} from "@isplay/core";

type Json<T> = { content: { "application/json": T } };
type Body<T> = { requestBody: Json<T> };
type Ok<T> = { responses: { 200: Json<T> } };
type Created<T> = { responses: { 201: Json<T> } };
type Upsert<T> = { responses: { 200: Json<T>; 201: Json<T> } };
type Path<T extends Record<string, string>> = { parameters: { path: T } };
type Query<T extends Record<string, unknown>> = { parameters: { query?: T } };
type Post<I, O> = Body<I> & Created<O>;
type PutEvent<I, O> = Body<I> & Upsert<O>;

export type AnalysisRunCreateResponse = {
  analysisRun: AnalysisRun;
  evidenceNodes: unknown[];
  evidenceEdges: unknown[];
  scores: Metric[];
};

export type IsplayPaths = {
  "/health": { get: Ok<{ ok: boolean }> };
  "/v1/projects": { post: Post<CreateProjectInput, Project> };
  "/v1/projects/{id}": { get: Path<{ id: string }> & Ok<Project> };
  "/v1/projects/{id}/catalog": { get: Path<{ id: string }> & Ok<Catalog> };
  "/v1/runs": { get: Query<{ projectId?: string }> & Ok<Run[]>; post: Post<CreateRunInput, Run> };
  "/v1/runs/{id}": { get: Path<{ id: string }> & Ok<Run>; patch: Path<{ id: string }> & Body<Partial<Run>> & Ok<Run> };
  "/v1/runs/{id}/events:batch": { post: Path<{ id: string }> & Body<{ events: EventRecord[] }> & Created<{ inserted: number }> };
  "/v1/runs/{id}/events": { get: Path<{ id: string }> & Ok<EventRecord[]> };
  "/v1/runs/{id}/model-calls": { post: Path<{ id: string }> & PutEvent<ModelCall, ModelCall> };
  "/v1/runs/{id}/tool-proposals": { post: Path<{ id: string }> & PutEvent<ToolProposal, ToolProposal> };
  "/v1/runs/{id}/tool-executions": { post: Path<{ id: string }> & PutEvent<ToolExecution, ToolExecution> };
  "/v1/runs/{id}/checkpoints": { get: Path<{ id: string }> & Ok<Checkpoint[]>; post: Path<{ id: string }> & Post<CreateCheckpointInput, Checkpoint> };
  "/v1/runs/{id}/branches": { post: Path<{ id: string }> & Post<CreateBranchInput, Branch> };
  "/v1/runs/{id}/context-inventory": { get: Path<{ id: string }> & Ok<ContextInventory> };
  "/v1/runs/{id}/catalog": { get: Path<{ id: string }> & Ok<Catalog> };
  "/v1/artifacts": { post: Post<CreateArtifactInput, Artifact> };
  "/v1/artifacts/{id}": { get: Path<{ id: string }> & Ok<Artifact & { payload?: unknown }> };
  "/v1/branches/{id}": { get: Path<{ id: string }> & Ok<Branch> };
  "/v1/branches/{id}/interventions": { get: Path<{ id: string }> & Ok<Intervention[]>; post: Path<{ id: string }> & Post<CreateInterventionInput, Intervention> };
  "/v1/replays": { post: Post<CreateReplayInput, Replay> };
  "/v1/replays/{id}": { get: Path<{ id: string }> & Ok<Replay> };
  "/v1/replays/{id}/events": { get: Path<{ id: string }> & Ok<EventRecord[]> };
  "/v1/replays/{id}/diff": { get: Path<{ id: string }> & Ok<DiffRecord[]> };
  "/v1/replays/{id}/metrics": { get: Path<{ id: string }> & Ok<Metric[]> };
  "/v1/replays/{id}/fixture-requirements": { get: Path<{ id: string }> & Ok<FixtureRequirement[]> };
  "/v1/replays/{id}/tool-fixtures": { post: Path<{ id: string }> & Post<CreateToolFixtureInput, ToolFixture> };
  "/v1/replays/{id}/resume": { post: Path<{ id: string }> & Body<Record<string, never>> & Ok<Replay> };
  "/v1/replays/{id}/effects": { get: Path<{ id: string }> & Ok<EffectCandidate[]> };
  "/v1/analysis-runs": { post: Post<CreateAnalysisRunInput, AnalysisRunCreateResponse> };
  "/v1/analysis-runs/{id}": { get: Path<{ id: string }> & Ok<AnalysisRun> };
  "/v1/model-calls/{id}/context-inventory": { get: Path<{ id: string }> & Ok<ContextInventory> };
  "/v1/checkpoints/{id}/context-inventory": { get: Path<{ id: string }> & Ok<ContextInventory> };
  "/v1/context/search": { post: Body<ContextSearchInput> & Ok<ContextItem[]> };
  "/v1/experiments": { post: Post<CreateExperimentInput, { experiment: Experiment; arms: ExperimentArm[] }> };
  "/v1/hypothesis-batches": { post: Post<CreateHypothesisBatchInput, unknown> };
  "/v1/experiments/{id}": { get: Path<{ id: string }> & Ok<Experiment> };
  "/v1/experiments/{id}/run": { post: Path<{ id: string }> & Body<RunExperimentInput> & Ok<unknown> };
  "/v1/experiments/{id}/results": { get: Path<{ id: string }> & Ok<unknown> };
  "/v1/experiments/{id}/requirements": { get: Path<{ id: string }> & Ok<FixtureRequirement[]> };
  "/v1/experiments/{id}/trial-matrix": { get: Path<{ id: string }> & Ok<unknown[]> };
  "/v1/experiments/{id}/statistics": { get: Path<{ id: string }> & Ok<ExperimentStatistics> };
  "/v1/experiments/{id}/arm-comparison": { get: Path<{ id: string }> & Ok<unknown[]> };
  "/v1/experiments/{id}/effects": { get: Path<{ id: string }> & Ok<EffectCandidate[]> };
  "/v1/effects:rank": { post: Body<RankEffectsInput> & Ok<EffectCandidate[]> };
};
