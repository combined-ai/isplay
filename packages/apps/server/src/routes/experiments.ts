import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import {
  enqueueExperiment,
  getExperimentEffects,
  getExperimentRequirements,
  getExperimentResults,
  getExperimentStatistics,
  getExperimentTrialMatrix,
  runExperiment
} from "@isplay/application";
import { CreateExperimentSchema, CreateHypothesisBatchSchema, RunExperimentSchema } from "@isplay/core";
import { ErrorResponseSchema, jsonBody, jsonContent, notFound, registerRoute, type AppBindings } from "../http.js";
import { CreateExperimentDoc, EffectCandidateDoc, ExperimentDoc, ExperimentJobDoc, ExperimentPlanDoc, ExperimentResultsDoc, ExperimentStatisticsDoc, FixtureRequirementDoc, RunExperimentDoc, TrialMatrixDoc } from "../openapi-schemas.js";

const IdParamsSchema = z.object({ id: z.string() });
const PageQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(100),
  offset: z.coerce.number().int().nonnegative().default(0)
});
export function registerExperimentRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(
    app,
    createRoute({ method: "post", path: "/v1/experiments", request: { body: jsonBody(CreateExperimentDoc) }, responses: { 201: jsonContent(ExperimentPlanDoc, "Experiment"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => c.json(await c.var.store.createExperimentPlan(CreateExperimentSchema.parse(c.req.valid("json"))), 201)
  );
  registerRoute(
    app,
    createRoute({ method: "post", path: "/v1/hypothesis-batches", request: { body: jsonBody(CreateExperimentDoc) }, responses: { 201: jsonContent(ExperimentPlanDoc.extend({ results: ExperimentResultsDoc }), "Hypothesis batch result"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => {
      const plan = await c.var.store.createExperimentPlan({ ...CreateHypothesisBatchSchema.parse(c.req.valid("json")), status: "queued" });
      await runExperiment(c.var.store, plan.experiment.id);
      return c.json({ ...plan, results: await getExperimentResults(c.var.store, plan.experiment.id) }, 201);
    }
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/experiments/{id}", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ExperimentDoc, "Experiment"), 404: jsonContent(ErrorResponseSchema, "Experiment not found") } }),
    async (c) => {
      const experiment = await c.var.store.getExperiment(c.req.valid("param").id);
      return experiment ? c.json(experiment, 200) : notFound(c, "Experiment");
    }
  );
  registerRoute(
    app,
    createRoute({ method: "post", path: "/v1/experiments/{id}/run", request: { params: IdParamsSchema, body: jsonBody(RunExperimentDoc) }, responses: { 200: jsonContent(ExperimentResultsDoc, "Experiment results"), 202: jsonContent(ExperimentJobDoc, "Experiment job"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => {
      const input = RunExperimentSchema.parse(c.req.valid("json") ?? {});
      const experimentId = c.req.valid("param").id;
      if (input.wait === false) {
        const jobId = await enqueueExperiment(c.var.store, experimentId, { maxReplays: input.maxReplays });
        return c.json({ jobId, experimentId, status: "queued" }, 202);
      }
      await runExperiment(c.var.store, experimentId, { maxReplays: input.maxReplays });
      return c.json(await getExperimentResults(c.var.store, experimentId), 200);
    }
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/experiments/{id}/results", request: { params: IdParamsSchema, query: PageQuerySchema }, responses: { 200: jsonContent(ExperimentResultsDoc, "Experiment results") } }),
    async (c) => c.json(await getExperimentResults(c.var.store, c.req.valid("param").id, c.req.valid("query")), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/experiments/{id}/requirements", request: { params: IdParamsSchema, query: PageQuerySchema }, responses: { 200: jsonContent(z.array(FixtureRequirementDoc), "Experiment requirements") } }),
    async (c) => c.json(paginate(await getExperimentRequirements(c.var.store, c.req.valid("param").id), c.req.valid("query")), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/experiments/{id}/trial-matrix", request: { params: IdParamsSchema, query: PageQuerySchema }, responses: { 200: jsonContent(TrialMatrixDoc, "Trial matrix") } }),
    async (c) => c.json(await getExperimentTrialMatrix(c.var.store, c.req.valid("param").id, c.req.valid("query")), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/experiments/{id}/statistics", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ExperimentStatisticsDoc, "Experiment statistics") } }),
    async (c) => c.json(await getExperimentStatistics(c.var.store, c.req.valid("param").id), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/experiments/{id}/arm-comparison", request: { params: IdParamsSchema, query: PageQuerySchema }, responses: { 200: jsonContent(TrialMatrixDoc, "Arm comparison") } }),
    async (c) => c.json(await getExperimentTrialMatrix(c.var.store, c.req.valid("param").id, c.req.valid("query")), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/experiments/{id}/effects", request: { params: IdParamsSchema }, responses: { 200: jsonContent(z.array(EffectCandidateDoc), "Experiment effects"), 404: jsonContent(ErrorResponseSchema, "Experiment not found") } }),
    async (c) => c.json(await getExperimentEffects(c.var.store, c.req.valid("param").id), 200)
  );
}

function paginate<T>(items: T[], page: z.infer<typeof PageQuerySchema>): T[] {
  return items.slice(page.offset, page.offset + page.limit);
}
