import { describe, expect, it } from "vitest";
import type { IsplaySdk } from "@isplay/sdk";
import { createClaudeCodeAdapter } from "./create.js";
import { createClaudeCodeSettings } from "../settings/create.js";

describe("Claude Code adapter", () => {
  it("defers missing fixture tool calls before execution", async () => {
    const adapter = createClaudeCodeAdapter({
      client: fakeClient([]),
      fixtureGateway: { resolveToolCall: () => ({ action: "require_fixture", reason: "Need analyst fixture." }) }
    });

    const output = await adapter.handleHook({ hook_event_name: "PreToolUse", session_id: "s1", tool_name: "Bash", tool_use_id: "t1", tool_input: { command: "date" } });

    expect(output.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      permissionDecision: "defer",
      permissionDecisionReason: "Need analyst fixture."
    });
  });

  it("captures stream-json result messages", async () => {
    const events: unknown[] = [];
    const adapter = createClaudeCodeAdapter({ client: fakeClient(events) });

    await adapter.ingestStreamEvent({ type: "assistant", session_id: "s1", message: { content: "hello" } });
    await adapter.ingestStreamEvent({ type: "result", session_id: "s1", usage: { output_tokens: 4 } });

    expect(events.map((event) => (event as { type: string }).type)).toContain("finishModelCall");
  });

  it("generates Claude Code hook settings", () => {
    expect(createClaudeCodeSettings().hooks.PreToolUse[0]?.matcher).toBe(".*");
  });
});

function fakeClient(events: unknown[]): IsplaySdk {
  const client = {
    projectId: "project_1",
    api: { createRun: async () => ({ id: "run_1", projectId: "project_1", metadata: {} }), patchRun: async () => undefined },
    withRunContext: async (_input: unknown, fn: () => unknown) => fn(),
    startModelCall: async (input: unknown) => (events.push({ type: "startModelCall", input }), { id: "model_1", runId: "run_1", projectId: "project_1" }),
    finishModelCall: async (_call: unknown, input: unknown) => events.push({ type: "finishModelCall", input }),
    recordToolProposal: async (input: { toolCallId?: string }) => (events.push({ type: "recordToolProposal", input }), { id: "proposal_1", toolCallId: input.toolCallId ?? "t1" }),
    startToolExecution: async (input: { sideEffectClass?: string }) => (events.push({ type: "startToolExecution", input }), { id: "tool_1", sideEffectClass: input.sideEffectClass ?? "unknown" }),
    finishToolExecution: async (_execution: unknown, input: unknown) => events.push({ type: "finishToolExecution", input }),
    annotateContext: async (input: unknown) => events.push({ type: "annotateContext", input }),
    recordEvent: async (type: string, data: unknown) => events.push({ type: "recordEvent", eventType: type, data })
  };
  return client as unknown as IsplaySdk;
}
