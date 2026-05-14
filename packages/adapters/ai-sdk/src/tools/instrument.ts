import { createAdapterKit } from "@isplay/adapter-kit";
import type { AiSdkTool } from "../types.js";

export function instrumentTools<T extends Record<string, AiSdkTool>>(tools: T): T {
  const wrapped: Record<string, AiSdkTool> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (typeof tool.execute !== "function") {
      wrapped[name] = tool;
      continue;
    }
    const execute = tool.execute.bind(tool);
    wrapped[name] = {
      ...tool,
      async execute(args: unknown, options?: unknown) {
        const wrappedExecute = createAdapterKit().wrapTool(
          {
            name,
            sideEffectClass: tool.__isplaySideEffectClass ?? "unknown",
            schemaVersion: tool.__isplaySchemaVersion,
            implementationVersion: tool.__isplayImplementationVersion
          },
          (input: unknown, toolOptions?: unknown) => execute(input, toolOptions)
        );
        return wrappedExecute(args, options);
      }
    };
  }
  return wrapped as T;
}
