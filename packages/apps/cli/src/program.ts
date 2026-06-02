import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { registerAnalysisCommands } from "./commands/analysis.js";
import { registerBranchCommands } from "./commands/branch.js";
import { registerDataCommands } from "./commands/data.js";
import { registerFixtureCommands } from "./commands/fixtures.js";
import { registerProjectCommands } from "./commands/projects.js";
import { registerReplayCommands } from "./commands/replay.js";
import { registerRunCommands } from "./commands/runs.js";
import { registerServerCommands } from "./commands/server.js";
import { isCommanderExit, printCliError } from "./lib/errors.js";

export function createProgram(): Command {
  const program = new Command();
  program.name("isplay").description("Replay and analysis infrastructure for AI agents").version(readPackageVersion()).option("--json", "Emit JSON errors/diagnostics");

  registerServerCommands(program);
  registerProjectCommands(program);
  registerRunCommands(program);
  registerBranchCommands(program);
  registerDataCommands(program);
  registerReplayCommands(program);
  registerFixtureCommands(program);
  registerAnalysisCommands(program);

  return program;
}

function readPackageVersion(): string {
  const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "../package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
  return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
}

export async function runCli(argv: string[]): Promise<void> {
  const program = createProgram();
  program.exitOverride();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (isCommanderExit(error) && error.exitCode === 0) return;
    printCliError(error, Boolean(program.optsWithGlobals<{ json?: boolean }>().json));
    process.exitCode = isCommanderExit(error) ? error.exitCode : 1;
  }
}
