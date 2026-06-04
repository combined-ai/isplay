import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { createPersistedAnalysis } from "@isplay/application";
import { CreateAnalysisRunSchema } from "@isplay/core";
import { ErrorResponseSchema, jsonBody, jsonContent, notFound, registerRoute, type AppBindings } from "../http.js";
import { AnalysisRunDoc, CreateAnalysisRunDoc, EvidenceEdgeDoc, EvidenceNodeDoc, MetricDoc } from "../openapi-schemas.js";

const IdParamsSchema = z.object({ id: z.string() });
const AnalysisOutputSchema = z.object({
  analysisRun: AnalysisRunDoc,
  evidenceNodes: z.array(EvidenceNodeDoc),
  evidenceEdges: z.array(EvidenceEdgeDoc),
  scores: z.array(MetricDoc)
});

export function registerAnalysisRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(app,
    createRoute({
      method: "post",
      path: "/v1/analysis-runs",
      request: { body: jsonBody(CreateAnalysisRunDoc) },
      responses: { 201: jsonContent(AnalysisOutputSchema, "Analysis output"), 400: jsonContent(ErrorResponseSchema, "Invalid request") }
    }),
    async (c) => c.json(await createPersistedAnalysis(c.var.store, CreateAnalysisRunSchema.parse(c.req.valid("json"))), 201)
  );

  registerRoute(app,
    createRoute({
      method: "get",
      path: "/v1/analysis-runs/{id}",
      request: { params: IdParamsSchema },
      responses: { 200: jsonContent(AnalysisRunDoc, "Analysis run"), 404: jsonContent(ErrorResponseSchema, "Analysis run not found") }
    }),
    async (c) => {
      const analysis = await c.var.store.getAnalysisRun(c.req.valid("param").id);
      return analysis ? c.json(analysis, 200) : notFound(c, "Analysis run");
    }
  );
}
