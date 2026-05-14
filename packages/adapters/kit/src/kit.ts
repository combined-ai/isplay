import { getClient, type IsplaySdk } from "@isplay/sdk";
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

export function createAdapterKit(client: IsplaySdk = getClient()) {
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
