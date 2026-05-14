import type { JsonValue } from "@isplay/core";
import type { IsplaySdk } from "@isplay/sdk";
import type { RuntimeFixtureGateway } from "@isplay/adapter-runtime";

export type CodexAdapterOptions = {
  client?: IsplaySdk;
  fixtureGateway?: RuntimeFixtureGateway;
  runKey?: (event: CodexEvent | CodexHookInput) => string;
  postToolReplacement?: boolean;
  additionalContext?: (event: CodexHookInput) => Promise<string | undefined> | string | undefined;
};

export type CodexEvent = {
  type: string;
  thread_id?: string;
  turn_id?: string;
  item?: Record<string, unknown>;
  usage?: unknown;
  error?: unknown;
  [key: string]: unknown;
};

export type CodexHookInput = {
  hook_event_name: string;
  session_id?: string;
  turn_id?: string;
  cwd?: string;
  transcript_path?: string;
  permission_mode?: string;
  source?: string;
  prompt?: string;
  tool_name?: string;
  tool_use_id?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  last_assistant_message?: string | null;
  [key: string]: unknown;
};

export type CodexHookOutput = {
  decision?: "block";
  reason?: string;
  continue?: false;
  systemMessage?: string;
  hookSpecificOutput?: Record<string, unknown>;
};
