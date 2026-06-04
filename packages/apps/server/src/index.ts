import { serve } from "@hono/node-server";
import { IsplayStore } from "@isplay/postgres";
import { createApp } from "./app.js";

export type StartServerOptions = {
  port?: number;
  connectionString?: string;
  artifactsDir?: string;
};

export async function startServer(options: StartServerOptions = {}): Promise<{ url: string; store: IsplayStore; stop: () => Promise<void> }> {
  const port = options.port ?? Number(process.env.PORT ?? 7373);
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to start isplay server.");
  }
  const store = new IsplayStore({
    connectionString,
    artifactsDir: options.artifactsDir ?? process.env.ISPLAY_ARTIFACTS_DIR ?? ".isplay/artifacts"
  });
  await store.migrate();
  const server = serve({
    fetch: createApp(store).fetch,
    port
  });
  return {
    url: `http://127.0.0.1:${port}`,
    store,
    stop: async () => {
      server.close();
      await store.close();
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
    .then(({ url }) => {
      console.log(`isplay API listening at ${url}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

export { createApp };
