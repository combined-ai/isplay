import type { Command } from "commander";
import type { JsonValue } from "@isplay/core";
import { createApiClient, requiredProjectId } from "../lib/api.js";
import { readJsonInput } from "../lib/files.js";
import { printJson } from "../lib/output.js";

export function registerDataCommands(program: Command): void {
  registerArtifacts(program);
  registerContext(program);
}

function registerArtifacts(program: Command): void {
  const artifacts = program.command("artifacts").description("Create and inspect artifacts");
  artifacts.command("get").argument("<artifactId>").action(async (artifactId: string) => {
    printJson(await createApiClient().getArtifact(artifactId));
  });
  artifacts
    .command("create")
    .requiredOption("--project <projectId>", "Project id")
    .requiredOption("--kind <kind>", "Artifact kind")
    .requiredOption("--file <jsonFile>", "JSON payload file")
    .option("--run <runId>", "Run id")
    .option("--mime-type <mimeType>", "MIME type")
    .option("--redaction-state <state>", "raw, redacted, or metadata_only")
    .action(createArtifactAction);
}

function registerContext(program: Command): void {
  const context = program.command("context").description("Read and search context inventory");
  context.command("run").argument("<runId>").action(async (runId: string) => {
    printJson(await createApiClient().getRunContextInventory(runId));
  });
  context.command("model-call").argument("<modelCallId>").action(async (id: string) => {
    printJson(await createApiClient().getModelCallContextInventory(id));
  });
  context.command("checkpoint").argument("<checkpointId>").action(async (id: string) => {
    printJson(await createApiClient().getCheckpointContextInventory(id));
  });
  context.command("search").argument("<jsonOrFile>").action(async (input: string) => {
    printJson(await createApiClient().searchContext((await readJsonInput(input)) as never));
  });
}

async function createArtifactAction(options: {
  project: string;
  kind: string;
  file: string;
  run?: string;
  mimeType?: string;
  redactionState?: "raw" | "redacted" | "metadata_only";
}): Promise<void> {
  const payload = (await readJsonInput(options.file)) as JsonValue;
  printJson(
    await createApiClient().createArtifact({
      projectId: requiredProjectId(options.project),
      runId: options.run,
      kind: options.kind,
      payload,
      mimeType: options.mimeType,
      redactionState: options.redactionState
    })
  );
}
