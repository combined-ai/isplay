import { describe, expect, it } from "vitest";
import type { ToolFixture } from "@isplay/core";
import type { IsplaySdk } from "@isplay/sdk";
import { createOpenClawAdapter } from "./adapter.js";

describe("OpenClaw adapter", () => {
  it("captures model/tool hooks and can return native synthetic fixture decisions", async () => {
    const events: unknown[] = [];
    const adapter = createOpenClawAdapter({
      client: fakeClient(events),
      toolResultMode: "native_synthetic",
      fixtureGateway: {
        resolveToolCall() {
          return { action: "inject", fixture: fixture(), output: { answer: "fixture" } };
        }
      }
    });

    await adapter.handleHook("llm_input", {
      runId: "oc_run",
      provider: "openai",
      model: "gpt-test",
      systemPrompt: "Use policy.",
      messages: [{ role: "user", content: "hi" }],
      settings: { temperature: 0 }
    });
    await adapter.handleHook("llm_output", { runId: "oc_run", output: { text: "ok" }, usage: { outputTokens: 2 } });
    const decision = await adapter.handleHook("before_tool_call", { runId: "oc_run", toolName: "web_search", toolCallId: "call_1", params: { q: "x" } });

    expect(decision).toEqual({ result: { answer: "fixture" }, skipExecution: true, provenance: "isplay_fixture" });
    expect(events.map((event) => (event as { type: string }).type)).toContain("startModelCall");
    expect(events.map((event) => (event as { type: string }).type)).toContain("annotateContext");
    expect(events.map((event) => (event as { type: string }).type)).toContain("recordToolProposal");
    expect(events).toContainEqual(expect.objectContaining({ type: "finishToolExecution", input: { output: { fixtureId: "fixture_1", fixtureProvenance: "analyst_fixture", output: { answer: "fixture" } }, error: undefined } }));
  });

  it("records terminal event before finishing an OpenClaw run", async () => {
    const events: unknown[] = [];
    const adapter = createOpenClawAdapter({ client: fakeClient(events) });

    await adapter.handleHook("session_start", { runId: "oc_run" });
    await adapter.handleHook("session_end", { runId: "oc_run" });

    const recordIndex = events.findIndex((event) => (event as { type?: string; eventType?: string }).type === "recordEvent" && (event as { eventType?: string }).eventType === "openclaw.session_end");
    const patchIndex = events.findIndex((event) => (event as { type?: string }).type === "patchRun");
    expect(recordIndex).toBeGreaterThanOrEqual(0);
    expect(patchIndex).toBeGreaterThan(recordIndex);
  });
});

function fakeClient(events: unknown[]): IsplaySdk {
  const client = {
    projectId: "project_1",
    api: {
      async createRun(input: unknown) {
        events.push({ type: "createRun", input });
        return { id: "run_1", projectId: "project_1", metadata: {} };
      },
      async patchRun(id: string, input: unknown) {
        events.push({ type: "patchRun", id, input });
      }
    },
    async withRunContext(_input: unknown, fn: () => unknown) {
      return fn();
    },
    async startModelCall(input: unknown) {
      events.push({ type: "startModelCall", input });
      return { id: "model_1", runId: "run_1", projectId: "project_1" };
    },
    async finishModelCall(call: unknown, input: unknown) {
      events.push({ type: "finishModelCall", call, input });
    },
    async recordToolProposal(input: { toolCallId?: string }) {
      events.push({ type: "recordToolProposal", input });
      return { id: "proposal_1", toolCallId: input.toolCallId ?? "call_1" };
    },
    async startToolExecution(input: { sideEffectClass?: string }) {
      events.push({ type: "startToolExecution", input });
      return { id: "tool_1", sideEffectClass: input.sideEffectClass ?? "unknown" };
    },
    async finishToolExecution(execution: unknown, input: unknown) {
      events.push({ type: "finishToolExecution", execution, input });
    },
    async blockToolExecution(execution: unknown, reason: string, metadata: unknown) {
      events.push({ type: "blockToolExecution", execution, reason, metadata });
    },
    async annotateContext(input: unknown) {
      events.push({ type: "annotateContext", input });
    },
    async checkpoint(name: string, state: unknown) {
      events.push({ type: "checkpoint", name, state });
    },
    async recordEvent(type: string, data: unknown) {
      events.push({ type: "recordEvent", eventType: type, data });
    }
  };
  return client as unknown as IsplaySdk;
}

function fixture(): ToolFixture {
  return { id: "fixture_1", createdAt: new Date().toISOString(), projectId: "project_1", toolName: "web_search", matcher: {}, provenance: "analyst_fixture", metadata: {} };
}
