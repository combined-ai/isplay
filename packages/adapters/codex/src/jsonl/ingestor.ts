import type { IsplaySdk } from "@isplay/sdk";
import { firstString, objectRecord, RuntimeRunRegistry, sideEffectFromToolName } from "@isplay/adapter-runtime";
import type { CodexEvent } from "../types.js";

export class CodexJsonlIngestor {
  private readonly runs: RuntimeRunRegistry;
  private readonly modelCalls = new Map<string, Awaited<ReturnType<IsplaySdk["startModelCall"]>>>();
  private readonly executions = new Map<string, Awaited<ReturnType<IsplaySdk["startToolExecution"]>>>();

  constructor(private readonly client: IsplaySdk, private readonly keyOf: (event: CodexEvent) => string) {
    this.runs = new RuntimeRunRegistry(client);
  }

  async ingestLine(line: string): Promise<void> {
    if (!line.trim()) return;
    await this.ingest(JSON.parse(line) as CodexEvent);
  }

  async ingest(event: CodexEvent): Promise<void> {
    await this.runs.capture({ key: this.keyOf(event), framework: "codex", metadata: { source: "jsonl" } }, async () => {
      if (event.type === "turn.started") await this.onTurnStarted(event);
      if (event.type === "turn.completed" || event.type === "turn.failed") await this.onTurnFinished(event);
      if (event.type === "item.started") await this.onItemStarted(event);
      if (event.type === "item.completed") await this.onItemCompleted(event);
      await this.client.recordEvent(`codex.${event.type}`, event, `codex:${event.type}`);
    });
  }

  private async onTurnStarted(event: CodexEvent) {
    const metadata = typeof event.turn_id === "string" ? { codexTurnId: event.turn_id } : undefined;
    const call = await this.client.startModelCall({ provider: "openai", operation: "stream", params: event, metadata });
    this.modelCalls.set(this.keyOf(event), call);
  }

  private async onTurnFinished(event: CodexEvent) {
    const call = this.modelCalls.get(this.keyOf(event));
    if (call) await this.client.finishModelCall(call, { output: event, usage: event.usage, error: event.error });
  }

  private async onItemStarted(event: CodexEvent) {
    const item = objectRecord(event.item);
    const toolName = codexToolName(item);
    if (!toolName) return;
    const proposal = await this.client.recordToolProposal({ modelCallId: this.modelCalls.get(this.keyOf(event))?.id, toolCallId: firstString(item.id), toolName, args: item });
    const execution = await this.client.startToolExecution({ proposalId: proposal.id, toolCallId: proposal.toolCallId, toolName, args: item, sideEffectClass: sideEffectFromToolName(toolName) });
    this.executions.set(proposal.toolCallId, execution);
  }

  private async onItemCompleted(event: CodexEvent) {
    const item = objectRecord(event.item);
    const id = firstString(item.id);
    if (!id) return;
    const execution = this.executions.get(id);
    if (execution) await this.client.finishToolExecution(execution, { output: item, error: item.error });
  }
}

function codexToolName(item: Record<string, unknown>): string | undefined {
  const type = String(item.type ?? "");
  if (type === "command_execution") return "Bash";
  if (type === "file_change") return "apply_patch";
  if (type === "mcp_tool_call") return firstString(item.tool_name, item.name) ?? "mcp";
  if (type === "web_search") return "WebSearch";
  return undefined;
}
