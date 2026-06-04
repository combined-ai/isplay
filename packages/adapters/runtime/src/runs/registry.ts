import type { CreateRunInput, JsonValue, Run } from "@isplay/core";
import type { IsplaySdk } from "@isplay/sdk";

export type RuntimeRunInput = {
  key: string;
  framework: string;
  name?: string;
  metadata?: Record<string, JsonValue>;
};

export class RuntimeRunRegistry {
  private readonly runs = new Map<string, Run>();

  constructor(private readonly client: IsplaySdk) {}

  async ensure(input: RuntimeRunInput): Promise<Run> {
    const existing = this.runs.get(input.key);
    if (existing && !isTerminalStatus(existing.status)) return existing;
    if (existing) this.runs.delete(input.key);
    const createInput: CreateRunInput = {
      projectId: this.client.projectId,
      name: input.name ?? `${input.framework}:${input.key}`,
      metadata: { runtimeKey: input.key, framework: input.framework, ...(input.metadata ?? {}) }
    };
    const run = await this.client.api.createRun(createInput);
    this.runs.set(input.key, run);
    return run;
  }

  async capture<T>(input: RuntimeRunInput, fn: (run: Run) => Promise<T> | T): Promise<T> {
    const run = await this.ensure(input);
    return this.client.withRunContext({ runId: run.id, projectId: run.projectId }, () => fn(run));
  }

  async finish(key: string, status: "ok" | "error" | "cancelled", metadata: Record<string, JsonValue> = {}): Promise<void> {
    const run = this.runs.get(key);
    if (!run) return;
    try {
      await this.client.api.patchRun(run.id, { status, endedAt: new Date().toISOString(), metadata: { ...run.metadata, ...metadata } });
    } finally {
      this.runs.delete(key);
    }
  }
}

function isTerminalStatus(status: Run["status"]): boolean {
  return status === "ok" || status === "error" || status === "cancelled";
}
