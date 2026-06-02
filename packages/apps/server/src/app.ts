import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "hono";
import { IsplayStore } from "@isplay/postgres";
import { createApiApp, type AppBindings } from "./http.js";
import { registerAnalysisRoutes } from "./routes/analysis.js";
import { registerBranchRoutes } from "./routes/branches.js";
import { registerContextRoutes } from "./routes/context.js";
import { registerEffectRoutes } from "./routes/effects.js";
import { registerExperimentRoutes } from "./routes/experiments.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerReplayRoutes } from "./routes/replays.js";
import { registerRunRoutes } from "./routes/runs.js";

export function createApp(store: IsplayStore) {
  const app = createApiApp();
  app.use("*", async (c, next) => {
    c.set("store", store);
    await next();
  });

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "isplay API",
      version: readPackageVersion()
    }
  });

  app.get("/health", (c) => c.json({ ok: true }));
  registerProjectRoutes(app);
  registerRunRoutes(app);
  registerBranchRoutes(app);
  registerReplayRoutes(app);
  registerContextRoutes(app);
  registerExperimentRoutes(app);
  registerEffectRoutes(app);
  registerAnalysisRoutes(app);

  app.get("/v1/jobs/:id/events", async (c) => {
    const id = c.req.param("id");
    const events = await store.listDurableJobEvents(id);
    if (!events.length && !(await store.getDurableJob(id))) return c.json({ error: "Job not found" }, 404);
    return streamSse(c, events.map((event) => ({ event: event.event, data: event })));
  });

  return app;
}

function readPackageVersion(): string {
  const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "../package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
  return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
}

function streamSse(c: Context, events: Array<{ event: string; data: unknown }>): Response {
  const body = events.map((event) => `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`).join("");
  return c.body(body, 200, { "content-type": "text/event-stream" });
}
