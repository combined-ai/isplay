import { resolveClient } from "@isplay/adapter-kit";
import { codexCapabilities } from "../capabilities/manifest.js";
import { CodexHookHandler } from "../hooks/handler.js";
import { CodexJsonlIngestor } from "../jsonl/ingestor.js";
import type { CodexAdapterOptions, CodexEvent, CodexHookInput } from "../types.js";

export function createCodexAdapter(options: CodexAdapterOptions = {}) {
  const client = resolveClient(options);
  const keyOf = (event: CodexEvent | CodexHookInput) => options.runKey?.(event) ?? String(event.thread_id ?? event.session_id ?? "codex");
  const hooks = new CodexHookHandler({
    client,
    keyOf: (input) => keyOf(input),
    fixtureGateway: options.fixtureGateway,
    postToolReplacement: options.postToolReplacement,
    additionalContext: options.additionalContext
  });
  const jsonl = new CodexJsonlIngestor(client, (event) => keyOf(event));
  return {
    capabilities: codexCapabilities,
    handleHook: hooks.handle.bind(hooks),
    ingestJsonLine: jsonl.ingestLine.bind(jsonl),
    ingestJsonEvent: jsonl.ingest.bind(jsonl)
  };
}
