import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  CreateArtifactSchema,
  CreateCheckpointSchema,
  CreateRunSchema,
  ModelCallSchema,
  RunSchema,
  ToolExecutionSchema,
  ToolProposalSchema
} from "@isplay/core";
import { ErrorResponseSchema, ensureSame, jsonBody, jsonContent, notFound, registerRoute, type AppBindings } from "../http.js";
import {
  ArtifactDoc,
  CheckpointDoc,
  CreateArtifactDoc,
  CreateCheckpointDoc,
  CreateRunDoc,
  EventDoc,
  ModelCallDoc,
  RunDoc,
  ToolExecutionDoc,
  ToolProposalDoc
} from "../openapi-schemas.js";

const IdParamsSchema = z.object({ id: z.string() });
const RunListQuerySchema = z.object({ projectId: z.string().optional() });
const PatchRunSchema = z.object({
  agentId: z.string().optional(),
  name: z.string().optional(),
  status: z.enum(["running", "ok", "error", "cancelled"]).optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});
const PatchRunDoc = RunDoc.partial();
const EventBatchSchema = z.object({ events: z.array(z.any()) });
const EventBatchDoc = z.object({ events: z.array(EventDoc) });
const InsertedSchema = z.object({ inserted: z.number().int().nonnegative() });

export function registerRunRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(app, bodyRoute("post", "/v1/runs", CreateRunDoc, RunDoc, "Created run", 201), async (c) => c.json(await c.var.store.createRun(CreateRunSchema.parse(c.req.valid("json"))), 201));
  registerRoute(app,
    createRoute({ method: "get", path: "/v1/runs", request: { query: RunListQuerySchema }, responses: { 200: jsonContent(z.array(RunDoc), "Runs") } }),
    async (c) => c.json(await c.var.store.listRuns(c.req.valid("query").projectId), 200)
  );
  registerRoute(app, createRoute({ method: "get", path: "/v1/runs/{id}", request: { params: IdParamsSchema }, responses: { 200: jsonContent(RunDoc, "Run"), 404: jsonContent(ErrorResponseSchema, "Run not found") } }), async (c) => {
    const run = await c.var.store.getRun(c.req.valid("param").id);
    return run ? c.json(run, 200) : notFound(c, "Run");
  });
  registerRoute(app, route("patch", "/v1/runs/{id}", PatchRunDoc, RunDoc, "Updated run", 200), async (c) => c.json(await c.var.store.patchRun(c.req.valid("param").id, PatchRunSchema.parse(c.req.valid("json"))), 200));
  registerRoute(app, route("post", "/v1/runs/{id}/events:batch", EventBatchDoc, InsertedSchema, "Inserted events", 200), async (c) => {
    const runId = c.req.valid("param").id;
    const body = EventBatchSchema.parse(c.req.valid("json"));
    for (const event of body.events) ensureSame(event.runId, runId, "Path run id and event runId differ");
    return c.json({ inserted: await c.var.store.appendEvents(runId, body.events) }, 200);
  });
  registerRoute(app, createRoute({ method: "get", path: "/v1/runs/{id}/events", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(EventDoc), "Run events") } }), async (c) => c.json(await c.var.store.getEvents(c.req.valid("param").id), 200));
  registerRoute(app, bodyRoute("post", "/v1/artifacts", CreateArtifactDoc, ArtifactDoc, "Created artifact", 201), async (c) => c.json(await c.var.store.createArtifact(CreateArtifactSchema.parse(c.req.valid("json"))), 201));
  registerRoute(app, createRoute({ method: "get", path: "/v1/artifacts/{id}", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ArtifactDoc, "Artifact"), 404: jsonContent(ErrorResponseSchema, "Artifact not found") } }), async (c) => {
    const artifact = await c.var.store.getArtifact(c.req.valid("param").id);
    return artifact ? c.json(artifact, 200) : notFound(c, "Artifact");
  });
  registerRoute(app, route("post", "/v1/runs/{id}/checkpoints", CreateCheckpointDoc, CheckpointDoc, "Created checkpoint", 201), async (c) => {
    const body = CreateCheckpointSchema.parse(c.req.valid("json"));
    ensureSame(body.runId, c.req.valid("param").id, "Path run id and body runId differ");
    return c.json(await c.var.store.createCheckpoint(body), 201);
  });
  registerRoute(app, createRoute({ method: "get", path: "/v1/runs/{id}/checkpoints", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(CheckpointDoc), "Checkpoints") } }), async (c) => c.json(await c.var.store.listCheckpoints(c.req.valid("param").id), 200));
  registerModelToolRoutes(app);
}

function registerModelToolRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(app, route("post", "/v1/runs/{id}/model-calls", ModelCallDoc, ModelCallDoc, "Stored model call", 201), async (c) => checkedPut(c, "model"));
  registerRoute(app, route("post", "/v1/runs/{id}/tool-proposals", ToolProposalDoc, ToolProposalDoc, "Stored tool proposal", 201), async (c) => checkedPut(c, "proposal"));
  registerRoute(app, route("post", "/v1/runs/{id}/tool-executions", ToolExecutionDoc, ToolExecutionDoc, "Stored tool execution", 201), async (c) => checkedPut(c, "execution"));
}

async function checkedPut(c: any, kind: "model" | "proposal" | "execution") {
  const body =
    kind === "model"
      ? ModelCallSchema.parse(c.req.valid("json"))
      : kind === "proposal"
        ? ToolProposalSchema.parse(c.req.valid("json"))
        : ToolExecutionSchema.parse(c.req.valid("json"));
  ensureSame(body.runId, c.req.valid("param").id, "Path run id and body runId differ");
  if (kind === "model") return c.json(await c.var.store.putModelCall(body), 201);
  if (kind === "proposal") return c.json(await c.var.store.putToolProposal(body), 201);
  return c.json(await c.var.store.putToolExecution(body), 201);
}

function route(method: "post" | "patch", path: string, body: z.ZodType, response: z.ZodType, description: string, status: 200 | 201) {
  return createRoute({ method, path, request: { params: IdParamsSchema, body: jsonBody(body) }, responses: { [status]: jsonContent(response, description), 400: jsonContent(ErrorResponseSchema, "Invalid request") } });
}

function bodyRoute(method: "post", path: string, body: z.ZodType, response: z.ZodType, description: string, status: 201) {
  return createRoute({ method, path, request: { body: jsonBody(body) }, responses: { [status]: jsonContent(response, description), 400: jsonContent(ErrorResponseSchema, "Invalid request") } });
}
