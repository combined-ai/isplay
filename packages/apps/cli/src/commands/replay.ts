import type { Command } from "commander";
import { createApiClient, requiredProjectId } from "../lib/api.js";
import { printJson } from "../lib/output.js";

export function registerReplayCommands(program: Command): void {
  const replay = program.command("replay").description("Create or resume replay jobs");

  replay.command("get").description("Get a replay").argument("<replayId>").action(async (replayId: string) => {
    printJson(await createApiClient().getReplay(replayId));
  });

  replay.command("events").description("List replay events").argument("<replayId>").action(async (replayId: string) => {
    printJson(await createApiClient().getReplayEvents(replayId));
  });

  replay.command("diff").description("Show replay diff").argument("<replayId>").action(async (replayId: string) => {
    printJson(await createApiClient().getReplayDiff(replayId));
  });

  replay.command("metrics").description("Show replay metrics").argument("<replayId>").action(async (replayId: string) => {
    printJson(await createApiClient().getReplayMetrics(replayId));
  });

  replay.command("effects").description("Show replay effects").argument("<replayId>").action(async (replayId: string) => {
    printJson(await createApiClient().getReplayEffects(replayId));
  });

  replay.command("requirements").description("List replay fixture requirements").argument("<replayId>").action(async (replayId: string) => {
    printJson(await createApiClient().getFixtureRequirements(replayId));
  });

  replay
    .command("resume")
    .description("Resume a paused replay after fixtures are added")
    .argument("<replayId>")
    .action(async (replayId: string) => {
      printJson(await createApiClient().resumeReplay(replayId));
    });

  replay
    .argument("<runId>")
    .description("Replay a run")
    .option("--project <projectId>", "Project id")
    .option("--branch <branchId>", "Branch id")
    .option("--model-policy <policy>", "Model replay policy", "recorded-only")
    .option("--tool-policy <policy>", "Tool replay policy", "pause-for-fixture")
    .action(createReplayAction);

  program
    .command("diff")
    .description("Show structured replay diff")
    .argument("<replayId>")
    .action(async (replayId: string) => {
      printJson(await createApiClient().getReplayDiff(replayId));
    });
}

async function createReplayAction(
  runId: string,
  options: { project?: string; branch?: string; modelPolicy: string; toolPolicy: string }
): Promise<void> {
  const projectId = requiredProjectId(options.project);
  printJson(
    await createApiClient().createReplay({
      projectId,
      runId,
      branchId: options.branch,
      policy: {
        model: options.modelPolicy as never,
        tool: options.toolPolicy as never,
        drift: "continue_to_terminal",
        maxSteps: 100
      }
    })
  );
}
