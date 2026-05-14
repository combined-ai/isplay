import type { ModelCall } from "@isplay/core";
import type { AdapterClient, FrameworkEvent, ModelCaptureInput } from "./types.js";

export async function captureModelCall<T>(client: AdapterClient, input: ModelCaptureInput, call: (modelCall: ModelCall) => Promise<T> | T): Promise<T> {
  const modelCall = await client.startModelCall(input);
  try {
    const output = await call(modelCall);
    await client.finishModelCall(modelCall, {
      output,
      usage: input.extractUsage?.(output) ?? extractUsage(output),
      logprobs: input.extractLogprobs?.(output) ?? extractLogprobs(output)
    });
    return output;
  } catch (error) {
    await client.finishModelCall(modelCall, { error });
    throw error;
  }
}

export async function recordFrameworkEvent(client: AdapterClient, event: FrameworkEvent) {
  return client.recordEvent(`${event.framework}.${event.type}`, event.payload, `${event.framework}:${event.type}`);
}

export function extractUsage(output: unknown): unknown {
  const record = objectRecord(output);
  return record.usage ?? record.tokenUsage ?? objectRecord(record.response).usage;
}

export function extractLogprobs(output: unknown): unknown {
  const record = objectRecord(output);
  return record.logprobs ?? objectRecord(record.response).logprobs ?? objectRecord(record.providerMetadata).logprobs;
}

export function extractToolCalls(output: unknown): Array<{ id?: string; name: string; args?: unknown }> {
  const calls: Array<{ id?: string; name: string; args?: unknown }> = [];
  visit(output, calls);
  return calls;
}

function visit(value: unknown, calls: Array<{ id?: string; name: string; args?: unknown }>): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry) => visit(entry, calls));
    return;
  }
  const record = objectRecord(value);
  const name = record.toolName ?? record.name ?? record.functionName ?? objectRecord(record.function).name;
  if ((record.type === "tool-call" || "toolCallId" in record || "toolName" in record || "args" in record || "arguments" in record || record.function) && typeof name === "string") {
    calls.push({
      id: typeof record.toolCallId === "string" ? record.toolCallId : typeof record.id === "string" ? record.id : undefined,
      name,
      args: record.args ?? record.arguments ?? record.input ?? objectRecord(record.function).arguments
    });
  }
  [record.toolCalls, record.tool_calls, record.message, record.response].forEach((entry) => visit(entry, calls));
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
