import type { Command } from "commander";
import { CreateToolFixtureSchema, type JsonValue } from "@isplay/core";
import { createApiClient, requiredProjectId } from "../lib/api.js";
import { readJsonInput } from "../lib/files.js";
import { printJson } from "../lib/output.js";

export function registerFixtureCommands(program: Command): void {
  const fixtures = program.command("fixtures").description("Inspect and submit replay fixtures");

  fixtures
    .command("required")
    .description("List missing fixture requirements for a replay")
    .argument("<replayId>")
    .action(async (replayId: string) => {
      printJson(await createApiClient().getFixtureRequirements(replayId));
    });

  fixtures
    .command("add")
    .description("Submit an analyst fixture")
    .argument("<replayId>")
    .option("--project <projectId>", "Project id")
    .option("--branch <branchId>", "Branch-scoped fixture")
    .requiredOption("--tool <name>", "Tool name")
    .option("--file <jsonFile>", "Fixture output JSON file")
    .option("--output <jsonOrFile>", "Fixture output JSON or file")
    .option("--matcher <jsonOrFile>", "Fixture matcher JSON or file")
    .option("--args-hash <hash>", "Recorded args hash")
    .option("--provenance <provenance>", "Fixture provenance", "analyst_fixture")
    .action(addFixtureAction);
}

async function addFixtureAction(
  replayId: string,
  options: { project?: string; branch?: string; tool: string; file?: string; output?: string; matcher?: string; argsHash?: string; provenance: string }
): Promise<void> {
  const client = createApiClient();
  const projectId = requiredProjectId(options.project);
  const argsHash = options.argsHash ?? (await findOpenRequirement(client, replayId, options.tool));
  const outputInput = options.output ?? options.file;
  if (!outputInput) throw new Error("--output or --file is required");
  const output = (await readJsonInput(outputInput)) as JsonValue;
  const matcher = options.matcher ? ((await readJsonInput(options.matcher)) as JsonValue) : { argsHash };
  printJson(
    await client.addToolFixture(replayId, CreateToolFixtureSchema.parse({
      projectId,
      replayId,
      branchId: options.branch,
      toolName: options.tool,
      matcher,
      output,
      provenance: options.provenance,
      author: process.env.USER
    }))
  );
}

async function findOpenRequirement(client: ReturnType<typeof createApiClient>, replayId: string, tool: string): Promise<string> {
  const requirement = (await client.getFixtureRequirements(replayId)).find((item) => item.toolName === tool && item.status === "open");
  if (!requirement?.argsHash) throw new Error("--args-hash is required when no open matching fixture requirement exists");
  return requirement.argsHash;
}
