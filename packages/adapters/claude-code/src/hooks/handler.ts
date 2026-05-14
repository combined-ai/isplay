import type { IsplaySdk } from "@isplay/sdk";
import { allowAllFixtures, RuntimeRunRegistry, sideEffectFromToolName, toJsonValue } from "@isplay/adapter-runtime";
import type { RuntimeFixtureGateway } from "@isplay/adapter-runtime";
import type { ClaudeCodeHookInput, ClaudeHookOutput } from "../types.js";

export type ClaudeHookHandlerOptions = {
  client: IsplaySdk;
  keyOf: (input: ClaudeCodeHookInput) => string;
  fixtureGateway?: RuntimeFixtureGateway;
  replacementMode?: "defer" | "post_tool_context";
  additionalContext?: (event: ClaudeCodeHookInput) => Promise<string | undefined> | string | undefined;
};

export class ClaudeCodeHookHandler {
  private readonly runs: RuntimeRunRegistry;
  private readonly fixtures: RuntimeFixtureGateway;
  private readonly executions = new Map<string, Awaited<ReturnType<IsplaySdk["startToolExecution"]>>>();

  constructor(private readonly options: ClaudeHookHandlerOptions) {
    this.runs = new RuntimeRunRegistry(options.client);
    this.fixtures = options.fixtureGateway ?? allowAllFixtures;
  }

  async handle(input: ClaudeCodeHookInput): Promise<ClaudeHookOutput> {
    return this.runs.capture({ key: this.options.keyOf(input), framework: "claude-code", metadata: { source: "hook" } }, async () => {
      const event = input.hook_event_name;
      await this.options.client.recordEvent(`claude_code.hook.${event}`, input, `claude-code:hook:${event}`);
      if (event === "UserPromptSubmit") return this.onPrompt(input);
      if (event === "PreToolUse") return this.onPreTool(input);
      if (event === "PostToolUse") return this.onPostTool(input);
      if (event === "Stop") return this.onStop(input);
      return {};
    }) as Promise<ClaudeHookOutput>;
  }

  private async onPrompt(input: ClaudeCodeHookInput): Promise<ClaudeHookOutput> {
    if (input.prompt) await this.options.client.annotateContext({ kind: "user_message", path: "claude.prompt", value: input.prompt, provenance: "claude.UserPromptSubmit" });
    const additionalContext = await this.options.additionalContext?.(input);
    return additionalContext ? { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } } : {};
  }

  private async onPreTool(input: ClaudeCodeHookInput): Promise<ClaudeHookOutput> {
    const toolName = input.tool_name ?? "unknown";
    const proposal = await this.options.client.recordToolProposal({ toolCallId: input.tool_use_id, toolName, args: input.tool_input });
    const execution = await this.options.client.startToolExecution({ proposalId: proposal.id, toolCallId: proposal.toolCallId, toolName, args: input.tool_input, sideEffectClass: sideEffectFromToolName(toolName) });
    this.executions.set(proposal.toolCallId, execution);
    const decision = await this.fixtures.resolveToolCall({ runtime: "claude-code", runKey: this.options.keyOf(input), toolName, toolCallId: proposal.toolCallId, args: toJsonValue(input.tool_input), sideEffectClass: execution.sideEffectClass });
    if (decision.action === "block") return preToolDecision("deny", decision.reason);
    if (decision.action === "require_fixture") return preToolDecision("defer", decision.reason);
    if (decision.action === "inject" && this.options.replacementMode !== "post_tool_context") return preToolDecision("defer", "isplay fixture is ready; resume through an isplay-owned MCP/proxy tool to avoid side effects.");
    return {};
  }

  private async onPostTool(input: ClaudeCodeHookInput): Promise<ClaudeHookOutput> {
    const execution = input.tool_use_id ? this.executions.get(input.tool_use_id) : undefined;
    if (execution) await this.options.client.finishToolExecution(execution, { output: input.tool_response });
    const decision = await this.fixtures.resolveToolCall({ runtime: "claude-code", runKey: this.options.keyOf(input), toolName: input.tool_name ?? "unknown", toolCallId: input.tool_use_id, args: toJsonValue(input.tool_input), sideEffectClass: sideEffectFromToolName(input.tool_name ?? "") });
    if (decision.action === "inject" && this.options.replacementMode === "post_tool_context") {
      return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: JSON.stringify(decision.output) } };
    }
    return {};
  }

  private async onStop(input: ClaudeCodeHookInput): Promise<ClaudeHookOutput> {
    if (input.last_assistant_message) await this.options.client.annotateContext({ kind: "assistant_message", path: "claude.last_assistant_message", value: input.last_assistant_message, provenance: "claude.Stop" });
    return {};
  }
}

function preToolDecision(permissionDecision: "deny" | "defer", reason: string): ClaudeHookOutput {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision, permissionDecisionReason: reason } };
}
