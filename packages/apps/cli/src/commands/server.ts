import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { startServer } from "@isplay/server";
import { startWorker } from "@isplay/worker";
import { dockerAvailable, ensurePostgresContainer } from "../lib/docker.js";
import { createApiClient } from "../lib/api.js";
import { printDoctor } from "../lib/output.js";

export function registerServerCommands(program: Command): void {
  program
    .command("start")
    .description("Start local Postgres, API, and embedded worker")
    .option("--port <port>", "API port", parsePort, 7373)
    .action(startAction);

  program.command("init").description("Create local isplay directories").action(initAction);
  program.command("doctor").description("Check local CLI/server prerequisites").action(doctorAction);
  program.command("health").description("Check API health").action(async () => {
    console.log(JSON.stringify(await createApiClient().health(), null, 2));
  });

  program.command("jobs").description("Inspect background jobs").command("events").argument("<jobId>").action(async (jobId: string) => {
    console.log(await createApiClient().getJobEvents(jobId));
  });
}

async function startAction(options: { port: number }): Promise<void> {
  const artifactsDir = path.join(process.cwd(), ".isplay", "artifacts");
  await mkdir(artifactsDir, { recursive: true });
  const connectionString = process.env.DATABASE_URL ?? (await ensurePostgresContainer());
  const { url } = await startServer({ port: options.port, connectionString, artifactsDir });
  await startWorker({ connectionString, artifactsDir });
  console.log(`isplay API listening at ${url}`);
  console.log("isplay worker running");
  console.log(`Postgres: ${connectionString.replace(/:\/\/.*:.*@/, "://***:***@")}`);
}

async function initAction(): Promise<void> {
  const dir = path.join(process.cwd(), ".isplay", "artifacts");
  await mkdir(dir, { recursive: true });
  console.log(`Initialized ${path.dirname(dir)}`);
}

async function doctorAction(_options: unknown, command: Command): Promise<void> {
  printDoctor(
    {
      node: process.version,
      cwd: process.cwd(),
      docker: (await dockerAvailable()) ? "available" : "missing",
      api: createApiClient().baseUrl
    },
    command
  );
}

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`Invalid port: ${value}`);
  return port;
}
