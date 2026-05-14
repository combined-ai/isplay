import type { Command } from "commander";
import { createApiClient } from "../lib/api.js";
import { printJson } from "../lib/output.js";

export function registerRunCommands(program: Command): void {
  const runs = program.command("runs").description("List and inspect captured runs");

  runs
    .command("list")
    .description("List runs")
    .option("--project <projectId>", "Filter by project")
    .action(async (options: { project?: string }) => {
      printJson(await createApiClient().listRuns(options.project));
    });

  runs
    .command("inspect")
    .description("Inspect a run")
    .argument("<runId>")
    .action(async (runId: string) => {
      printJson(await createApiClient().getRun(runId));
    });

  runs.command("events").description("List run events").argument("<runId>").action(async (runId: string) => {
    printJson(await createApiClient().getEvents(runId));
  });

  runs.command("checkpoints").description("List run checkpoints").argument("<runId>").action(async (runId: string) => {
    printJson(await createApiClient().listCheckpoints(runId));
  });

  runs.command("catalog").description("Show run catalog").argument("<runId>").action(async (runId: string) => {
    printJson(await createApiClient().getRunCatalog(runId));
  });

  runs.command("context").description("Show run context inventory").argument("<runId>").action(async (runId: string) => {
    printJson(await createApiClient().getRunContextInventory(runId));
  });
}
