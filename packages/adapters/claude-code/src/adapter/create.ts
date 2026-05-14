import { getClient } from "@isplay/sdk";
import { claudeCodeCapabilities } from "../capabilities/manifest.js";
import { ClaudeCodeHookHandler } from "../hooks/handler.js";
import { ClaudeStreamIngestor } from "../stream/ingestor.js";
import type { ClaudeCodeAdapterOptions, ClaudeCodeHookInput, ClaudeStreamEvent } from "../types.js";

export function createClaudeCodeAdapter(options: ClaudeCodeAdapterOptions = {}) {
  const client = options.client ?? getClient();
  const keyOf = (event: ClaudeCodeHookInput | ClaudeStreamEvent) => options.runKey?.(event) ?? String(event.session_id ?? "claude-code");
  const hooks = new ClaudeCodeHookHandler({
    client,
    keyOf: (input) => keyOf(input),
    fixtureGateway: options.fixtureGateway,
    replacementMode: options.replacementMode,
    additionalContext: options.additionalContext
  });
  const stream = new ClaudeStreamIngestor(client, (event) => keyOf(event));
  return {
    capabilities: claudeCodeCapabilities,
    handleHook: hooks.handle.bind(hooks),
    ingestStreamLine: stream.ingestLine.bind(stream),
    ingestStreamEvent: stream.ingest.bind(stream)
  };
}
