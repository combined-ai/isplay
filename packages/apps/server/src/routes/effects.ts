import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { RankEffectsInputSchema } from "@isplay/core";
import { ErrorResponseSchema, jsonBody, jsonContent, registerRoute, type AppBindings } from "../http.js";
import { getExperimentEffects, getReplayEffects } from "../runners/experiments.js";

const IdParamsSchema = z.object({ id: z.string() });
const AnyDoc = z.any();

export function registerEffectRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/replays/{id}/effects", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(AnyDoc), "Replay effects"), 404: jsonContent(ErrorResponseSchema, "Replay not found") } }),
    async (c) => c.json(await getReplayEffects(c.var.store, c.req.valid("param").id), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/experiments/{id}/effects", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(AnyDoc), "Experiment effects"), 404: jsonContent(ErrorResponseSchema, "Experiment not found") } }),
    async (c) => c.json(await getExperimentEffects(c.var.store, c.req.valid("param").id), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "post", path: "/v1/effects:rank", request: { body: jsonBody(AnyDoc) }, responses: { 200: jsonContent(z.array(AnyDoc), "Ranked effects"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => {
      const input = RankEffectsInputSchema.parse(c.req.valid("json"));
      const effects = input.experimentId
        ? await getExperimentEffects(c.var.store, input.experimentId)
        : (await Promise.all((input.replayIds ?? []).map((id) => getReplayEffects(c.var.store, id)))).flat();
      return c.json(effects.slice(0, input.limit), 200);
    }
  );
}
