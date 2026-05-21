import type { JsonValue, ToolExecution } from "@isplay/core";
import type { IsplaySdk, IsplaySdkOptions } from "@isplay/sdk";

export type LangGraphAdapterOptions = {
  client?: IsplaySdk;
  projectId?: string;
  apiUrl?: string;
  sdk?: Omit<IsplaySdkOptions, "projectId" | "baseUrl">;
  framework?: string;
  checkpointState?: "before" | "after" | "both" | "none";
};

export type LangGraphNode<State, Update> = (state: State, config?: unknown) => Promise<Update> | Update;

export type LangGraphToolEvent = {
  event?: "on_tool_start" | "on_tool_event" | "on_tool_end" | "on_tool_error";
  name?: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  toolCallId?: string;
};

export type LangGraphStreamMode = "updates" | "values" | "messages" | "custom" | "tools" | "checkpoints" | "tasks" | "debug";

export type LangGraphToolOptions = {
  name: string;
  sideEffectClass?: ToolExecution["sideEffectClass"];
  schemaVersion?: string;
  implementationVersion?: string;
  metadata?: Record<string, JsonValue>;
};
