import type {
  AnalysisRun,
  ContextInventory,
  ContextItem,
  ContextSearchInput,
  CreateAnalysisRunInput,
  CreateExperimentInput,
  CreateHypothesisBatchInput,
  EffectCandidate,
  Experiment,
  ExperimentArm,
  ExperimentStatistics,
  FixtureRequirement,
  RankEffectsInput,
  RunExperimentInput
} from "@isplay/core";
import type { AnalysisRunCreateResponse } from "../paths.js";
import { BaseResource } from "./base.js";

export class AnalysisResource extends BaseResource {
  async create(input: CreateAnalysisRunInput): Promise<AnalysisRunCreateResponse> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/analysis-runs", { body: input }), "POST", "/v1/analysis-runs");
  }

  async get(id: string): Promise<AnalysisRun> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/analysis-runs/{id}", { params: { path: { id } } }), "GET", "/v1/analysis-runs/{id}");
  }

  async modelCallInventory(id: string): Promise<ContextInventory> {
    const result = await this.transport.client.GET("/v1/model-calls/{id}/context-inventory", { params: { path: { id } } });
    return this.transport.unwrap(result, "GET", "/v1/model-calls/{id}/context-inventory");
  }

  async checkpointInventory(id: string): Promise<ContextInventory> {
    const result = await this.transport.client.GET("/v1/checkpoints/{id}/context-inventory", { params: { path: { id } } });
    return this.transport.unwrap(result, "GET", "/v1/checkpoints/{id}/context-inventory");
  }

  async searchContext(input: ContextSearchInput): Promise<ContextItem[]> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/context/search", { body: input }), "POST", "/v1/context/search");
  }

  async createExperiment(input: CreateExperimentInput): Promise<{ experiment: Experiment; arms: ExperimentArm[] }> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/experiments", { body: input }), "POST", "/v1/experiments");
  }

  async createHypothesisBatch(input: CreateHypothesisBatchInput): Promise<unknown> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/hypothesis-batches", { body: input }), "POST", "/v1/hypothesis-batches");
  }

  async experiment(id: string): Promise<Experiment> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/experiments/{id}", { params: { path: { id } } }), "GET", "/v1/experiments/{id}");
  }

  async runExperiment(id: string, input: RunExperimentInput): Promise<unknown> {
    const result = await this.transport.client.POST("/v1/experiments/{id}/run", { params: { path: { id } }, body: input });
    return this.transport.unwrap(result, "POST", "/v1/experiments/{id}/run");
  }

  async experimentResults(id: string): Promise<unknown> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/experiments/{id}/results", { params: { path: { id } } }), "GET", "/v1/experiments/{id}/results");
  }

  async experimentRequirements(id: string): Promise<FixtureRequirement[]> {
    const result = await this.transport.client.GET("/v1/experiments/{id}/requirements", { params: { path: { id } } });
    return this.transport.unwrap(result, "GET", "/v1/experiments/{id}/requirements");
  }

  async experimentTrialMatrix(id: string): Promise<unknown[]> {
    const result = await this.transport.client.GET("/v1/experiments/{id}/trial-matrix", { params: { path: { id } } });
    return this.transport.unwrap(result, "GET", "/v1/experiments/{id}/trial-matrix");
  }

  async experimentStatistics(id: string): Promise<ExperimentStatistics> {
    const result = await this.transport.client.GET("/v1/experiments/{id}/statistics", { params: { path: { id } } });
    return this.transport.unwrap(result, "GET", "/v1/experiments/{id}/statistics");
  }

  async experimentArmComparison(id: string): Promise<unknown[]> {
    const result = await this.transport.client.GET("/v1/experiments/{id}/arm-comparison", { params: { path: { id } } });
    return this.transport.unwrap(result, "GET", "/v1/experiments/{id}/arm-comparison");
  }

  async experimentEffects(id: string): Promise<EffectCandidate[]> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/experiments/{id}/effects", { params: { path: { id } } }), "GET", "/v1/experiments/{id}/effects");
  }

  async rankEffects(input: RankEffectsInput): Promise<EffectCandidate[]> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/effects:rank", { body: input }), "POST", "/v1/effects:rank");
  }
}
