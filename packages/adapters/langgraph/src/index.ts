import { createAdapterKit, wrapTool as wrapIsplayTool } from "@isplay/adapter-kit";
import { getClient, type IsplaySdk } from "@isplay/sdk";
import { wrapChatModel } from "./model.js";
import { checkpointState, wrapNode } from "./nodes.js";
import { instrumentStream, recordStreamChunk } from "./stream.js";
import type { LangGraphAdapterOptions, LangGraphToolOptions } from "./types.js";

export function createLangGraphAdapter(options: LangGraphAdapterOptions = {}) {
  const client: IsplaySdk = options.client ?? getClient();
  const kit = createAdapterKit(client);
  return {
    ...kit,
    framework: options.framework ?? "langgraph",
    wrapNode: wrapNode.bind(undefined, client),
    checkpointState: checkpointState.bind(undefined, client),
    wrapChatModel: wrapChatModel.bind(undefined, client),
    instrumentStream: instrumentStream.bind(undefined, client),
    recordStreamChunk: recordStreamChunk.bind(undefined, client),
    wrapTool: <TArgs, TResult>(tool: LangGraphToolOptions, handler: (args: TArgs) => Promise<TResult> | TResult) =>
      wrapIsplayTool(client, { ...tool, recordProposal: true }, handler)
  };
}

export { checkpointState, instrumentStream, recordStreamChunk, wrapChatModel, wrapNode };
export type * from "./types.js";
