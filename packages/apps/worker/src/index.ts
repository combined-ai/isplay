import { run, type Runner, type TaskList } from "graphile-worker";
import { IsplayStore } from "@isplay/postgres";
import { executeReplay, runExperiment } from "@isplay/server";

export type StartWorkerOptions = {
  connectionString: string;
  artifactsDir?: string;
  concurrency?: number;
};

export function createTaskList(options: StartWorkerOptions): TaskList {
  return {
    "replay.run": async (payload, helpers) => {
      const { jobId, replayId } = replayPayload(payload);
      await withStore(options, async (store) => {
        await store.updateDurableJob(jobId, { status: "running" });
        await store.appendDurableJobEvent(jobId, "job.started", { replayId });
        try {
          const replay = await store.getReplay(replayId);
          if (!replay) throw new Error(`Replay not found: ${replayId}`);
          const result = await executeReplay(store, replay);
          const status = result.status === "error" ? "error" : "ok";
          await store.updateDurableJob(jobId, { status, error: result.error });
          await store.appendDurableJobEvent(jobId, status === "ok" ? "job.finished" : "job.failed", { replayId: result.id, replayStatus: result.status });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await store.updateDurableJob(jobId, { status: "error", error: message });
          await store.appendDurableJobEvent(jobId, "job.failed", { replayId, error: message }, { retryable: false });
        }
      });
      helpers.logger.info("Replay job finished", { jobId, replayId });
    },

    "experiment.run": async (payload, helpers) => {
      const { jobId, experimentId } = experimentPayload(payload);
      await withStore(options, async (store) => {
        await store.updateDurableJob(jobId, { status: "running" });
        await store.appendDurableJobEvent(jobId, "job.started", { experimentId });
        try {
          const result = await runExperiment(store, experimentId);
          const status = result.status === "invalid" ? "error" : "ok";
          await store.updateDurableJob(jobId, { status, error: status === "error" ? "Experiment completed invalid" : undefined });
          await store.appendDurableJobEvent(jobId, status === "ok" ? "job.finished" : "job.failed", { experimentId, experimentStatus: result.status });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await store.updateDurableJob(jobId, { status: "error", error: message });
          await store.appendDurableJobEvent(jobId, "job.failed", { experimentId, error: message }, { retryable: false });
        }
      });
      helpers.logger.info("Experiment job finished", { jobId, experimentId });
    }
  };
}

export const taskList: TaskList = createTaskList({
  connectionString: process.env.DATABASE_URL ?? "",
  artifactsDir: process.env.ISPLAY_ARTIFACTS_DIR
});

async function withStore<T>(options: StartWorkerOptions, fn: (store: IsplayStore) => Promise<T>): Promise<T> {
  const store = new IsplayStore({
    connectionString: options.connectionString,
    artifactsDir: options.artifactsDir ?? process.env.ISPLAY_ARTIFACTS_DIR ?? ".isplay/artifacts"
  });
  await store.migrate();
  try {
    return await fn(store);
  } finally {
    await store.close();
  }
}

function replayPayload(payload: unknown): { jobId: string; replayId: string } {
  const record = objectPayload(payload);
  return { jobId: stringPayload(record, "jobId"), replayId: stringPayload(record, "replayId") };
}

function experimentPayload(payload: unknown): { jobId: string; experimentId: string } {
  const record = objectPayload(payload);
  return { jobId: stringPayload(record, "jobId"), experimentId: stringPayload(record, "experimentId") };
}

function objectPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Expected object job payload.");
  return payload as Record<string, unknown>;
}

function stringPayload(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string") throw new Error(`Expected ${key} in job payload.`);
  return value;
};

export async function startWorker(options: StartWorkerOptions): Promise<Runner> {
  return run({
    connectionString: options.connectionString,
    concurrency: options.concurrency ?? 2,
    taskList: createTaskList(options)
  });
}
