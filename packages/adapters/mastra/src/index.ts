import { memoryItem, promptClause, resolveClient, retrievalChunk, stateField, systemPrompt, wrapTool as wrapIsplayTool } from "@isplay/adapter-kit";
import type { IsplaySdk, IsplaySdkOptions } from "@isplay/sdk";
import type { JsonValue, SideEffectClass, ToolExecution } from "@isplay/core";

export type MastraIsplayOptions = {
  client?: IsplaySdk;
  projectId?: string;
  apiUrl?: string;
  sdk?: Omit<IsplaySdkOptions, "projectId" | "baseUrl">;
  serviceName?: string;
};

export function createMastraIsplayAdapter(options: MastraIsplayOptions = {}) {
  const client = resolveClient(options);
  return {
    annotations: {
      systemPrompt,
      promptClause,
      retrievalChunk,
      memoryItem,
      stateField
    },
    async recordWorkflowSnapshot(name: string, snapshot: unknown, metadata: Record<string, JsonValue> = {}) {
      return client.checkpoint(name, snapshot, {
        schemaName: "mastra.workflow.snapshot",
        schemaVersion: "1",
        metadata
      });
    },
    async recordToolStart(toolName: string, args: unknown, options: { sideEffectClass?: SideEffectClass } = {}) {
      return client.startToolExecution({ toolName, args, sideEffectClass: options.sideEffectClass ?? "unknown" });
    },
    async recordToolEnd(execution: ToolExecution, output: unknown) {
      return client.finishToolExecution(execution, { output });
    },
    async recordToolError(execution: ToolExecution, error: unknown) {
      return client.finishToolExecution(execution, { error });
    },
    async recordAgentEvent(type: string, data: unknown) {
      return client.recordEvent(`mastra.${type}`, data);
    },
    wrapTool<TArgs, TResult>(toolName: string, handler: (args: TArgs) => Promise<TResult> | TResult, options: { sideEffectClass?: SideEffectClass } = {}) {
      return wrapIsplayTool(client, { name: toolName, sideEffectClass: options.sideEffectClass ?? "unknown" }, handler);
    }
  };
}
