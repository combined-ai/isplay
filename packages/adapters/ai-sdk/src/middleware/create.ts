import { resolveClient } from "@isplay/adapter-kit";
import type { ModelCall } from "@isplay/core";
import type { IsplaySdk as IsplaySdkClient } from "@isplay/sdk";
import { wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";
import { extractLogprobSignals } from "../inference/logprobs.js";
import { inferModel, inferProvider } from "../inference/model-info.js";
import type { AiSdkAdapterOptions } from "../types.js";
import { recordToolProposals } from "./proposals.js";

export function createIsplayMiddleware(options: AiSdkAdapterOptions = {}): LanguageModelMiddleware {
  const client = resolveClient(options);
  return {
    specificationVersion: "v3",
    wrapGenerate: async ({ doGenerate, params, model }) => {
      if (!doGenerate) throw new Error("isplay AI SDK middleware requires doGenerate.");
      const modelCall = await client.startModelCall({ provider: options.provider ?? inferProvider(model), model: options.model ?? inferModel(model), operation: "generate", params });
      try {
        const result = await doGenerate();
        const payload = result as Record<string, unknown>;
        await recordToolProposals(client, modelCall.id, payload);
        await client.finishModelCall(modelCall, { output: payload, usage: payload.usage, logprobs: extractLogprobSignals(payload) });
        return result;
      } catch (error) {
        await client.finishModelCall(modelCall, { error });
        throw error;
      }
    },
    wrapStream: async ({ doStream, params, model }) => {
      if (!doStream) throw new Error("isplay AI SDK middleware requires doStream.");
      const modelCall = await client.startModelCall({ provider: options.provider ?? inferProvider(model), model: options.model ?? inferModel(model), operation: "stream", params });
      try {
        const result = await doStream();
        const payload = result as Record<string, unknown> & { stream?: ReadableStream<unknown> };
        if (!payload.stream || typeof TransformStream === "undefined") return finishNonStream(client, modelCall, payload) as never;
        const chunks: unknown[] = [];
        const transform = new TransformStream<unknown, unknown>({
          transform(chunk, controller) {
            chunks.push(chunk);
            controller.enqueue(chunk);
          },
          async flush() {
            await finishNonStream(client, modelCall, { ...result, stream: "[stream]", chunks });
          }
        });
        return { ...payload, stream: payload.stream.pipeThrough(transform) } as never;
      } catch (error) {
        await client.finishModelCall(modelCall, { error });
        throw error;
      }
    }
  };
}

type AiSdkLanguageModelV3 = Extract<LanguageModel, { specificationVersion: "v3" }>;

export function wrapIsplayModel(model: AiSdkLanguageModelV3, options: AiSdkAdapterOptions = {}): AiSdkLanguageModelV3 {
  return wrapLanguageModel({ model, middleware: createIsplayMiddleware(options) });
}

async function finishNonStream(client: IsplaySdkClient, modelCall: ModelCall, result: Record<string, unknown>): Promise<Record<string, unknown>> {
  await recordToolProposals(client, modelCall.id, result);
  await client.finishModelCall(modelCall, { output: result, usage: result.usage, logprobs: extractLogprobSignals(result) });
  return result;
}
