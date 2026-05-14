import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { CreateReplaySchema, CreateToolFixtureSchema, EventSchema, FixtureRequirementSchema, ReplaySchema, ToolFixtureSchema } from "@isplay/core";
import { ErrorResponseSchema, ensureSame, jsonBody, jsonContent, notFound, registerRoute, type AppBindings } from "../http.js";
import { executeReplay } from "../runners/replay.js";
import { CreateReplayDoc, CreateToolFixtureDoc, EventDoc, FixtureRequirementDoc, ReplayDoc, ToolFixtureDoc } from "../openapi-schemas.js";

const IdParamsSchema = z.object({ id: z.string() });

export function registerReplayRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(app,
    createRoute({ method: "post", path: "/v1/replays", request: { body: jsonBody(CreateReplayDoc) }, responses: { 201: jsonContent(ReplayDoc, "Replay"), 202: jsonContent(ReplayDoc, "Paused replay"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => {
      const replay = await c.var.store.createReplay(CreateReplaySchema.parse(c.req.valid("json")));
      const executed = await executeReplay(c.var.store, replay);
      return c.json(executed, executed.status === "paused" ? 202 : 201);
    }
  );

  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ReplayDoc, "Replay"), 404: jsonContent(ErrorResponseSchema, "Replay not found") } }), async (c) => {
    const replay = await c.var.store.getReplay(c.req.valid("param").id);
    return replay ? c.json(replay, 200) : notFound(c, "Replay");
  });

  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/events", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(EventDoc), "Replay events") } }), async (c) => {
    const replayId = c.req.valid("param").id;
    const events = await c.var.store.listReplayEvents(replayId);
    if (events.length) return c.json(events, 200);
    const replay = await c.var.store.getReplay(replayId);
    return replay ? c.json(await c.var.store.getEvents(replay.runId), 200) : notFound(c, "Replay");
  });

  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/fixture-requirements", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(FixtureRequirementDoc), "Fixture requirements") } }), async (c) => c.json(await c.var.store.listFixtureRequirements(c.req.valid("param").id), 200));
  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/diff", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(z.any()), "Replay diffs") } }), async (c) => c.json(await c.var.store.listDiffs(c.req.valid("param").id), 200));
  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/metrics", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(z.any()), "Replay metrics") } }), async (c) => c.json(await c.var.store.listMetrics(c.req.valid("param").id), 200));

  registerRoute(app,
    createRoute({ method: "post", path: "/v1/replays/{id}/tool-fixtures", request: { params: IdParamsSchema, body: jsonBody(CreateToolFixtureDoc) }, responses: { 201: jsonContent(ToolFixtureDoc, "Created fixture"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => {
      const replayId = c.req.valid("param").id;
      const body = CreateToolFixtureSchema.parse(c.req.valid("json"));
      if (body.replayId) ensureSame(body.replayId, replayId, "Path replay id and body replayId differ");
      const replayScope = body.metadata?.scope === "branch" ? undefined : replayId;
      return c.json(await c.var.store.createToolFixture({ ...body, replayId: replayScope }), 201);
    }
  );

  registerRoute(app, createRoute({ method: "post", path: "/v1/replays/{id}/resume", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ReplayDoc, "Replay") } }), async (c) => {
    const replay = await c.var.store.getReplay(c.req.valid("param").id);
    return replay ? c.json(await executeReplay(c.var.store, replay), 200) : notFound(c, "Replay");
  });
}
