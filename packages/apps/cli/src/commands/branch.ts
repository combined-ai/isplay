import type { Command } from "commander";
import type { JsonValue } from "@isplay/core";
import { createApiClient, requiredProjectId } from "../lib/api.js";
import { readJsonInput } from "../lib/files.js";
import { printJson } from "../lib/output.js";

export function registerBranchCommands(program: Command): void {
  const branch = program.command("branch").description("Create branches and interventions");

  branch.command("get").description("Get a branch").argument("<branchId>").action(async (branchId: string) => {
    printJson(await createApiClient().getBranch(branchId));
  });

  branch
    .command("create")
    .description("Create a branch from a checkpoint")
    .requiredOption("--from <runId>", "Base run id")
    .requiredOption("--checkpoint <checkpointId>", "Checkpoint id")
    .option("--project <projectId>", "Project id")
    .option("--name <name>", "Branch name")
    .action(createBranchAction);

  branch
    .command("intervene")
    .description("Attach a typed intervention to a branch")
    .argument("<branchId>")
    .option("--project <projectId>", "Project id")
    .requiredOption("--kind <kind>", "Intervention kind")
    .option("--target <id>", "Target context/checkpoint/tool reference")
    .option("--patch <jsonOrFile>", "JSON patch payload or file")
    .option("--description <text>", "Human-readable hypothesis text")
    .action(interveneAction);

  branch.command("interventions").description("List branch interventions").argument("<branchId>").action(async (branchId: string) => {
    printJson(await createApiClient().listInterventions(branchId));
  });
}

async function createBranchAction(options: {
  from: string;
  checkpoint: string;
  project?: string;
  name?: string;
}): Promise<void> {
  const projectId = requiredProjectId(options.project);
  printJson(await createApiClient().createBranch(options.from, { projectId, baseRunId: options.from, checkpointId: options.checkpoint, name: options.name }));
}

async function interveneAction(
  branchId: string,
  options: { project?: string; kind: string; target?: string; patch?: string; description?: string }
): Promise<void> {
  const projectId = requiredProjectId(options.project);
  const patch = options.patch === undefined ? undefined : (await readJsonInput(options.patch)) as JsonValue;
  printJson(
    await createApiClient().createIntervention(branchId, {
      projectId,
      branchId,
      kind: options.kind as never,
      targetId: options.target,
      patch,
      description: options.description
    })
  );
}
