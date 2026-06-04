import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { enqueueReplay, executeReplay, getReplayEffects } from "@isplay/application";
import { CreateReplaySchema, CreateToolFixtureSchema, EventSchema, FixtureRequirementSchema, ReplaySchema, ToolFixtureSchema } from "@isplay/core";
import { ErrorResponseSchema, ensureSame, jsonBody, jsonContent, notFound, registerRoute, type AppBindings } from "../http.js";
import { CreateReplayDoc, CreateToolFixtureDoc, DiffDoc, EffectCandidateDoc, EventDoc, FixtureRequirementDoc, MetricDoc, ReplayAttemptDoc, ReplayDoc, ToolFixtureDoc } from "../openapi-schemas.js";

const IdParamsSchema = z.object({ id: z.string() });
const PageQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(100),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export function registerReplayRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(app,
    createRoute({ method: "post", path: "/v1/replays", request: { body: jsonBody(CreateReplayDoc) }, responses: { 201: jsonContent(ReplayDoc, "Replay"), 202: jsonContent(ReplayDoc, "Paused replay"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => {
      const input = CreateReplaySchema.parse(c.req.valid("json"));
      const replay = await c.var.store.createReplay(input);
      if (input.wait === false) {
        const jobId = await enqueueReplay(c.var.store, replay.id);
        const queued = await c.var.store.updateReplay(ReplaySchema.parse({ ...replay, metadata: { ...replay.metadata, jobId } }));
        return c.json(queued, 202);
      }
      const executed = await executeReplay(c.var.store, replay);
      return c.json(executed, executed.status === "paused" ? 202 : 201);
    }
  );

  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ReplayDoc, "Replay"), 404: jsonContent(ErrorResponseSchema, "Replay not found") } }), async (c) => {
    const replay = await c.var.store.getReplay(c.req.valid("param").id);
    return replay ? c.json(replay, 200) : notFound(c, "Replay");
  });

  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/events", request: { params: IdParamsSchema, query: PageQuerySchema }, responses: { 200: jsonContent(z.array(EventDoc), "Replay events") } }), async (c) => {
    const replayId = c.req.valid("param").id;
    const page = c.req.valid("query");
    if (!(await c.var.store.getReplay(replayId))) return notFound(c, "Replay");
    const events = await c.var.store.listReplayEvents(replayId);
    return c.json(events.slice(page.offset, page.offset + page.limit), 200);
  });

  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/attempts", request: { params: IdParamsSchema, query: PageQuerySchema }, responses: { 200: jsonContent(z.array(ReplayAttemptDoc), "Replay attempts") } }), async (c) => c.json(await c.var.store.listReplayAttempts(c.req.valid("param").id, c.req.valid("query")), 200));

  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/fixture-requirements", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(FixtureRequirementDoc), "Fixture requirements") } }), async (c) => c.json(await c.var.store.listFixtureRequirements(c.req.valid("param").id), 200));
  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/diff", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(DiffDoc), "Replay diffs") } }), async (c) => c.json(await c.var.store.listDiffs(c.req.valid("param").id), 200));
  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/metrics", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(MetricDoc), "Replay metrics") } }), async (c) => c.json(await c.var.store.listMetrics(c.req.valid("param").id), 200));
  registerRoute(app, createRoute({ method: "get", path: "/v1/replays/{id}/effects", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(EffectCandidateDoc), "Replay effects"), 404: jsonContent(ErrorResponseSchema, "Replay not found") } }), async (c) => c.json(await getReplayEffects(c.var.store, c.req.valid("param").id), 200));

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
