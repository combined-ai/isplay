import { describe, expect, it } from "vitest";
import type { IsplaySdk } from "@isplay/sdk";
import { wrapChatModel } from "./model.js";
import { wrapNode } from "./nodes.js";

describe("LangGraph adapter", () => {
  it("finishes stream model calls after the stream is consumed", async () => {
    const events: unknown[] = [];
    const client = fakeClient(events);
    const model = wrapChatModel(client, {
      async invoke() {
        return {};
      },
      async *stream() {
        yield { type: "text", text: "hi" };
        yield { toolCalls: [{ id: "call_1", name: "lookup", args: { id: 1 } }] };
      }
    });

    const chunks = [];
    const stream = await model.stream!({ prompt: "x" });
    for await (const chunk of stream) chunks.push(chunk);

    expect(chunks).toHaveLength(2);
    expect(events.map((event) => (event as { type: string }).type)).toEqual(["startModelCall", "recordToolProposal", "finishModelCall"]);
  });

  it("records node checkpoints and state annotations", async () => {
    const events: unknown[] = [];
    const node = wrapNode(fakeClient(events), "triage", async (state: { claim: string }) => ({ verdict: state.claim }));

    await expect(node({ claim: "C-1" })).resolves.toEqual({ verdict: "C-1" });
    expect(events.map((event) => (event as { type: string }).type)).toEqual([
      "checkpoint",
      "annotateContext",
      "recordEvent",
      "checkpoint"
    ]);
  });
});

function fakeClient(events: unknown[]): IsplaySdk {
  const client = {
    async startModelCall(input: unknown) {
      events.push({ type: "startModelCall", input });
      return { id: "model_1", projectId: "project_1", runId: "run_1" };
    },
    async finishModelCall(_modelCall: unknown, input: unknown) {
      events.push({ type: "finishModelCall", input });
    },
    async recordToolProposal(input: unknown) {
      events.push({ type: "recordToolProposal", input });
    },
    async recordEvent(type: string, data: unknown) {
      events.push({ type: "recordEvent", eventType: type, data });
    },
    async annotateContext(input: unknown) {
      events.push({ type: "annotateContext", input });
    },
    async checkpoint(name: string, state: unknown) {
      events.push({ type: "checkpoint", name, state });
    }
  };
  return client as unknown as IsplaySdk;
}
