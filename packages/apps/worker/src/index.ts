import { run, type Runner, type TaskList } from "graphile-worker";

export type StartWorkerOptions = {
  connectionString: string;
  concurrency?: number;
};

export const taskList: TaskList = {
  "replay.exact": async (payload, helpers) => {
    helpers.logger.info("Replay exact job accepted", { payload });
  },
  "experiment.run": async (payload, helpers) => {
    helpers.logger.info("Experiment job accepted", { payload });
  },
  "diff.compute": async (payload, helpers) => {
    helpers.logger.info("Diff job accepted", { payload });
  },
  "metrics.compute": async (payload, helpers) => {
    helpers.logger.info("Metrics job accepted", { payload });
  },
  "export.create": async (payload, helpers) => {
    helpers.logger.info("Export job accepted", { payload });
  }
};

export async function startWorker(options: StartWorkerOptions): Promise<Runner> {
  return run({
    connectionString: options.connectionString,
    concurrency: options.concurrency ?? 2,
    taskList
  });
}
