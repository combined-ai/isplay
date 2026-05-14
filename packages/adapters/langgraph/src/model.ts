import { captureModelCall, extractToolCalls } from "@isplay/adapter-kit";
import type { IsplaySdk } from "@isplay/sdk";

export type InvokableModel<TInput = unknown, TOutput = unknown> = {
  invoke(input: TInput, config?: unknown): Promise<TOutput> | TOutput;
  stream?: (input: TInput, config?: unknown) => AsyncIterable<unknown> | Promise<AsyncIterable<unknown>>;
};

export function wrapChatModel<T extends InvokableModel>(client: IsplaySdk, model: T, options: { provider?: string; model?: string; operation?: string } = {}): T {
  return {
    ...model,
    invoke: async (input: Parameters<T["invoke"]>[0], config?: Parameters<T["invoke"]>[1]) => {
      return captureModelCall(client, { provider: options.provider, model: options.model, operation: "generate", params: input, metadata: { langgraphOperation: options.operation ?? "invoke" } }, async (modelCall) => {
        const output = await model.invoke(input, config);
        for (const call of extractToolCalls(output)) {
          await client.recordToolProposal({ modelCallId: modelCall.id, toolCallId: call.id, toolName: call.name, args: call.args });
        }
        return output;
      });
    },
    stream: model.stream
      ? async (input: Parameters<T["invoke"]>[0], config?: Parameters<T["invoke"]>[1]) => {
          const modelCall = await client.startModelCall({
            provider: options.provider,
            model: options.model,
            operation: "stream",
            params: input,
            metadata: { langgraphOperation: options.operation ?? "stream" }
          });
          try {
            const source = await model.stream!(input, config);
            return captureStream(client, modelCall.id, source, async (chunks) => {
              for (const call of extractToolCalls(chunks)) {
                await client.recordToolProposal({ modelCallId: modelCall.id, toolCallId: call.id, toolName: call.name, args: call.args });
              }
              await client.finishModelCall(modelCall, { output: { chunks } });
            }, async (error) => {
              await client.finishModelCall(modelCall, { error });
            });
          } catch (error) {
            await client.finishModelCall(modelCall, { error });
            throw error;
          }
        }
      : undefined
  } as T;
}

async function* captureStream<TChunk>(
  client: IsplaySdk,
  modelCallId: string,
  source: AsyncIterable<TChunk>,
  finish: (chunks: TChunk[]) => Promise<void>,
  fail: (error: unknown) => Promise<void>
): AsyncIterable<TChunk> {
  const chunks: TChunk[] = [];
  try {
    for await (const chunk of source) {
      chunks.push(chunk);
      yield chunk;
    }
    await finish(chunks);
  } catch (error) {
    await client.recordEvent("model_call.stream_error", { modelCallId, error: error instanceof Error ? error.message : String(error) }, modelCallId);
    await fail(error);
    throw error;
  }
}
