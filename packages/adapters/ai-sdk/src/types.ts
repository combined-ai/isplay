import type { SideEffectClass } from "@isplay/core";

export type MiddlewareInput = {
  params?: Record<string, unknown>;
  model?: unknown;
  doGenerate?: () => Promise<Record<string, unknown>>;
  doStream?: () => Promise<Record<string, unknown> & { stream?: ReadableStream<unknown> }>;
};

export type AiSdkAdapterOptions = {
  provider?: string;
  model?: string;
};

export type AiSdkTool = Record<string, unknown> & {
  execute?: (args: unknown, options?: unknown) => Promise<unknown> | unknown;
  __isplaySideEffectClass?: SideEffectClass;
  __isplaySchemaVersion?: string;
  __isplayImplementationVersion?: string;
};
