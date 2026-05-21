import { makeWorkerUtils } from "graphile-worker";
import type { IsplayStore } from "@isplay/postgres";

export async function enqueueReplay(store: IsplayStore, replayId: string): Promise<string> {
  const replay = await store.getReplay(replayId);
  if (!replay) throw new Error(`Replay not found: ${replayId}`);
  const job = await store.createDurableJob({ projectId: replay.projectId, kind: "replay.run", resourceId: replay.id, metadata: { replayId: replay.id } });
  const graphileJob = await addGraphileJob(store, "replay.run", { jobId: job.id, replayId: replay.id });
  await store.updateDurableJob(job.id, { graphileJobId: String(graphileJob.id) });
  await store.appendDurableJobEvent(job.id, "job.enqueued", { graphileJobId: String(graphileJob.id) });
  return job.id;
}

export async function enqueueExperiment(store: IsplayStore, experimentId: string): Promise<string> {
  const experiment = await store.getExperiment(experimentId);
  if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);
  const job = await store.createDurableJob({ projectId: experiment.projectId, kind: "experiment.run", resourceId: experiment.id, metadata: { experimentId: experiment.id } });
  const graphileJob = await addGraphileJob(store, "experiment.run", { jobId: job.id, experimentId: experiment.id });
  await store.updateDurableJob(job.id, { graphileJobId: String(graphileJob.id) });
  await store.appendDurableJobEvent(job.id, "job.enqueued", { graphileJobId: String(graphileJob.id) });
  return job.id;
}

async function addGraphileJob(store: IsplayStore, identifier: "replay.run" | "experiment.run", payload: Record<string, string>) {
  const utils = await makeWorkerUtils({ pgPool: store.pool });
  try {
    await utils.migrate();
    return await utils.addJob(identifier, payload, {
      jobKey: `${identifier}:${payload.jobId}`,
      jobKeyMode: "replace",
      maxAttempts: 3
    });
  } finally {
    await utils.release();
  }
}
