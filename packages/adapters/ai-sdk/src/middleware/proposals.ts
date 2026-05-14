import { getClient } from "@isplay/sdk";
import { extractToolCalls } from "../inference/tool-calls.js";

export async function recordToolProposals(modelCallId: string, result: unknown): Promise<void> {
  const client = getClient();
  for (const call of extractToolCalls(result)) {
    await client.recordToolProposal({
      modelCallId,
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      args: call.args
    });
  }
}
