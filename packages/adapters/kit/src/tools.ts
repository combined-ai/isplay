import type { ToolExecution } from "@isplay/core";
import type { AdapterClient, ToolWrapOptions } from "./types.js";

export function wrapTool<TArgs, TResult, TRest extends unknown[] = []>(
  client: AdapterClient,
  options: ToolWrapOptions,
  handler: (args: TArgs, ...rest: TRest) => Promise<TResult> | TResult
): (args: TArgs, ...rest: TRest) => Promise<TResult> {
  return async (args, ...rest) => {
    const proposal = options.recordProposal
      ? await client.recordToolProposal({ toolName: options.name, toolCallId: options.toolCallId, args })
      : undefined;
    const execution = await client.startToolExecution({
      proposalId: options.proposalId ?? proposal?.id,
      toolCallId: options.toolCallId ?? proposal?.toolCallId,
      toolName: options.name,
      args,
      sideEffectClass: options.sideEffectClass
    });
    try {
      const output = await handler(args, ...rest);
      await client.finishToolExecution(withMetadata(execution, options), { output });
      return output;
    } catch (error) {
      await client.finishToolExecution(withMetadata(execution, options), { error });
      throw error;
    }
  };
}

function withMetadata(execution: ToolExecution, options: ToolWrapOptions): ToolExecution {
  const metadata = {
    ...execution.metadata,
    ...(options.metadata ?? {}),
    ...(options.schemaVersion ? { schemaVersion: options.schemaVersion } : {}),
    ...(options.implementationVersion ? { implementationVersion: options.implementationVersion } : {})
  };
  return {
    ...execution,
    metadata
  };
}
