import { writeFile } from "node:fs/promises";
import path from "node:path";
import { IsplayApiClient } from "@isplay/api-client";
import { init, type IsplaySdk } from "@isplay/sdk";
import { createMastraIsplayAdapter } from "@isplay/adapter-mastra";
import { CLAIMS } from "./data.js";
import { claimsAgent, CLAIMS_AGENT_MODEL } from "./agent.js";

type ScenarioResult = { claimId: string; runId: string; text: string };

const api = new IsplayApiClient({ baseUrl: process.env.ISPLAY_API_URL });

export async function runLab(): Promise<void> {
  const projectId = await ensureProject();
  const client = init({ projectId, baseUrl: api.baseUrl, serviceName: "mastra-claims-demo", capturePolicy: { defaultAction: "capture", rules: [{ path: "customerEmail", action: "mask" }] } });
  const results: ScenarioResult[] = [];
  for (const claimId of Object.keys(CLAIMS)) results.push(await runScenario(client, claimId));
  const experiment = await runCounterfactual(projectId, results[1] ?? results[0]);
  console.log(JSON.stringify({ projectId, model: CLAIMS_AGENT_MODEL, runs: results, experiment }, null, 2));
}

async function ensureProject(): Promise<string> {
  if (process.env.ISPLAY_PROJECT_ID) return process.env.ISPLAY_PROJECT_ID;
  return (await api.createProject({ name: "Mastra Claims Analysis Lab", metadata: { example: "mastra-claims-agent" } })).id;
}

async function runScenario(client: IsplaySdk, claimId: string): Promise<ScenarioResult> {
  const claim = CLAIMS[claimId];
  const mastra = createMastraIsplayAdapter();
  let runId = "";
  const text = await client.withRun({ name: `claim-${claimId}`, metadata: { claimId, model: CLAIMS_AGENT_MODEL } }, async (run) => {
    runId = run.id;
    await client.checkpoint("claim.input", claim, { schemaName: "mastra.claim", schemaVersion: "1" });
    const modelCall = await client.startModelCall({ provider: "vercel-ai-gateway", model: CLAIMS_AGENT_MODEL, operation: "generate", params: { claimId, prompt: promptFor(claimId) }, settings: { maxSteps: 8, temperature: 0.2 } });
    const response = await claimsAgent.generate(promptFor(claimId), {
      maxSteps: 8,
      modelSettings: { temperature: 0.2, maxOutputTokens: 700 },
      onStepFinish: async (step) => {
        await mastra.recordAgentEvent("step.finished", summarizeStep(step));
        for (const rawCall of step.toolCalls ?? []) {
          const call = rawCall as { toolCallId?: string; toolName?: string; args?: unknown; toolNameWithNamespace?: string };
          await client.recordToolProposal({ toolCallId: call.toolCallId, toolName: call.toolName ?? call.toolNameWithNamespace ?? "unknown-tool", args: call.args });
        }
      }
    });
    await client.finishModelCall(modelCall, { output: { text: response.text, finishReason: response.finishReason }, usage: response.usage });
    await client.checkpoint("claim.final", { claimId, text: response.text }, { schemaName: "mastra.claim.final", schemaVersion: "1" });
    return response.text;
  });
  return { claimId, runId, text };
}

async function runCounterfactual(projectId: string, scenario: ScenarioResult) {
  const events = await api.getEvents(scenario.runId);
  const inventory = await api.getRunContextInventory(scenario.runId);
  const target = events.find((event) => event.type === "tool.started" && (event.data as { toolName?: string }).toolName === "risk-signals");
  if (!target) throw new Error("Could not find risk-signals event for counterfactual.");
  const targetContext = inventory.items.find((item) => item.kind === "tool_argument" && item.sourceEventId === target.refId);
  const batch = (await api.createHypothesisBatch({
    projectId,
    name: "claims-risk-counterfactuals",
    baseRunIds: [scenario.runId],
    checkpointSelector: { kind: "first" },
    hypotheses: [
      {
        statement: "Lowering disputed amount and removing duplicate-receipt risk should change downstream reasoning.",
        interventions: [
          {
            kind: "tool_args_patch",
            target: { refId: target.refId, toolName: "risk-signals" },
            expectedBaseHash: targetContext?.contentHash,
            patch: { toolName: "risk-signals", args: { claimId: scenario.claimId, claimedAmount: 900, merchant: "City Travel Desk", location: "Lisbon" } }
          }
        ],
        expectedEffect: { metric: "tool_argument_changed", direction: "increase" }
      }
    ],
    trialPlan: { repetitions: 2, concurrency: 1, maxReplays: 2, seedPolicy: "none", stopRule: "none" },
    policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 },
    validityGates: [{ kind: "minimum_trials", value: 2 }]
  })) as BatchResult;
  const requirement = batch.results.requirements.find((item) => item.status === "open");
  if (requirement?.argsHash) {
    await api.addToolFixture(requirement.replayId, { projectId, replayId: requirement.replayId, branchId: batch.arms[0]?.branchId, toolName: requirement.toolName, matcher: { argsHash: requirement.argsHash }, output: { riskScore: 0.18, flags: [], historicalOverlap: false, reviewedSignals: "analyst counterfactual" }, provenance: "analyst_fixture", author: "demo-script", metadata: { scope: "branch" } });
  }
  const results = (await api.runExperiment(batch.experiment.id, { wait: true })) as BatchResult["results"];
  await writeFile(path.join(process.cwd(), ".isplay", "mastra-claims-analysis.json"), JSON.stringify({ inventorySummary: inventory.summary, batch, results }, null, 2));
  return { experimentId: batch.experiment.id, status: results.experiment.status, effects: results.effects.map((effect) => ({ title: effect.title, score: effect.score, status: effect.status })), statistics: results.statistics };
}

type BatchResult = {
  experiment: { id: string; status: string };
  arms: Array<{ branchId?: string }>;
  results: {
    experiment: { id: string; status: string };
    requirements: Array<{ replayId: string; branchId?: string; toolName: string; argsHash?: string; status: string }>;
    effects: Array<{ title: string; score: number; status: string }>;
    statistics: unknown;
  };
};

function promptFor(claimId: string): string {
  return `Triage claim ${claimId}. Use the tools. Make a decision and explain which evidence was pivotal.`;
}

function summarizeStep(step: unknown) {
  const data = step as { text?: string; finishReason?: string; toolCalls?: unknown[]; toolResults?: unknown[]; usage?: unknown };
  return { text: data.text, finishReason: data.finishReason, toolCalls: data.toolCalls, toolResults: data.toolResults, usage: data.usage };
}
