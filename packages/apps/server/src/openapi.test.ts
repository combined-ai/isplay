import { describe, expect, it } from "vitest";
import type { IsplayStore } from "@isplay/postgres";
import { createApp } from "./app.js";

describe("@isplay/server OpenAPI", () => {
  it("publishes registered API paths", async () => {
    const response = await createApp({} as IsplayStore).request("/openapi.json");
    const document = await response.json();
    expect(Object.keys(document.paths)).toContain("/v1/projects");
    expect(Object.keys(document.paths)).toContain("/v1/replays");
    expect(Object.keys(document.paths)).toContain("/v1/runs/{id}/context-inventory");
    expect(Object.keys(document.paths)).toContain("/v1/hypothesis-batches");
    expect(Object.keys(document.paths)).toContain("/v1/experiments/{id}/statistics");
    expect(Object.keys(document.paths)).toContain("/v1/effects:rank");
  });

  it("returns structured validation errors", async () => {
    const response = await createApp({} as IsplayStore).request("/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Invalid request", code: "invalid_request", retryable: false, recoverable: true });
  });

  it("serves catalog and context inventory for analyst discovery", async () => {
    const store = {
      getRunCatalog: async () => ({ projectId: "project_1", runId: "run_1", observed: {}, capabilities: {}, nextActions: [] }),
      getRunContextInventory: async () => ({ projectId: "project_1", runId: "run_1", items: [], summary: {}, metadata: {} })
    } as IsplayStore;
    const [catalog, inventory] = await Promise.all([
      createApp(store).request("/v1/runs/run_1/catalog"),
      createApp(store).request("/v1/runs/run_1/context-inventory")
    ]);
    expect(catalog.status).toBe(200);
    expect(inventory.status).toBe(200);
  });

  it("does not strip replay-critical model call fields before handlers run", async () => {
    const store = {
      putModelCall: async (record: unknown) => record
    } as IsplayStore;
    const response = await createApp(store).request("/v1/runs/run_1/model-calls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "model_1",
        createdAt: "2026-05-22T00:00:00.000Z",
        projectId: "project_1",
        runId: "run_1",
        operation: "generate",
        status: "running",
        startedAt: "2026-05-22T00:00:00.000Z",
        metadata: {}
      })
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ startedAt: "2026-05-22T00:00:00.000Z" });
  });

  it("does not inject default metadata into status-only run patches", async () => {
    let patch: Record<string, unknown> | undefined;
    const store = {
      patchRun: async (_id: string, input: Record<string, unknown>) => {
        patch = input;
        return {
          id: "run_1",
          createdAt: "2026-05-22T00:00:00.000Z",
          projectId: "project_1",
          status: "ok",
          startedAt: "2026-05-22T00:00:00.000Z",
          metadata: { claimId: "CLM_1" },
          ...input
        };
      }
    } as IsplayStore;
    const response = await createApp(store).request("/v1/runs/run_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "ok", endedAt: "2026-05-22T00:01:00.000Z" })
    });
    expect(response.status).toBe(200);
    expect(patch).not.toHaveProperty("metadata");
  });

  it("does not fall back to base run events for empty replay events", async () => {
    let fetchedBaseEvents = false;
    const store = {
      getReplay: async () => ({
        id: "replay_1",
        projectId: "project_1",
        baseRunId: "run_1",
        status: "queued",
        metadata: {}
      }),
      listReplayEvents: async () => [],
      getEvents: async () => {
        fetchedBaseEvents = true;
        return [];
      }
    } as unknown as IsplayStore;

    const response = await createApp(store).request("/v1/replays/replay_1/events");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(fetchedBaseEvents).toBe(false);
  });
});
