import type { Branch, CreateInterventionInput, Intervention } from "@isplay/core";
import { BaseResource } from "./base.js";

export class BranchResource extends BaseResource {
  async get(id: string): Promise<Branch> {
    return this.transport.unwrap(await this.transport.client.GET("/v1/branches/{id}", { params: { path: { id } } }), "GET", "/v1/branches/{id}");
  }

  async createIntervention(branchId: string, input: CreateInterventionInput): Promise<Intervention> {
    const result = await this.transport.client.POST("/v1/branches/{id}/interventions", { params: { path: { id: branchId } }, body: input });
    return this.transport.unwrap(result, "POST", "/v1/branches/{id}/interventions");
  }

  async interventions(branchId: string): Promise<Intervention[]> {
    const result = await this.transport.client.GET("/v1/branches/{id}/interventions", { params: { path: { id: branchId } } });
    return this.transport.unwrap(result, "GET", "/v1/branches/{id}/interventions");
  }
}
