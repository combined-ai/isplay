import type { IsplaySdk } from "@isplay/sdk";
import { objectRecord, RuntimeRunRegistry } from "@isplay/adapter-runtime";
import type { ClaudeStreamEvent } from "../types.js";

export class ClaudeStreamIngestor {
  private readonly runs: RuntimeRunRegistry;
  private readonly modelCalls = new Map<string, Awaited<ReturnType<IsplaySdk["startModelCall"]>>>();

  constructor(private readonly client: IsplaySdk, private readonly keyOf: (event: ClaudeStreamEvent) => string) {
    this.runs = new RuntimeRunRegistry(client);
  }

  async ingestLine(line: string): Promise<void> {
    if (!line.trim()) return;
    await this.ingest(JSON.parse(line) as ClaudeStreamEvent);
  }

  async ingest(event: ClaudeStreamEvent): Promise<void> {
    await this.runs.capture({ key: this.keyOf(event), framework: "claude-code", metadata: { source: "stream-json" } }, async () => {
      if (event.type === "system" || event.type === "assistant") await this.ensureModel(event);
      if (event.type === "result") await this.finishModel(event);
      await this.client.recordEvent(`claude_code.stream.${event.type}`, event, `claude-code:stream:${event.type}`);
    });
  }

  private async ensureModel(event: ClaudeStreamEvent) {
    const key = this.keyOf(event);
    if (this.modelCalls.has(key)) return;
    const metadata = typeof event.session_id === "string" ? { sessionId: event.session_id } : undefined;
    const call = await this.client.startModelCall({ provider: "anthropic", operation: "stream", params: objectRecord(event.message), metadata });
    this.modelCalls.set(key, call);
  }

  private async finishModel(event: ClaudeStreamEvent) {
    const call = this.modelCalls.get(this.keyOf(event));
    if (call) await this.client.finishModelCall(call, { output: event, usage: event.usage });
  }
}
