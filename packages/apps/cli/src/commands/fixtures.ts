import type { Command } from "commander";
import type { JsonValue } from "@isplay/core";
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
    .requiredOption("--tool <name>", "Tool name")
    .requiredOption("--file <jsonFile>", "Fixture output JSON file")
    .option("--args-hash <hash>", "Recorded args hash")
    .action(addFixtureAction);
}

async function addFixtureAction(
  replayId: string,
  options: { project?: string; tool: string; file: string; argsHash?: string }
): Promise<void> {
  const client = createApiClient();
  const projectId = requiredProjectId(options.project);
  const argsHash = options.argsHash ?? (await findOpenRequirement(client, replayId, options.tool));
  const output = (await readJsonInput(options.file)) as JsonValue;
  printJson(
    await client.addToolFixture(replayId, {
      projectId,
      replayId,
      toolName: options.tool,
      matcher: { argsHash },
      output,
      provenance: "analyst_fixture",
      author: process.env.USER
    })
  );
}

async function findOpenRequirement(client: ReturnType<typeof createApiClient>, replayId: string, tool: string): Promise<string> {
  const requirement = (await client.getFixtureRequirements(replayId)).find((item) => item.toolName === tool && item.status === "open");
  if (!requirement?.argsHash) throw new Error("--args-hash is required when no open matching fixture requirement exists");
  return requirement.argsHash;
}
