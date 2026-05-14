import type { Catalog, CreateProjectInput, Project } from "@isplay/core";
import { BaseResource } from "./base.js";

export class ProjectResource extends BaseResource {
  async create(input: CreateProjectInput): Promise<Project> {
    return this.transport.unwrap(await this.transport.client.POST("/v1/projects", { body: input }), "POST", "/v1/projects");
  }

  async get(id: string): Promise<Project> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/projects/{id}", { params: { path: { id } } }), "GET", "/v1/projects/{id}");
  }

  async catalog(id: string): Promise<Catalog> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/projects/{id}/catalog", { params: { path: { id } } }), "GET", "/v1/projects/{id}/catalog");
  }
}
