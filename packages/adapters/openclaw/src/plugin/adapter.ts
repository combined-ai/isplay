import { createAdapterKit, resolveClient } from "@isplay/adapter-kit";
import { allowAllFixtures, RuntimeRunRegistry, sideEffectFromToolName, toJsonValue } from "@isplay/adapter-runtime";
import { openClawCapabilities } from "../capabilities/manifest.js";
import { recordOpenClawContext } from "../context/inventory.js";
import type { OpenClawAdapterOptions, OpenClawHookEvent, OpenClawPluginApi } from "../types.js";

export function createOpenClawAdapter(options: OpenClawAdapterOptions = {}) {
  const client = resolveClient(options);
  const kit = createAdapterKit({ client });
  const runs = new RuntimeRunRegistry(client);
  const fixtureGateway = options.fixtureGateway ?? allowAllFixtures;
  const modelCalls = new Map<string, Awaited<ReturnType<typeof client.startModelCall>>>();
  const toolExecutions = new Map<string, Awaited<ReturnType<typeof client.startToolExecution>>>();
  const runKey = (event: OpenClawHookEvent) => options.runKey?.(event) ?? String(event.runId ?? event.sessionId ?? event.sessionKey ?? "openclaw");

  async function capture(event: OpenClawHookEvent, fn: () => Promise<unknown> | unknown) {
    return runs.capture({ key: runKey(event), framework: "openclaw", metadata: openClawMetadata(event) }, fn);
  }

  return {
    ...kit,
    capabilities: openClawCapabilities,
    register(api: OpenClawPluginApi) {
      registerIsplayOpenClaw(api, this);
    },
    async handleHook(name: string, event: OpenClawHookEvent) {
      if (name === "llm_input") return capture(event, () => onLlmInput(event));
      if (name === "llm_output") return capture(event, () => onLlmOutput(event));
      if (name === "before_tool_call") return capture(event, () => onBeforeTool(event));
      if (name === "after_tool_call") return capture(event, () => onAfterTool(event));
      if (name === "before_prompt_build") return capture(event, async () => options.contextProvider?.(event));
      if (name === "agent_end" || name === "session_end") await runs.finish(runKey(event), event.error ? "error" : "ok");
      return capture(event, () => client.recordEvent(`openclaw.${name}`, event, `openclaw:${name}`));
    }
  };

  async function onLlmInput(event: OpenClawHookEvent) {
    const call = await client.startModelCall({ provider: event.provider, model: event.model, operation: "stream", params: event.input ?? event.prompt, settings: event.settings === undefined ? undefined : toJsonValue(event.settings), metadata: openClawMetadata(event) });
    modelCalls.set(runKey(event), call);
    await recordOpenClawContext(client, event, call.id);
    return client.recordEvent("openclaw.llm_input", event, call.id);
  }

  async function onLlmOutput(event: OpenClawHookEvent) {
    const call = modelCalls.get(runKey(event));
    if (call) await client.finishModelCall(call, { output: event.output, usage: event.usage, error: event.error });
    return client.recordEvent("openclaw.llm_output", event, call?.id);
  }

  async function onBeforeTool(event: OpenClawHookEvent) {
    const toolName = String(event.toolName ?? "unknown");
    const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : undefined;
    const call = modelCalls.get(runKey(event));
    const proposal = await client.recordToolProposal({ modelCallId: call?.id, toolCallId, toolName, args: event.params });
    const execution = await client.startToolExecution({ proposalId: proposal.id, toolCallId: proposal.toolCallId, toolName, args: event.params, sideEffectClass: sideEffectFromToolName(toolName) });
    toolExecutions.set(proposal.toolCallId, execution);
    const decision = await fixtureGateway.resolveToolCall({ runtime: "openclaw", runKey: runKey(event), toolName, toolCallId: proposal.toolCallId, args: toJsonValue(event.params), sideEffectClass: execution.sideEffectClass });
    if (decision.action === "inject" && options.toolResultMode === "native_synthetic") return { result: decision.output, skipExecution: true, provenance: "isplay_fixture" };
    if (decision.action === "require_fixture") return { block: true, reason: decision.reason };
    if (decision.action === "block") return { block: true, reason: decision.reason };
    return {};
  }

  async function onAfterTool(event: OpenClawHookEvent) {
    const key = String(event.toolCallId ?? "");
    const execution = toolExecutions.get(key);
    if (execution) await client.finishToolExecution(execution, { output: event.result, error: event.error });
    return client.recordEvent("openclaw.after_tool_call", event, execution?.id);
  }
}

export function registerIsplayOpenClaw(api: OpenClawPluginApi, adapter = createOpenClawAdapter()): void {
  for (const name of ["session_start", "before_model_resolve", "before_prompt_build", "before_agent_run", "llm_input", "llm_output", "before_tool_call", "after_tool_call", "tool_result_persist", "before_compaction", "after_compaction", "agent_end", "session_end"]) {
    api.on(name, (event) => adapter.handleHook(name, event), { priority: 100 });
  }
}

function openClawMetadata(event: OpenClawHookEvent) {
  return {
    ...(typeof event.runId === "string" ? { runId: event.runId } : {}),
    ...(typeof event.sessionId === "string" ? { sessionId: event.sessionId } : {}),
    ...(typeof event.sessionKey === "string" ? { sessionKey: event.sessionKey } : {}),
    ...(typeof event.jobId === "string" ? { jobId: event.jobId } : {})
  };
}
