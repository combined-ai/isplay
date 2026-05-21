import { IsplaySdk, type IsplaySdkOptions } from "@isplay/sdk";
import {
  assistantMessage,
  developerPrompt,
  memoryItem,
  promptClause,
  recordAnnotations,
  retrievalChunk,
  stateField,
  systemPrompt,
  toolSchema,
  userMessage,
  valueOf
} from "./annotations.js";
import { captureModelCall, recordFrameworkEvent } from "./capture.js";
import { wrapTool } from "./tools.js";

export type AdapterKitOptions = { client?: IsplaySdk; projectId?: string; apiUrl?: string; sdk?: Omit<IsplaySdkOptions, "projectId" | "baseUrl"> };

export function createAdapterKit(options: AdapterKitOptions) {
  const client = resolveClient(options);
  return {
    client,
    annotations: {
      assistantMessage,
      developerPrompt,
      memoryItem,
      promptClause,
      retrievalChunk,
      stateField,
      systemPrompt,
      toolSchema,
      userMessage,
      valueOf,
      record: (input: unknown) => recordAnnotations(client, input)
    },
    captureModelCall: captureModelCall.bind(undefined, client),
    recordFrameworkEvent: recordFrameworkEvent.bind(undefined, client),
    wrapTool: wrapTool.bind(undefined, client),
    checkpoint: client.checkpoint.bind(client)
  };
}

export function resolveClient(options: AdapterKitOptions): IsplaySdk {
  if (options.client) return options.client;
  if (options.projectId) return new IsplaySdk({ projectId: options.projectId, baseUrl: options.apiUrl, ...(options.sdk ?? {}) });
  throw new Error("isplay adapters require an explicit client or projectId. Pass getClient() explicitly if you want environment-based convenience.");
}
