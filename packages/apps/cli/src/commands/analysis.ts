import type { Command } from "commander";
import { CreateExperimentSchema, CreateHypothesisBatchSchema, RankEffectsInputSchema } from "@isplay/core";
import { createApiClient, requiredProjectId } from "../lib/api.js";
import { looksLikeJsonInput, readJsonInput } from "../lib/files.js";
import { printJson } from "../lib/output.js";

export function registerAnalysisCommands(program: Command): void {
  registerDiscover(program);
  registerExperiments(program);
  registerEffects(program);
  registerRequirements(program);
  registerAnalyze(program);
}

function registerDiscover(program: Command): void {
  const discover = program.command("discover").description("Discover project or run analysis surface");
  discover.command("run").argument("<runId>").action(discoverRunAction);
  discover.command("project").argument("<projectId>").action(async (projectId: string) => {
    printJson(await createApiClient().getProjectCatalog(projectId));
  });
}

function registerExperiments(program: Command): void {
  const experiments = program.command("experiments").alias("experiment").description("Create, run, and inspect experiments");
  experiments.command("create").argument("<jsonOrFile>").action(async (input: string) => {
    printJson(await createApiClient().createExperiment(CreateExperimentSchema.parse(await readJsonInput(input))));
  });
  experiments.command("get").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperiment(id));
  });
  experiments
    .command("run")
    .argument("<experimentIdOrJson>")
    .option("--no-wait", "Return after enqueueing work")
    .action(runExperimentAction);
  experiments.command("results").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperimentResults(id));
  });
  experiments.command("requirements").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperimentRequirements(id));
  });
  experiments.command("trial-matrix").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperimentTrialMatrix(id));
  });
  experiments.command("statistics").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperimentStatistics(id));
  });
  experiments.command("arm-comparison").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperimentArmComparison(id));
  });
  experiments.command("effects").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperimentEffects(id));
  });
}

function registerEffects(program: Command): void {
  const effects = program.command("effects").description("Rank and explain experiment effects");
  effects.command("list").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperimentEffects(id));
  });
  effects.command("replay").argument("<replayId>").action(async (id: string) => {
    printJson(await createApiClient().getReplayEffects(id));
  });
  effects.command("rank").argument("<jsonOrFile>").action(async (input: string) => {
    printJson(await createApiClient().rankEffects(RankEffectsInputSchema.parse(await readJsonInput(input))));
  });
  effects
    .command("explain")
    .argument("<effectId>")
    .requiredOption("--experiment <experimentId>", "Experiment id")
    .action(explainEffectAction);
}

function registerRequirements(program: Command): void {
  const requirements = program.command("requirements").description("List open experiment fixture tasks");
  requirements.command("list").argument("<experimentId>").action(async (id: string) => {
    printJson(await createApiClient().getExperimentRequirements(id));
  });
}

function registerAnalyze(program: Command): void {
  program
    .command("analyze")
    .description("Create an evidence-bounded analysis run")
    .argument("<runId>")
    .option("--project <projectId>", "Project id")
    .option("--replay <replayId>", "Replay id")
    .action(async (runId: string, options: { project?: string; replay?: string }) => {
      printJson(await createApiClient().createAnalysisRun({ projectId: requiredProjectId(options.project), baseRunId: runId, replayId: options.replay }));
    });
}

async function discoverRunAction(runId: string): Promise<void> {
  const client = createApiClient();
  const [catalog, inventory] = await Promise.all([client.getRunCatalog(runId), client.getRunContextInventory(runId)]);
  printJson({ catalog, contextSummary: inventory.summary, contextItems: inventory.items });
}

async function runExperimentAction(input: string, options: { wait: boolean }): Promise<void> {
  const client = createApiClient();
  if (looksLikeJsonInput(input)) {
    printJson(await client.createHypothesisBatch(CreateHypothesisBatchSchema.parse(await readJsonInput(input))));
    return;
  }
  printJson(await client.runExperiment(input, { wait: options.wait }));
}

async function explainEffectAction(effectId: string, options: { experiment: string }): Promise<void> {
  const effect = (await createApiClient().getExperimentEffects(options.experiment)).find((item) => item.id === effectId);
  if (!effect) throw new Error(`Effect not found: ${effectId}`);
  printJson(effect);
}
