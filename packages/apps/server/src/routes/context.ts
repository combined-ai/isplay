import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { ContextSearchSchema } from "@isplay/core";
import { ErrorResponseSchema, jsonBody, jsonContent, registerRoute, type AppBindings } from "../http.js";

const IdParamsSchema = z.object({ id: z.string() });
const ContextInventoryDoc = z.any();
const CatalogDoc = z.any();

export function registerContextRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/runs/{id}/context-inventory", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ContextInventoryDoc, "Run context inventory"), 404: jsonContent(ErrorResponseSchema, "Run not found") } }),
    async (c) => c.json(await c.var.store.getRunContextInventory(c.req.valid("param").id), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/model-calls/{id}/context-inventory", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ContextInventoryDoc, "Model call context inventory"), 404: jsonContent(ErrorResponseSchema, "Model call not found") } }),
    async (c) => c.json(await c.var.store.getModelCallContextInventory(c.req.valid("param").id), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/checkpoints/{id}/context-inventory", request: { params: IdParamsSchema }, responses: { 200: jsonContent(ContextInventoryDoc, "Checkpoint context inventory"), 404: jsonContent(ErrorResponseSchema, "Checkpoint not found") } }),
    async (c) => c.json(await c.var.store.getCheckpointContextInventory(c.req.valid("param").id), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "post", path: "/v1/context/search", request: { body: jsonBody(z.any()) }, responses: { 200: jsonContent(z.array(z.any()), "Context search results"), 400: jsonContent(ErrorResponseSchema, "Invalid request") } }),
    async (c) => c.json(await c.var.store.searchContext(ContextSearchSchema.parse(c.req.valid("json"))), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/projects/{id}/catalog", request: { params: IdParamsSchema }, responses: { 200: jsonContent(CatalogDoc, "Project catalog") } }),
    async (c) => c.json(await c.var.store.getProjectCatalog(c.req.valid("param").id), 200)
  );
  registerRoute(
    app,
    createRoute({ method: "get", path: "/v1/runs/{id}/catalog", request: { params: IdParamsSchema }, responses: { 200: jsonContent(CatalogDoc, "Run catalog") } }),
    async (c) => c.json(await c.var.store.getRunCatalog(c.req.valid("param").id), 200)
  );
}
