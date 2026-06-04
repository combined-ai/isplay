import type {
  Artifact,
  Branch,
  Catalog,
  Checkpoint,
  ContextInventory,
  CreateArtifactInput,
  CreateBranchInput,
  CreateCheckpointInput,
  CreateRunInput,
  EventRecord,
  ModelCall,
  Run,
  ToolExecution,
  ToolProposal
} from "@isplay/core";
import { BaseResource } from "./base.js";
import type { PageQuery, PatchRunInput } from "../paths.js";

export class RunResource extends BaseResource {
  async create(input: CreateRunInput): Promise<Run> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/runs", { body: input }), "POST", "/v1/runs");
  }

  async get(id: string): Promise<Run> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/runs/{id}", { params: { path: { id } } }), "GET", "/v1/runs/{id}");
  }

  async list(projectId?: string, page?: PageQuery): Promise<Run[]> {
    const query = { ...(projectId ? { projectId } : {}), ...(page ?? {}) };
    const options = Object.keys(query).length ? { params: { query } } : {};
    return this.transport.unwrap(await this.transport.client.GET("/v1/runs", options), "GET", "/v1/runs");
  }

  async patch(id: string, input: PatchRunInput): Promise<Run> {
    return this.transport.unwrap(await this.transport.client.PATCH("/v1/runs/{id}", { params: { path: { id } }, body: input }), "PATCH", "/v1/runs/{id}");
  }

  async appendEvents(runId: string, events: EventRecord[]): Promise<{ inserted: number }> {
    const result = await this.transport.client.POST("/v1/runs/{id}/events:batch", { params: { path: { id: runId } }, body: { events } });
    return this.transport.unwrap(result, "POST", "/v1/runs/{id}/events:batch");
  }

  async events(runId: string, page?: PageQuery): Promise<EventRecord[]> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/runs/{id}/events", { params: { path: { id: runId }, query: page } }), "GET", "/v1/runs/{id}/events");
  }

  async recordModelCall(runId: string, input: ModelCall): Promise<ModelCall> {
    const result = await this.transport.client.POST("/v1/runs/{id}/model-calls", { params: { path: { id: runId } }, body: input });
    return this.transport.unwrap(result, "POST", "/v1/runs/{id}/model-calls");
  }

  async recordToolProposal(runId: string, input: ToolProposal): Promise<ToolProposal> {
    const result = await this.transport.client.POST("/v1/runs/{id}/tool-proposals", { params: { path: { id: runId } }, body: input });
    return this.transport.unwrap(result, "POST", "/v1/runs/{id}/tool-proposals");
  }

  async recordToolExecution(runId: string, input: ToolExecution): Promise<ToolExecution> {
    const result = await this.transport.client.POST("/v1/runs/{id}/tool-executions", { params: { path: { id: runId } }, body: input });
    return this.transport.unwrap(result, "POST", "/v1/runs/{id}/tool-executions");
  }

  async createArtifact(input: CreateArtifactInput): Promise<Artifact> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/artifacts", { body: input }), "POST", "/v1/artifacts");
  }

  async artifact(id: string): Promise<Artifact & { payload?: unknown }> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/artifacts/{id}", { params: { path: { id } } }), "GET", "/v1/artifacts/{id}");
  }

  async createCheckpoint(runId: string, input: CreateCheckpointInput): Promise<Checkpoint> {
    const result = await this.transport.client.POST("/v1/runs/{id}/checkpoints", { params: { path: { id: runId } }, body: input });
    return this.transport.unwrap(result, "POST", "/v1/runs/{id}/checkpoints");
  }

  async checkpoints(runId: string): Promise<Checkpoint[]> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/runs/{id}/checkpoints", { params: { path: { id: runId } } }), "GET", "/v1/runs/{id}/checkpoints");
  }

  async createBranch(runId: string, input: CreateBranchInput): Promise<Branch> {
    const result = await this.transport.client.POST("/v1/runs/{id}/branches", { params: { path: { id: runId } }, body: input });
    return this.transport.unwrap(result, "POST", "/v1/runs/{id}/branches");
  }

  async contextInventory(runId: string): Promise<ContextInventory> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/runs/{id}/context-inventory", { params: { path: { id: runId } } }), "GET", "/v1/runs/{id}/context-inventory");
  }

  async catalog(runId: string): Promise<Catalog> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/runs/{id}/catalog", { params: { path: { id: runId } } }), "GET", "/v1/runs/{id}/catalog");
  }
}
