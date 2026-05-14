import { memoryItem, promptClause, retrievalChunk, stateField, systemPrompt, wrapTool as wrapIsplayTool } from "@isplay/adapter-kit";
import { getClient } from "@isplay/sdk";
import type { JsonValue, SideEffectClass, ToolExecution } from "@isplay/core";

export type MastraIsplayOptions = {
  serviceName?: string;
};

export function createMastraIsplayAdapter(_options: MastraIsplayOptions = {}) {
  return {
    annotations: {
      systemPrompt,
      promptClause,
      retrievalChunk,
      memoryItem,
      stateField
    },
    async recordWorkflowSnapshot(name: string, snapshot: unknown, metadata: Record<string, JsonValue> = {}) {
      return getClient().checkpoint(name, snapshot, {
        schemaName: "mastra.workflow.snapshot",
        schemaVersion: "1",
        metadata
      });
    },
    async recordToolStart(toolName: string, args: unknown, options: { sideEffectClass?: SideEffectClass } = {}) {
      return getClient().startToolExecution({ toolName, args, sideEffectClass: options.sideEffectClass ?? "unknown" });
    },
    async recordToolEnd(execution: ToolExecution, output: unknown) {
      return getClient().finishToolExecution(execution, { output });
    },
    async recordToolError(execution: ToolExecution, error: unknown) {
      return getClient().finishToolExecution(execution, { error });
    },
    async recordAgentEvent(type: string, data: unknown) {
      return getClient().recordEvent(`mastra.${type}`, data);
    },
    wrapTool<TArgs, TResult>(toolName: string, handler: (args: TArgs) => Promise<TResult> | TResult, options: { sideEffectClass?: SideEffectClass } = {}) {
      return wrapIsplayTool(getClient(), { name: toolName, sideEffectClass: options.sideEffectClass ?? "unknown" }, handler);
    }
  };
}
