import { AsyncLocalStorage } from "node:async_hooks";

export type RunContext = {
  runId: string;
  projectId: string;
  seq: number;
};

export const runStorage = new AsyncLocalStorage<RunContext>();

export function currentRunId(): string | undefined {
  return runStorage.getStore()?.runId;
}
