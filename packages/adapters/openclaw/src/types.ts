import type { JsonValue } from "@isplay/core";
import type { IsplaySdk } from "@isplay/sdk";
import type { RuntimeFixtureGateway } from "@isplay/adapter-runtime";

export type OpenClawHookName =
  | "session_start"
  | "session_end"
  | "before_model_resolve"
  | "before_prompt_build"
  | "before_agent_run"
  | "llm_input"
  | "llm_output"
  | "before_tool_call"
  | "after_tool_call"
  | "tool_result_persist"
  | "before_compaction"
  | "after_compaction"
  | "agent_end";

export type OpenClawPluginApi = {
  on(name: OpenClawHookName | string, handler: (event: OpenClawHookEvent) => Promise<unknown> | unknown, opts?: { priority?: number; timeoutMs?: number }): void;
  registerContextEngine?: (id: string, factory: () => unknown) => void;
};

export type OpenClawHookEvent = {
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  jobId?: string;
  provider?: string;
  model?: string;
  settings?: unknown;
  messages?: unknown[];
  systemPrompt?: string;
  prompt?: unknown;
  input?: unknown;
  output?: unknown;
  usage?: unknown;
  toolName?: string;
  toolCallId?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
  durationMs?: number;
  context?: { pluginConfig?: Record<string, JsonValue> };
  [key: string]: unknown;
};

export type OpenClawAdapterOptions = {
  client?: IsplaySdk;
  fixtureGateway?: RuntimeFixtureGateway;
  runKey?: (event: OpenClawHookEvent) => string;
  toolResultMode?: "block" | "native_synthetic";
  contextProvider?: (event: OpenClawHookEvent) => Promise<OpenClawPromptContribution | void> | OpenClawPromptContribution | void;
};

export type OpenClawPromptContribution = {
  prependContext?: string;
  systemPrompt?: string;
  prependSystemContext?: string;
  appendSystemContext?: string;
};
