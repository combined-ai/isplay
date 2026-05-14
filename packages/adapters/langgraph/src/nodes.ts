import type { IsplaySdk } from "@isplay/sdk";
import type { LangGraphNode } from "./types.js";

export function wrapNode<State, Update>(
  client: IsplaySdk,
  name: string,
  node: LangGraphNode<State, Update>,
  options: { checkpointState?: "before" | "after" | "both" | "none" } = {}
): LangGraphNode<State, Update> {
  return async (state, config) => {
    const checkpointState = options.checkpointState ?? "both";
    if (checkpointState === "before" || checkpointState === "both") {
      await client.checkpoint(`langgraph:${name}:before`, state, {
        schemaName: "langgraph.node.state",
        metadata: { node: name, phase: "before" }
      });
    }
    await client.annotateContext({
      kind: "state_field",
      path: `langgraph.nodes.${name}.input`,
      value: state,
      visibility: "state_only",
      metadata: { node: name, phase: "input" }
    });
    try {
      const update = await node(state, config);
      await client.recordEvent("langgraph.node.completed", { name, update });
      if (checkpointState === "after" || checkpointState === "both") {
        await client.checkpoint(`langgraph:${name}:after`, update, {
          schemaName: "langgraph.node.update",
          metadata: { node: name, phase: "after" }
        });
      }
      return update;
    } catch (error) {
      await client.recordEvent("langgraph.node.error", { name, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };
}

export async function checkpointState(client: IsplaySdk, name: string, state: unknown, metadata: Record<string, string> = {}) {
  await client.annotateContext({ kind: "state_field", path: `langgraph.state.${name}`, value: state, visibility: "state_only", metadata });
  return client.checkpoint(`langgraph:${name}`, state, { schemaName: "langgraph.state", metadata });
}
