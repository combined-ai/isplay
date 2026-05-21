import {
  createId,
  EventSchema,
  nowIso,
  stableHash,
  type CreateRunInput,
  type ContextItem,
  type EventRecord,
  type JsonValue,
  type Run
} from "@isplay/core";
import { captureMetadata } from "./capture.js";
import { runStorage } from "./context.js";
import { IsplaySdkBase } from "./base.js";

export class RunCaptureClient extends IsplaySdkBase {
  private readonly runSequences = new Map<string, number>();

  async withRun<T>(input: Omit<CreateRunInput, "projectId">, fn: (run: Run) => Promise<T> | T): Promise<T> {
    const run = await this.api.createRun({ ...input, projectId: this.projectId });
    return this.withRunContext({ runId: run.id, projectId: this.projectId }, async () => {
      try {
        const result = await fn(run);
        await this.recordEvent("run.finished", { status: "ok" }, run.id);
        await this.api.patchRun(run.id, { status: "ok", endedAt: nowIso() });
        return result;
      } catch (error) {
        await this.recordEvent("run.finished", { error: error instanceof Error ? error.message : String(error) });
        await this.api.patchRun(run.id, { status: "error", endedAt: nowIso() });
        throw error;
      }
    });
  }

  async withRunContext<T>(input: { runId: string; projectId?: string }, fn: () => Promise<T> | T): Promise<T> {
    const projectId = input.projectId ?? this.projectId;
    const context = {
      runId: input.runId,
      projectId,
      seq: this.runSequences.get(input.runId) ?? 1
    };
    return runStorage.run(context, async () => {
      try {
        return await fn();
      } finally {
        this.runSequences.set(input.runId, context.seq);
      }
    });
  }

  async recordEvent(type: string, data: unknown, refId?: string): Promise<EventRecord> {
    const context = runStorage.getStore();
    if (!context) throw new Error("recordEvent() must be called inside withRun() or withRunContext(). Use tryRecordEvent() when intentional no-op capture is acceptable.");
    const captured = this.capture(data);
    const event = EventSchema.parse({
      id: createId("event"),
      createdAt: nowIso(),
      projectId: context.projectId,
      runId: context.runId,
      seq: context.seq++,
      type,
      refId,
      occurredAt: nowIso(),
      data: captured.value,
      metadata: captureMetadata(captured.report)
    });
    await this.api.appendEvents(context.runId, [event]);
    return event;
  }

  async tryRecordEvent(type: string, data: unknown, refId?: string): Promise<EventRecord | undefined> {
    const context = runStorage.getStore();
    if (!context) return undefined;
    return this.recordEvent(type, data, refId);
  }

  async uploadArtifact(kind: string, payload: unknown, metadata: Record<string, JsonValue> = {}) {
    const context = runStorage.getStore();
    const captured = this.capture(payload);
    return this.api.createArtifact({
      projectId: context?.projectId ?? this.projectId,
      runId: context?.runId,
      kind,
      payload: captured.value,
      redactionState: redactionState(captured.report),
      metadata: { ...metadata, ...captureMetadata(captured.report) }
    });
  }

  async annotateContext(input: ContextAnnotationInput): Promise<EventRecord | undefined> {
    const context = runStorage.getStore();
    if (!context) throw new Error("annotateContext() must be called inside withRun().");
    const captured = this.capture(input.value);
    const artifact = await this.api.createArtifact({
      projectId: context.projectId,
      runId: context.runId,
      kind: "context.annotation",
      payload: captured.value,
      redactionState: redactionState(captured.report),
      metadata: { contextKind: input.kind, path: input.path, ...captureMetadata(captured.report), ...(input.metadata ?? {}) }
    });
    return this.recordEvent("context.annotation", {
      kind: input.kind,
      path: input.path,
      label: input.label,
      artifactId: artifact.id,
      contentHash: stableHash(captured.value),
      modelCallId: input.modelCallId,
      checkpointId: input.checkpointId,
      targetRef: input.targetRef,
      ordinal: input.ordinal,
      provenance: input.provenance ?? "annotation",
      visibility: input.visibility ?? "model_visible",
      redactionState: artifact.redactionState,
      metadata: input.metadata ?? {}
    });
  }

  async checkpoint(name: string, state: unknown, options: { schemaName?: string; schemaVersion?: string; metadata?: Record<string, JsonValue> } = {}) {
    const context = runStorage.getStore();
    if (!context) throw new Error("checkpoint() must be called inside withRun().");
    const checkpoint = await this.api.createCheckpoint(context.runId, {
      projectId: context.projectId,
      runId: context.runId,
      name,
      state: this.capture(state).value,
      schemaName: options.schemaName,
      schemaVersion: options.schemaVersion,
      metadata: options.metadata
    });
    await this.recordEvent("checkpoint.created", checkpoint, checkpoint.id);
    return checkpoint;
  }
}

export type ContextAnnotationInput = {
  kind: ContextItem["kind"];
  path: string;
  value: unknown;
  label?: string;
  modelCallId?: string;
  checkpointId?: string;
  targetRef?: string;
  ordinal?: number;
  provenance?: string;
  visibility?: ContextItem["visibility"];
  metadata?: Record<string, JsonValue>;
};

function redactionState(report: ReturnType<RunCaptureClient["capture"]>["report"]): "raw" | "redacted" {
  return report.fieldsDropped || report.fieldsMasked || report.fieldsHashed || Object.keys(report.patternsMatched).length ? "redacted" : "raw";
}
