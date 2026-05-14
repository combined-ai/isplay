import type { ToolExecution } from "@isplay/core";
import type { IsplaySdk } from "@isplay/sdk";
import type { LangGraphStreamMode, LangGraphToolEvent } from "./types.js";

export async function* instrumentStream<T>(
  client: IsplaySdk,
  stream: AsyncIterable<T>,
  options: { runName?: string; recordValuesAsCheckpoints?: boolean } = {}
): AsyncIterable<T> {
  const toolExecutions = new Map<string, ToolExecution>();
  for await (const chunk of stream) {
    await recordStreamChunk(client, chunk, { ...options, toolExecutions });
    yield chunk;
  }
}

export async function recordStreamChunk(
  client: IsplaySdk,
  chunk: unknown,
  options: { recordValuesAsCheckpoints?: boolean; toolExecutions?: Map<string, ToolExecution> } = {}
) {
  const { mode, payload } = splitMode(chunk);
  await client.recordEvent(`langgraph.stream.${mode}`, payload);
  if (mode === "tools") await recordToolEvent(client, payload as LangGraphToolEvent, options.toolExecutions);
  if (mode === "messages") await recordMessageChunk(client, payload);
  if ((mode === "values" || mode === "checkpoints") && options.recordValuesAsCheckpoints) {
    await client.checkpoint(`langgraph:stream:${mode}`, payload, { schemaName: `langgraph.stream.${mode}` });
  }
  if (mode === "updates") {
    await client.annotateContext({ kind: "state_field", path: "langgraph.stream.updates", value: payload, visibility: "state_only" });
  }
}

function splitMode(chunk: unknown): { mode: LangGraphStreamMode | "unknown"; payload: unknown } {
  if (Array.isArray(chunk) && typeof chunk[0] === "string" && chunk.length === 2) {
    return { mode: chunk[0] as LangGraphStreamMode, payload: chunk[1] };
  }
  if (chunk && typeof chunk === "object" && "type" in chunk) {
    return { mode: String((chunk as { type?: unknown }).type) as LangGraphStreamMode, payload: chunk };
  }
  return { mode: "unknown", payload: chunk };
}

async function recordMessageChunk(client: IsplaySdk, payload: unknown) {
  const tuple = Array.isArray(payload) ? payload : [];
  const message = tuple[0] ?? payload;
  await client.annotateContext({
    kind: "assistant_message",
    path: "langgraph.stream.messages",
    value: message,
    provenance: "langgraph_stream"
  });
}

async function recordToolEvent(client: IsplaySdk, event: LangGraphToolEvent, active = new Map<string, ToolExecution>()) {
  const name = event.name ?? "unknown";
  const key = event.toolCallId ?? name;
  if (event.event === "on_tool_start") {
    active.set(key, await client.startToolExecution({ toolName: name, toolCallId: event.toolCallId, args: event.input, sideEffectClass: "unknown" }));
  } else if (event.event === "on_tool_end" || event.event === "on_tool_error") {
    const execution = active.get(key);
    if (execution) {
      await client.finishToolExecution(execution, { output: event.output, error: event.error });
      active.delete(key);
    } else {
      await client.recordEvent(`tool.${event.event === "on_tool_error" ? "error" : "observed"}`, {
        toolName: name,
        toolCallId: event.toolCallId,
        status: event.event === "on_tool_error" ? "error" : "ok",
        output: event.output,
        error: normalizeError(event.error)
      } satisfies Partial<ToolExecution> & { output?: unknown });
    }
  }
}

function normalizeError(error: unknown): string | undefined {
  if (error === undefined) return undefined;
  return error instanceof Error ? error.message : String(error);
}
