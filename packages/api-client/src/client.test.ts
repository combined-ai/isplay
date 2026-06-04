import { describe, expect, it } from "vitest";
import { IsplayApiClient, IsplayApiError } from "./index.js";

describe("IsplayApiClient", () => {
  it("uses the OpenAPI fetch transport for resource calls", async () => {
    const requests: Request[] = [];
    const client = new IsplayApiClient({
      baseUrl: "http://isplay.test",
      fetch: async (input) => {
        requests.push(input as Request);
        return jsonResponse(201, { id: "project_1", createdAt: "2026-01-01T00:00:00.000Z", name: "Lab", metadata: {} });
      }
    });

    const project = await client.createProject({ name: "Lab" });

    expect(project.id).toBe("project_1");
    expect(requests[0]?.method).toBe("POST");
    expect(new URL(requests[0]?.url ?? "").pathname).toBe("/v1/projects");
  });

  it("raises stable API errors", async () => {
    const client = new IsplayApiClient({
      baseUrl: "http://isplay.test",
      fetch: async () => jsonResponse(500, { error: "boom", details: { requestId: "req_1" } })
    });

    await expect(client.getProject("missing")).rejects.toMatchObject({
      name: "IsplayApiError",
      status: 500,
      body: { error: "boom", details: { requestId: "req_1" } }
    } satisfies Partial<IsplayApiError>);
  });

  it("reads job events through the typed OpenAPI path", async () => {
    const requests: Request[] = [];
    const client = new IsplayApiClient({
      baseUrl: "http://isplay.test",
      fetch: async (input) => {
        requests.push(input as Request);
        return new Response("event: job.finished\n\n", { status: 200, headers: { "content-type": "text/event-stream" } });
      }
    });

    await expect(client.getJobEvents("job_1")).resolves.toBe("event: job.finished\n\n");
    expect(requests[0]?.method).toBe("GET");
    expect(new URL(requests[0]?.url ?? "").pathname).toBe("/v1/jobs/job_1/events");
  });
});

function jsonResponse(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
