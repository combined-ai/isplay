import type { IsplaySdk } from "@isplay/sdk";
import { objectRecord } from "@isplay/adapter-runtime";
import type { OpenClawHookEvent } from "../types.js";

export async function recordOpenClawContext(client: IsplaySdk, event: OpenClawHookEvent, modelCallId?: string): Promise<void> {
  const systemPrompt = typeof event.systemPrompt === "string" ? event.systemPrompt : objectRecord(event.input).systemPrompt;
  if (typeof systemPrompt === "string") {
    await client.annotateContext({ kind: "system_message", path: "openclaw.system_prompt", value: systemPrompt, modelCallId, provenance: "openclaw.llm_input" });
  }
  const inputMessages = objectRecord(event.input).messages;
  const messages: unknown[] = Array.isArray(event.messages) ? event.messages : Array.isArray(inputMessages) ? inputMessages : [];
  for (const [index, message] of messages.entries()) {
    const role = String(objectRecord(message).role ?? "user");
    await client.annotateContext({
      kind: role === "assistant" ? "assistant_message" : role === "tool" ? "tool_result" : "user_message",
      path: `openclaw.messages.${index}`,
      value: message,
      modelCallId,
      ordinal: index,
      provenance: "openclaw.context"
    });
  }
  const settings = objectRecord(event.settings);
  for (const [key, value] of Object.entries(settings)) {
    await client.annotateContext({ kind: "model_setting", path: `openclaw.settings.${key}`, value, modelCallId, provenance: "openclaw.model_resolve" });
  }
}
