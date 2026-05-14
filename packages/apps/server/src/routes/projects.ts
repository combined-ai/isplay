import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { CreateProjectSchema, ProjectSchema } from "@isplay/core";
import { ErrorResponseSchema, jsonBody, jsonContent, notFound, registerRoute, type AppBindings } from "../http.js";
import { CreateProjectDoc, ProjectDoc } from "../openapi-schemas.js";

const ParamsSchema = z.object({ id: z.string() });

export function registerProjectRoutes(app: OpenAPIHono<AppBindings>): void {
  registerRoute(app,
    createRoute({
      method: "post",
      path: "/v1/projects",
      request: { body: jsonBody(CreateProjectDoc) },
      responses: { 201: jsonContent(ProjectDoc, "Created project"), 400: jsonContent(ErrorResponseSchema, "Invalid request") }
    }),
    async (c) => c.json(await c.var.store.createProject(CreateProjectSchema.parse(c.req.valid("json"))), 201)
  );

  registerRoute(app,
    createRoute({
      method: "get",
      path: "/v1/projects/{id}",
      request: { params: ParamsSchema },
      responses: { 200: jsonContent(ProjectDoc, "Project"), 404: jsonContent(ErrorResponseSchema, "Project not found") }
    }),
    async (c) => {
      const project = await c.var.store.getProject(c.req.valid("param").id);
      return project ? c.json(project, 200) : notFound(c, "Project");
    }
  );
}
