import type {
  CreateReplayInput,
  CreateToolFixtureInput,
  DiffRecord,
  EffectCandidate,
  EventRecord,
  FixtureRequirement,
  Metric,
  Replay,
  ReplayAttempt,
  ToolFixture
} from "@isplay/core";
import { BaseResource } from "./base.js";
import type { PageQuery } from "../paths.js";

export class ReplayResource extends BaseResource {
  async create(input: CreateReplayInput): Promise<Replay> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/replays", { body: input }), "POST", "/v1/replays");
  }

  async get(id: string): Promise<Replay> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/replays/{id}", { params: { path: { id } } }), "GET", "/v1/replays/{id}");
  }

  async events(id: string, page?: PageQuery): Promise<EventRecord[]> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/replays/{id}/events", { params: { path: { id }, query: page } }), "GET", "/v1/replays/{id}/events");
  }

  async attempts(id: string, page?: PageQuery): Promise<ReplayAttempt[]> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/replays/{id}/attempts", { params: { path: { id }, query: page } }), "GET", "/v1/replays/{id}/attempts");
  }

  async diff(id: string): Promise<DiffRecord[]> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/replays/{id}/diff", { params: { path: { id } } }), "GET", "/v1/replays/{id}/diff");
  }

  async metrics(id: string): Promise<Metric[]> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/replays/{id}/metrics", { params: { path: { id } } }), "GET", "/v1/replays/{id}/metrics");
  }

  async fixtureRequirements(id: string): Promise<FixtureRequirement[]> {
    const result = await this.transport.client.GET("/v1/replays/{id}/fixture-requirements", { params: { path: { id } } });
    return this.transport.unwrap(result, "GET", "/v1/replays/{id}/fixture-requirements");
  }

  async addToolFixture(replayId: string, input: CreateToolFixtureInput): Promise<ToolFixture> {
    const result = await this.transport.client.POST("/v1/replays/{id}/tool-fixtures", { params: { path: { id: replayId } }, body: input });
    return this.transport.unwrap(result, "POST", "/v1/replays/{id}/tool-fixtures");
  }

  async resume(replayId: string): Promise<Replay> {
    const result = await this.transport.client.POST("/v1/replays/{id}/resume", { params: { path: { id: replayId } }, body: {} });
    return this.transport.unwrap(result, "POST", "/v1/replays/{id}/resume");
  }

  async effects(id: string): Promise<EffectCandidate[]> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/replays/{id}/effects", { params: { path: { id } } }), "GET", "/v1/replays/{id}/effects");
  }
}
