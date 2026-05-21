import { execFile, spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "packages/apps/cli/dist/index.js");

const steps = [];
let tempDir;
let pg;
let server;
let worker;

try {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "isplay-e2e-"));
  const artifactsDir = path.join(tempDir, "artifacts");
  await mkdir(artifactsDir, { recursive: true });

  const connectionString = process.env.ISPLAY_E2E_DATABASE_URL ?? (await startDisposablePostgres(tempDir));
  const apiPort = await freePort();
  const baseUrl = `http://127.0.0.1:${apiPort}`;

  const [{ startServer }, { startWorker }, { IsplaySdk }] = await Promise.all([
    import("../packages/apps/server/dist/index.js"),
    import("../packages/apps/worker/dist/index.js"),
    import("../packages/sdk/dist/index.js")
  ]);

  server = await startServer({ port: apiPort, connectionString, artifactsDir });
  worker = await startWorker({ connectionString, artifactsDir, concurrency: 1 });
  await waitFor(async () => {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) throw new Error(`health returned ${response.status}`);
  }, "API health");
  step("local API and worker start");

  const cliVersion = (await cli(["--version"], { ISPLAY_API_URL: baseUrl })).stdout.trim();
  assert(cliVersion === "0.3.0", `CLI version should be 0.3.0, got ${cliVersion}`);
  step("CLI version is current");

  const invalid = await cli(["--json", "experiments", "create", JSON.stringify({ projectId: "project_bad" })], { ISPLAY_API_URL: baseUrl }, { allowFailure: true });
  assert(invalid.status !== 0, "invalid CLI input should fail locally");
  const invalidError = JSON.parse(invalid.stderr);
  assert(invalidError.code === "validation_error", "invalid CLI input should return validation_error");
  assert(Array.isArray(invalidError.details) && invalidError.details.some((issue) => issue.path), "CLI validation error should include field paths");
  step("CLI validates JSON locally with field-level errors");

  const project = JSON.parse((await cli(["projects", "create", "--name", "isplay e2e"], { ISPLAY_API_URL: baseUrl })).stdout);
  assert(project.id.startsWith("project_"), "project id should use durable prefix");
  step("CLI project creation works");

  const client = new IsplaySdk({
    projectId: project.id,
    baseUrl,
    serviceName: "isplay-e2e",
    capturePolicy: { defaultAction: "capture", rules: [{ path: "secret", action: "mask" }] }
  });

  assert((await client.tryRecordEvent("e2e.noop", {})) === undefined, "tryRecordEvent should no-op outside run context");
  await assertRejects(() => client.recordEvent("e2e.bad", {}), /recordEvent\(\) must be called inside/);
  step("SDK capture context behavior is explicit");

  const captured = {};
  await client.withRun({ name: "e2e captured run" }, async (run) => {
    captured.runId = run.id;
    const checkpoint = await client.checkpoint("before-lookup", { customerId: "cust_123", secret: "do-not-store" }, { schemaName: "e2e.state", schemaVersion: "1" });
    captured.checkpointId = checkpoint.id;

    const model = await client.startModelCall({
      provider: "fixture",
      model: "e2e-model",
      operation: "generate",
      params: { messages: [{ role: "user", content: "Lookup cust_123" }], tools: [{ name: "lookupCustomer" }] }
    });
    await client.finishModelCall(model, { output: { text: "Calling lookupCustomer" }, usage: { inputTokens: 5, outputTokens: 3 } });

    const proposal = await client.recordToolProposal({ modelCallId: model.id, toolName: "lookupCustomer", args: { customerId: "cust_123" } });
    const tool = await client.startToolExecution({
      proposalId: proposal.id,
      toolCallId: proposal.toolCallId,
      toolName: "lookupCustomer",
      args: { customerId: "cust_123" },
      sideEffectClass: "read"
    });
    captured.toolArgsHash = tool.argsHash;
    await client.finishToolExecution(tool, { output: { tier: "gold", balance: 42 } });
    await client.annotateContext({ kind: "state_field", path: "account.tier", value: "gold", visibility: "state_only" });
  });

  const run = await client.getRun(captured.runId);
  assert(run.status === "ok" && run.endedAt, "captured run should finish ok");
  const events = await client.getEvents(run.id);
  assert(events.length >= 8, `captured run should have useful evidence, got ${events.length} events`);
  assert(events.every((event, index) => event.seq === index), "events should be contiguous");
  assert(JSON.stringify(await client.getArtifact((await client.listCheckpoints(run.id))[0].stateArtifactId)).includes("[REDACTED]"), "capture policy should redact secret state");
  step("SDK captures run, model/tool evidence, checkpoints, artifacts, and redaction");

  const branch = await client.createBranch(run.id, {
    baseRunId: run.id,
    checkpointId: captured.checkpointId,
    name: "upgrade fixture branch",
    replayPolicy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }
  });
  await client.createIntervention(branch.id, {
    branchId: branch.id,
    kind: "tool_args_patch",
    target: { eventType: "tool.finished", toolName: "lookupCustomer" },
    operations: [{ op: "add", path: "/metadata/e2eIntervention", value: true }],
    description: "Force a controlled divergence after the checkpoint."
  });
  step("structured branch intervention targets post-checkpoint tool result");

  const pausedReplay = await client.createReplay({
    baseRunId: run.id,
    branchId: branch.id,
    wait: true,
    policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }
  });
  assert(pausedReplay.status === "paused", `first divergent replay should pause, got ${pausedReplay.status}`);
  const requirements = await client.getFixtureRequirements(pausedReplay.id);
  assert(requirements.length === 1 && requirements[0].toolName === "lookupCustomer", "paused replay should expose one fixture requirement");

  await client.addToolFixture(pausedReplay.id, {
    branchId: branch.id,
    toolName: "lookupCustomer",
    matcher: { argsHash: requirements[0].argsHash },
    output: { tier: "platinum", balance: 84 },
    provenance: "analyst_fixture",
    sideEffectClass: "read",
    metadata: { scope: "branch" }
  });
  const resumedReplay = await client.resumeReplay(pausedReplay.id);
  assert(resumedReplay.status === "ok", `resume after branch fixture should finish ok, got ${resumedReplay.status}`);
  const replayEvents = await client.getReplayEvents(resumedReplay.id);
  assert(replayEvents.some((event) => event.metadata.fixtureSubstitution === true), "replay events should include substituted fixture output");
  assert((await client.getReplayAttempts(resumedReplay.id)).length === 2, "paused then resumed replay should keep append-only attempts");
  step("replay pauses for fixture, resumes, substitutes fixture, and keeps attempt history");

  const queuedReplay = await client.createReplay({
    baseRunId: run.id,
    branchId: branch.id,
    wait: false,
    policy: { model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }
  });
  const replayJobId = stringField(queuedReplay.metadata, "jobId");
  await waitForJob(client, replayJobId);
  const completedReplay = await client.getReplay(queuedReplay.id);
  assert(completedReplay.status === "ok", `queued replay should finish ok, got ${completedReplay.status}`);
  step("wait=false replay runs through durable worker job");

  const plan = await client.createExperiment({
    name: "e2e experiment",
    baseRunIds: [run.id],
    checkpointSelector: { kind: "latest" },
    trialPlan: { repetitions: 1, concurrency: 1, maxReplays: 5, seedPolicy: "none", stopRule: "none" },
    policy: { model: "recorded-only", tool: "recorded-only", drift: "continue_to_terminal", maxSteps: 100 },
    validityGates: [],
    hypotheses: [{ statement: "No-op branch reproduces captured behavior", interventions: [] }]
  });
  const experimentJob = await client.runExperiment(plan.experiment.id, { wait: false });
  assert("jobId" in experimentJob, "wait=false experiment should return a job id");
  await waitForJob(client, experimentJob.jobId);
  const results = await client.getExperimentResults(plan.experiment.id);
  assert(results.experiment.status === "completed", `experiment should complete, got ${results.experiment.status}`);
  assert(results.replays.length === 1 && results.replays[0].status === "ok", "experiment should produce one ok replay");
  step("wait=false experiment job completes and results are readable");

  const contextItems = await client.searchContext({ projectId: project.id, query: "lookupCustomer", limit: 5, offset: 0 });
  assert(contextItems.length > 0, "context search should find captured tool evidence");
  const pagedRuns = await client.listRuns(project.id, { limit: 1, offset: 0 });
  assert(pagedRuns.length === 1, "paginated run list should honor limit");
  const analysis = await client.createAnalysisRun({ baseRunId: run.id, replayId: resumedReplay.id });
  assert(analysis.analysisRun.id.startsWith("analysis_"), "analysis run should persist");
  step("context search, pagination, and analysis output work");

  console.log(JSON.stringify({ ok: true, steps, projectId: project.id, runId: run.id, replayId: resumedReplay.id, experimentId: plan.experiment.id }, null, 2));
} finally {
  if (worker) await worker.stop().catch(() => undefined);
  if (server) await server.stop().catch(() => undefined);
  if (pg) await stopDisposablePostgres(pg).catch(() => undefined);
  if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
}

function step(name) {
  steps.push(name);
  console.error(`ok - ${name}`);
}

async function startDisposablePostgres(dir) {
  const dataDir = path.join(dir, "pgdata");
  const logFile = path.join(dir, "postgres.log");
  const port = await freePort();
  await execFileAsync("initdb", ["-D", dataDir, "--auth=trust", "--no-locale", "-E", "UTF8"], { cwd: root });
  await execFileAsync("pg_ctl", ["-D", dataDir, "-w", "-t", "30", "-l", logFile, "-o", `-p ${port} -h 127.0.0.1`, "start"], { cwd: root });
  pg = { dataDir };
  return `postgres://${encodeURIComponent(os.userInfo().username)}@127.0.0.1:${port}/postgres`;
}

async function stopDisposablePostgres(instance) {
  await execFileAsync("pg_ctl", ["-D", instance.dataDir, "-m", "fast", "-w", "stop"], { cwd: root });
}

async function cli(args, env = {}, options = {}) {
  const childEnv = { ...process.env, ...env, NODE_NO_WARNINGS: "1" };
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], { cwd: root, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("exit", (status) => {
      const result = { status: status ?? 0, stdout, stderr };
      if (result.status !== 0 && !options.allowFailure) {
        reject(new Error(`CLI failed: isplay ${args.join(" ")}\nstdout:\n${stdout}\nstderr:\n${stderr}`));
      } else {
        resolve(result);
      }
    });
  });
}

async function waitForJob(client, jobId) {
  await waitFor(async () => {
    const events = await client.getJobEvents(jobId);
    if (events.includes("job.failed")) throw fatalError(`job ${jobId} failed:\n${events}`);
    if (!events.includes("job.finished")) throw new Error(`job ${jobId} not finished yet`);
  }, `job ${jobId}`);
}

async function waitFor(fn, label, timeoutMs = 20_000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      await fn();
      return;
    } catch (error) {
      if (isFatalError(error)) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Timed out waiting for ${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fatalError(message) {
  const error = new Error(message);
  error.fatal = true;
  return error;
}

function isFatalError(error) {
  return Boolean(error && typeof error === "object" && error.fatal === true);
}

async function assertRejects(fn, pattern) {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!pattern.test(message)) throw new Error(`Expected rejection to match ${pattern}, got ${message}`);
    return;
  }
  throw new Error("Expected function to reject");
}

function stringField(record, key) {
  const value = record?.[key];
  if (typeof value !== "string") throw new Error(`Expected ${key} to be a string`);
  return value;
}
