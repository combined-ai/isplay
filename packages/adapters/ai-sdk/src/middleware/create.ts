import { getClient } from "@isplay/sdk";
import type { ModelCall } from "@isplay/core";
import { extractLogprobSignals } from "../inference/logprobs.js";
import { inferModel, inferProvider } from "../inference/model-info.js";
import type { AiSdkAdapterOptions, MiddlewareInput } from "../types.js";
import { recordToolProposals } from "./proposals.js";

export function createIsplayMiddleware(options: AiSdkAdapterOptions = {}): Record<string, unknown> {
  return {
    wrapGenerate: async ({ doGenerate, params, model }: MiddlewareInput) => {
      if (!doGenerate) throw new Error("isplay AI SDK middleware requires doGenerate.");
      const client = getClient();
      const modelCall = await client.startModelCall({ provider: options.provider ?? inferProvider(model), model: options.model ?? inferModel(model), operation: "generate", params });
      try {
        const result = await doGenerate();
        await recordToolProposals(modelCall.id, result);
        await client.finishModelCall(modelCall, { output: result, usage: result.usage, logprobs: extractLogprobSignals(result) });
        return result;
      } catch (error) {
        await client.finishModelCall(modelCall, { error });
        throw error;
      }
    },
    wrapStream: async ({ doStream, params, model }: MiddlewareInput) => {
      if (!doStream) throw new Error("isplay AI SDK middleware requires doStream.");
      const client = getClient();
      const modelCall = await client.startModelCall({ provider: options.provider ?? inferProvider(model), model: options.model ?? inferModel(model), operation: "stream", params });
      try {
        const result = await doStream();
        if (!result.stream || typeof TransformStream === "undefined") return finishNonStream(modelCall, result);
        const chunks: unknown[] = [];
        const transform = new TransformStream<unknown, unknown>({
          transform(chunk, controller) {
            chunks.push(chunk);
            controller.enqueue(chunk);
          },
          async flush() {
            await finishNonStream(modelCall, { ...result, stream: "[stream]", chunks });
          }
        });
        return { ...result, stream: result.stream.pipeThrough(transform) };
      } catch (error) {
        await client.finishModelCall(modelCall, { error });
        throw error;
      }
    }
  };
}

async function finishNonStream(modelCall: ModelCall, result: Record<string, unknown>): Promise<Record<string, unknown>> {
  const client = getClient();
  await recordToolProposals(modelCall.id, result);
  await client.finishModelCall(modelCall, { output: result, usage: result.usage, logprobs: extractLogprobSignals(result) });
  return result;
}
