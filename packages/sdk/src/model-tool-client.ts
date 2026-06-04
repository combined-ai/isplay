import {
  createId,
  ModelCallSchema,
  nowIso,
  stableHash,
  ToolExecutionSchema,
  ToolProposalSchema,
  type JsonValue,
  type ModelCall,
  type ToolExecution,
  type ToolProposal
} from "@isplay/core";
import { runStorage } from "./context.js";
import { RunCaptureClient } from "./run-client.js";

export class ModelToolCaptureClient extends RunCaptureClient {
  async startModelCall(input: Partial<ModelCall> & { params?: unknown } = {}): Promise<ModelCall> {
    const context = requireRun("startModelCall");
    const request = input.params === undefined ? undefined : await this.uploadArtifact("model.request", input.params);
    const modelCall = ModelCallSchema.parse({
      id: createId("model"),
      createdAt: nowIso(),
      recordVersion: 1,
      projectId: context.projectId,
      runId: context.runId,
      provider: input.provider,
      model: input.model,
      operation: input.operation ?? "unknown",
      status: "running",
      settings: input.settings === undefined ? undefined : this.capture(input.settings).value,
      requestArtifactId: request?.id,
      startedAt: nowIso(),
      metadata: input.metadata ?? {}
    });
    await this.api.recordModelCall(context.runId, modelCall);
    await this.recordEvent("model_call.started", modelCall, modelCall.id);
    return modelCall;
  }

  async finishModelCall(modelCall: ModelCall, input: { output?: unknown; usage?: unknown; error?: unknown; logprobs?: unknown } = {}): Promise<ModelCall> {
    if (!runStorage.getStore()) return this.withRunContext({ runId: modelCall.runId, projectId: modelCall.projectId }, () => this.finishModelCall(modelCall, input));
    const response = input.output === undefined ? undefined : await this.uploadArtifact("model.response", input.output);
    const updated = ModelCallSchema.parse({
      ...modelCall,
      status: input.error ? "error" : "ok",
      responseArtifactId: response?.id,
      usage: input.usage === undefined ? undefined : this.capture(input.usage).value,
      logprobs: input.logprobs === undefined ? undefined : this.capture(input.logprobs).value,
      endedAt: nowIso(),
      error: input.error === undefined ? undefined : String(input.error instanceof Error ? input.error.message : input.error)
    });
    await this.api.recordModelCall(modelCall.runId, updated);
    await this.recordEvent("model_call.finished", updated, updated.id);
    return updated;
  }

  async recordToolProposal(input: { modelCallId?: string; toolCallId?: string; toolName: string; args?: unknown }): Promise<ToolProposal> {
    const context = requireRun("recordToolProposal");
    const args = input.args === undefined ? undefined : await this.uploadArtifact("tool.args", input.args);
    const proposal = ToolProposalSchema.parse({
      id: createId("proposal"),
      createdAt: nowIso(),
      recordVersion: 1,
      projectId: context.projectId,
      runId: context.runId,
      modelCallId: input.modelCallId,
      toolCallId: input.toolCallId ?? createId("tool"),
      toolName: input.toolName,
      argsArtifactId: args?.id,
      argsHash: input.args === undefined ? undefined : stableHash(this.capture(input.args).value),
      metadata: {}
    });
    await this.api.recordToolProposal(context.runId, proposal);
    await this.recordEvent("tool.proposed", proposal, proposal.id);
    return proposal;
  }

  async startToolExecution(input: { proposalId?: string; toolCallId?: string; toolName: string; args?: unknown; sideEffectClass?: ToolExecution["sideEffectClass"] }): Promise<ToolExecution> {
    const context = requireRun("startToolExecution");
    const args = input.args === undefined ? undefined : await this.uploadArtifact("tool.args", input.args);
    const execution = ToolExecutionSchema.parse({
      id: createId("tool"),
      createdAt: nowIso(),
      recordVersion: 1,
      projectId: context.projectId,
      runId: context.runId,
      proposalId: input.proposalId,
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      status: "running",
      argsArtifactId: args?.id,
      argsHash: input.args === undefined ? undefined : stableHash(this.capture(input.args).value),
      sideEffectClass: input.sideEffectClass ?? "unknown",
      startedAt: nowIso(),
      metadata: {}
    });
    await this.api.recordToolExecution(context.runId, execution);
    await this.recordEvent("tool.started", execution, execution.id);
    return execution;
  }

  async finishToolExecution(execution: ToolExecution, input: { output?: unknown; error?: unknown } = {}): Promise<ToolExecution> {
    if (!runStorage.getStore()) return this.withRunContext({ runId: execution.runId, projectId: execution.projectId }, () => this.finishToolExecution(execution, input));
    const output = input.output === undefined ? undefined : await this.uploadArtifact("tool.output", input.output);
    const updated = ToolExecutionSchema.parse({ ...execution, status: input.error ? "error" : "ok", resultArtifactId: output?.id, resultHash: input.output === undefined ? undefined : stableHash(this.capture(input.output).value), endedAt: nowIso(), error: input.error === undefined ? undefined : String(input.error instanceof Error ? input.error.message : input.error) });
    await this.api.recordToolExecution(execution.runId, updated);
    await this.recordEvent("tool.finished", updated, updated.id);
    return updated;
  }

  async blockToolExecution(execution: ToolExecution, reason: string, metadata: Record<string, JsonValue> = {}): Promise<ToolExecution> {
    if (!runStorage.getStore()) return this.withRunContext({ runId: execution.runId, projectId: execution.projectId }, () => this.blockToolExecution(execution, reason, metadata));
    const updated = ToolExecutionSchema.parse({
      ...execution,
      status: "blocked",
      endedAt: nowIso(),
      error: reason,
      metadata: { ...execution.metadata, ...metadata }
    });
    await this.api.recordToolExecution(execution.runId, updated);
    await this.recordEvent("tool.finished", updated, updated.id);
    return updated;
  }
}

function requireRun(method: string) {
  const context = runStorage.getStore();
  if (!context) throw new Error(`${method}() must be called inside withRun().`);
  return context;
}
