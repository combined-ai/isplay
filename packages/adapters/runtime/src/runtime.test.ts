import { describe, expect, it } from "vitest";
import type { Run } from "@isplay/core";
import type { IsplaySdk } from "@isplay/sdk";
import { toJsonValue } from "./json/index.js";
import { RuntimeRunRegistry } from "./runs/registry.js";

describe("@isplay/adapter-runtime", () => {
  it("retire finished runtime runs before reusing a key", async () => {
    const created: Run[] = [];
    const patches: unknown[] = [];
    const client = {
      projectId: "project_1",
      api: {
        async createRun(input: unknown) {
          const run = {
            id: `run_${created.length + 1}`,
            createdAt: new Date().toISOString(),
            recordVersion: 1,
            projectId: "project_1",
            status: "running",
            startedAt: new Date().toISOString(),
            metadata: {}
          } satisfies Run;
          created.push(run);
          return run;
        },
        async patchRun(id: string, input: unknown) {
          patches.push({ id, input });
        }
      },
      withRunContext: async (_input: unknown, fn: () => unknown) => fn()
    } as unknown as IsplaySdk;
    const registry = new RuntimeRunRegistry(client);

    await registry.capture({ key: "session", framework: "test" }, () => undefined);
    await registry.finish("session", "ok");
    await registry.capture({ key: "session", framework: "test" }, () => undefined);

    expect(created.map((run) => run.id)).toEqual(["run_1", "run_2"]);
    expect(patches).toHaveLength(1);
  });

  it("serializes adapter inputs with core JSON semantics", () => {
    const input: { id: bigint; self?: unknown } = { id: 1n };
    input.self = input;

    const value = toJsonValue(input);

    expect(JSON.stringify(value)).toContain("[CIRCULAR]");
    expect(JSON.stringify(value)).toContain("1");
  });
});
