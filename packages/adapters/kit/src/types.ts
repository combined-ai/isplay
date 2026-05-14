import type { ContextItem, JsonValue, ModelCall, ToolExecution } from "@isplay/core";
import type { IsplaySdk } from "@isplay/sdk";

export type AdapterClient = IsplaySdk;

export type ContextAnnotationSpec = {
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

export type ModelCaptureInput = Partial<ModelCall> & {
  params?: unknown;
  extractUsage?: (output: unknown) => unknown;
  extractLogprobs?: (output: unknown) => unknown;
};

export type ToolWrapOptions = {
  name: string;
  toolCallId?: string;
  proposalId?: string;
  recordProposal?: boolean;
  sideEffectClass?: ToolExecution["sideEffectClass"];
  schemaVersion?: string;
  implementationVersion?: string;
  metadata?: Record<string, JsonValue>;
};

export type FrameworkEvent = {
  framework: string;
  type: string;
  payload: unknown;
  metadata?: Record<string, JsonValue>;
};
