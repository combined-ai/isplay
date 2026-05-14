import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { BranchSchema, CreateBranchSchema, CreateInterventionSchema, InterventionSchema } from "@isplay/core";
import { ErrorResponseSchema, ensureSame, jsonBody, jsonContent, notFound, registerRoute, type AppBindings } from "../http.js";
import { BranchDoc, CreateBranchDoc, CreateInterventionDoc, InterventionDoc } from "../openapi-schemas.js";

const IdParamsSchema = z.object({ id: z.string() });

export function registerBranchRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(app,
    createRoute({
      method: "post",
      path: "/v1/runs/{id}/branches",
      request: { params: IdParamsSchema, body: jsonBody(CreateBranchDoc) },
      responses: { 201: jsonContent(BranchDoc, "Created branch"), 400: jsonContent(ErrorResponseSchema, "Invalid request") }
    }),
    async (c) => {
      const body = CreateBranchSchema.parse(c.req.valid("json"));
      ensureSame(body.baseRunId, c.req.valid("param").id, "Path run id and body baseRunId differ");
      return c.json(await c.var.store.createBranch(body), 201);
    }
  );

  registerRoute(app,
    createRoute({ method: "get", path: "/v1/branches/{id}", request: { params: IdParamsSchema }, responses: { 200: jsonContent(BranchDoc, "Branch"), 404: jsonContent(ErrorResponseSchema, "Branch not found") } }),
    async (c) => {
      const branch = await c.var.store.getBranch(c.req.valid("param").id);
      return branch ? c.json(branch, 200) : notFound(c, "Branch");
    }
  );

  registerRoute(app,
    createRoute({
      method: "post",
      path: "/v1/branches/{id}/interventions",
      request: { params: IdParamsSchema, body: jsonBody(CreateInterventionDoc) },
      responses: { 201: jsonContent(InterventionDoc, "Created intervention"), 400: jsonContent(ErrorResponseSchema, "Invalid request") }
    }),
    async (c) => {
      const body = CreateInterventionSchema.parse(c.req.valid("json"));
      ensureSame(body.branchId, c.req.valid("param").id, "Path branch id and body branchId differ");
      return c.json(await c.var.store.createIntervention(body), 201);
    }
  );

  registerRoute(app,
    createRoute({
      method: "get",
      path: "/v1/branches/{id}/interventions",
      request: { params: IdParamsSchema },
      responses: { 200: jsonContent(z.array(InterventionDoc), "Branch interventions") }
    }),
    async (c) => c.json(await c.var.store.listInterventions(c.req.valid("param").id), 200)
  );
}
