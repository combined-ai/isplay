import type { IsplaySdk, IsplaySdkOptions } from "@isplay/sdk";
import type { RuntimeFixtureGateway } from "@isplay/adapter-runtime";

export type ClaudeCodeAdapterOptions = {
  client?: IsplaySdk;
  projectId?: string;
  apiUrl?: string;
  sdk?: Omit<IsplaySdkOptions, "projectId" | "baseUrl">;
  fixtureGateway?: RuntimeFixtureGateway;
  runKey?: (event: ClaudeCodeHookInput | ClaudeStreamEvent) => string;
  replacementMode?: "defer" | "post_tool_context";
  additionalContext?: (event: ClaudeCodeHookInput) => Promise<string | undefined> | string | undefined;
};

export type ClaudeCodeHookInput = {
  hook_event_name: string;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  permission_mode?: string;
  tool_name?: string;
  tool_use_id?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  prompt?: string;
  last_assistant_message?: string;
  agent_id?: string;
  agent_type?: string;
  [key: string]: unknown;
};

export type ClaudeHookOutput = {
  systemMessage?: string;
  hookSpecificOutput?: Record<string, unknown>;
};

export type ClaudeStreamEvent = {
  type: string;
  session_id?: string;
  message?: unknown;
  usage?: unknown;
  [key: string]: unknown;
};
