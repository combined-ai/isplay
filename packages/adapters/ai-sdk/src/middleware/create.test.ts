import { describe, expect, it } from "vitest";
import type { IsplaySdk } from "@isplay/sdk";
import { createIsplayMiddleware } from "./create.js";

describe("createIsplayMiddleware", () => {
  it("finishes stream model calls when consumers cancel early", async () => {
    const events: unknown[] = [];
    const middleware = createIsplayMiddleware({ client: fakeClient(events) });
    const stream = new ReadableStream<unknown>({
      start(controller) {
        controller.enqueue({ text: "first" });
        controller.enqueue({ text: "second" });
      }
    });

    const result = await middleware.wrapStream?.({
      doStream: async () => ({ stream, usage: { outputTokens: 2 } }),
      params: {},
      model: { provider: "openai", modelId: "gpt-test" }
    } as never) as { stream: ReadableStream<unknown> };
    const reader = result.stream.getReader();

    await reader.read();
    await reader.cancel("caller stopped reading");

    expect(events).toContainEqual(expect.objectContaining({ type: "finishModelCall", input: { error: expect.any(Error) } }));
  });

  it("bounds captured stream chunk snapshots while preserving chunk count", async () => {
    const events: unknown[] = [];
    const middleware = createIsplayMiddleware({ client: fakeClient(events) });
    const stream = new ReadableStream<unknown>({
      start(controller) {
        for (let index = 0; index < 105; index += 1) controller.enqueue({ index });
        controller.close();
      }
    });

    const result = await middleware.wrapStream?.({
      doStream: async () => ({ stream }),
      params: {},
      model: { provider: "openai", modelId: "gpt-test" }
    } as never) as { stream: ReadableStream<unknown> };

    for await (const _chunk of result.stream) {
      // Drain the stream to trigger terminal capture.
    }

    const finish = events.find((event) => (event as { type?: string }).type === "finishModelCall") as { input: { output: { chunks: unknown[]; chunkCount: number; truncatedChunkCount: number } } };
    expect(finish.input.output.chunks).toHaveLength(100);
    expect(finish.input.output.chunkCount).toBe(105);
    expect(finish.input.output.truncatedChunkCount).toBe(5);
  });
});

function fakeClient(events: unknown[]): IsplaySdk {
  return {
    async startModelCall(input: unknown) {
      events.push({ type: "startModelCall", input });
      return { id: "model_1", runId: "run_1", projectId: "project_1" };
    },
    async finishModelCall(modelCall: unknown, input: unknown) {
      events.push({ type: "finishModelCall", modelCall, input });
    },
    async recordToolProposal(input: unknown) {
      events.push({ type: "recordToolProposal", input });
    }
  } as unknown as IsplaySdk;
}
