import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { getExperimentEffects, getReplayEffects } from "@isplay/application";
import { RankEffectsInputSchema } from "@isplay/core";
import { ErrorResponseSchema, jsonBody, jsonContent, registerRoute, type AppBindings } from "../http.js";
import { EffectCandidateDoc, RankEffectsInputDoc } from "../openapi-schemas.js";

export function registerEffectRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(
    app,
    createRoute({ method: "post", path: "/v1/effects:rank", request: { body: jsonBody(RankEffectsInputDoc) }, responses: { 200: jsonContent(z.array(EffectCandidateDoc), "Ranked effects"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => {
      const input = RankEffectsInputSchema.parse(c.req.valid("json"));
      const effects = input.experimentId
        ? await getExperimentEffects(c.var.store, input.experimentId)
        : (await Promise.all((input.replayIds ?? []).map((id) => getReplayEffects(c.var.store, id)))).flat();
      return c.json(effects.slice(0, input.limit), 200);
    }
  );
}
