import { describe, expect, it } from "vitest";
import type { ToolFixture } from "@isplay/core";
import type { IsplaySdk } from "@isplay/sdk";
import { createCodexAdapter } from "./create.js";
import { createCodexPluginFiles } from "../plugin/files.js";

describe("Codex adapter", () => {
  it("ingests JSONL turn and item events", async () => {
    const events: unknown[] = [];
    const adapter = createCodexAdapter({ client: fakeClient(events) });

    await adapter.ingestJsonEvent({ type: "turn.started", thread_id: "thr_1", turn_id: "turn_1" });
    await adapter.ingestJsonEvent({ type: "item.started", thread_id: "thr_1", item: { id: "item_1", type: "command_execution", command: "ls" } });
    await adapter.ingestJsonEvent({ type: "item.completed", thread_id: "thr_1", item: { id: "item_1", type: "command_execution", output: "ok" } });
    await adapter.ingestJsonEvent({ type: "turn.completed", thread_id: "thr_1", usage: { output_tokens: 3 } });

    expect(events.map((event) => (event as { type: string }).type)).toEqual(expect.arrayContaining(["startModelCall", "recordToolProposal", "finishToolExecution", "finishModelCall"]));
  });

  it("uses PostToolUse replacement for fixture-dependent built-in outputs", async () => {
    const adapter = createCodexAdapter({
      client: fakeClient([]),
      postToolReplacement: true,
      fixtureGateway: { resolveToolCall: () => ({ action: "inject", fixture: fixture(), output: { ok: true } }) }
    });

    await adapter.handleHook({ hook_event_name: "PreToolUse", session_id: "s1", tool_name: "Bash", tool_use_id: "t1", tool_input: { command: "date" } });
    const output = await adapter.handleHook({ hook_event_name: "PostToolUse", session_id: "s1", tool_name: "Bash", tool_use_id: "t1", tool_input: {}, tool_response: "real" });

    expect(output.continue).toBe(false);
    expect(output.hookSpecificOutput?.hookEventName).toBe("PostToolUse");
  });

  it("generates installable plugin descriptors", () => {
    expect(createCodexPluginFiles()["plugin.json"]).toMatchObject({ name: "isplay" });
  });
});

function fakeClient(events: unknown[]): IsplaySdk {
  const client = {
    projectId: "project_1",
    api: { createRun: async () => ({ id: "run_1", projectId: "project_1", metadata: {} }), patchRun: async () => undefined },
    withRunContext: async (_input: unknown, fn: () => unknown) => fn(),
    startModelCall: async (input: unknown) => (events.push({ type: "startModelCall", input }), { id: "model_1", runId: "run_1", projectId: "project_1" }),
    finishModelCall: async (_call: unknown, input: unknown) => events.push({ type: "finishModelCall", input }),
    recordToolProposal: async (input: { toolCallId?: string }) => (events.push({ type: "recordToolProposal", input }), { id: "proposal_1", toolCallId: input.toolCallId ?? "item_1" }),
    startToolExecution: async (input: { sideEffectClass?: string }) => (events.push({ type: "startToolExecution", input }), { id: "tool_1", sideEffectClass: input.sideEffectClass ?? "unknown" }),
    finishToolExecution: async (_execution: unknown, input: unknown) => events.push({ type: "finishToolExecution", input }),
    recordEvent: async (type: string, data: unknown) => events.push({ type: "recordEvent", eventType: type, data }),
    annotateContext: async (input: unknown) => events.push({ type: "annotateContext", input })
  };
  return client as unknown as IsplaySdk;
}

function fixture(): ToolFixture {
  return { id: "fixture_1", createdAt: new Date().toISOString(), projectId: "project_1", toolName: "Bash", matcher: {}, provenance: "analyst_fixture", metadata: {} };
}
