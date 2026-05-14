import type { IsplaySdk } from "@isplay/sdk";
import { allowAllFixtures, RuntimeRunRegistry, sideEffectFromToolName, toJsonValue } from "@isplay/adapter-runtime";
import type { RuntimeFixtureGateway } from "@isplay/adapter-runtime";
import type { CodexHookInput, CodexHookOutput } from "../types.js";

export type CodexHookHandlerOptions = {
  client: IsplaySdk;
  keyOf: (input: CodexHookInput) => string;
  fixtureGateway?: RuntimeFixtureGateway;
  postToolReplacement?: boolean;
  additionalContext?: (event: CodexHookInput) => Promise<string | undefined> | string | undefined;
};

export class CodexHookHandler {
  private readonly runs: RuntimeRunRegistry;
  private readonly fixtures: RuntimeFixtureGateway;
  private readonly executions = new Map<string, Awaited<ReturnType<IsplaySdk["startToolExecution"]>>>();

  constructor(private readonly options: CodexHookHandlerOptions) {
    this.runs = new RuntimeRunRegistry(options.client);
    this.fixtures = options.fixtureGateway ?? allowAllFixtures;
  }

  async handle(input: CodexHookInput): Promise<CodexHookOutput> {
    return this.runs.capture({ key: this.options.keyOf(input), framework: "codex", metadata: { source: "hook" } }, async () => {
      const event = input.hook_event_name;
      await this.options.client.recordEvent(`codex.hook.${event}`, input, `codex:hook:${event}`);
      if (event === "UserPromptSubmit") return this.onPrompt(input);
      if (event === "PreToolUse" || event === "PermissionRequest") return this.onPreTool(input, event);
      if (event === "PostToolUse") return this.onPostTool(input);
      if (event === "Stop") return this.onStop(input);
      return {};
    }) as Promise<CodexHookOutput>;
  }

  private async onPrompt(input: CodexHookInput): Promise<CodexHookOutput> {
    if (input.prompt) await this.options.client.annotateContext({ kind: "user_message", path: "codex.prompt", value: input.prompt, provenance: "codex.UserPromptSubmit" });
    const additionalContext = await this.options.additionalContext?.(input);
    return additionalContext ? { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } } : {};
  }

  private async onPreTool(input: CodexHookInput, hookEventName: string): Promise<CodexHookOutput> {
    const toolName = input.tool_name ?? "unknown";
    const proposal = hookEventName === "PreToolUse" ? await this.options.client.recordToolProposal({ toolCallId: input.tool_use_id, toolName, args: input.tool_input }) : undefined;
    const execution = await this.options.client.startToolExecution({ proposalId: proposal?.id, toolCallId: input.tool_use_id, toolName, args: input.tool_input, sideEffectClass: sideEffectFromToolName(toolName) });
    if (input.tool_use_id) this.executions.set(input.tool_use_id, execution);
    const decision = await this.fixtures.resolveToolCall({ runtime: "codex", runKey: this.options.keyOf(input), toolName, toolCallId: input.tool_use_id, args: toJsonValue(input.tool_input), sideEffectClass: execution.sideEffectClass });
    if (decision.action === "block" || decision.action === "require_fixture") return denyCodex(hookEventName, decision.reason);
    return decision.action === "inject" && !this.options.postToolReplacement ? denyCodex(hookEventName, "isplay fixture is available, but public Codex cannot inject it before built-in execution.") : {};
  }

  private async onPostTool(input: CodexHookInput): Promise<CodexHookOutput> {
    const execution = input.tool_use_id ? this.executions.get(input.tool_use_id) : undefined;
    if (execution) await this.options.client.finishToolExecution(execution, { output: input.tool_response });
    const toolName = input.tool_name ?? "unknown";
    const decision = await this.fixtures.resolveToolCall({ runtime: "codex", runKey: this.options.keyOf(input), toolName, toolCallId: input.tool_use_id, args: toJsonValue(input.tool_input), sideEffectClass: sideEffectFromToolName(toolName) });
    if (decision.action === "inject" && this.options.postToolReplacement) {
      return { decision: "block", continue: false, reason: JSON.stringify(decision.output), hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: JSON.stringify(decision.output) } };
    }
    return {};
  }

  private async onStop(input: CodexHookInput): Promise<CodexHookOutput> {
    if (input.last_assistant_message) await this.options.client.annotateContext({ kind: "assistant_message", path: "codex.last_assistant_message", value: input.last_assistant_message, provenance: "codex.Stop" });
    return {};
  }
}

function denyCodex(hookEventName: string, reason: string): CodexHookOutput {
  if (hookEventName === "PermissionRequest") return { hookSpecificOutput: { hookEventName, decision: { behavior: "deny", message: reason } } };
  return { decision: "block", reason };
}
