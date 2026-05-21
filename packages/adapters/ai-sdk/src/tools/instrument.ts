import { createAdapterKit } from "@isplay/adapter-kit";
import type { SideEffectClass } from "@isplay/core";
import type { AiSdkAdapterOptions, AiSdkTool } from "../types.js";

export function instrumentTools<T extends Record<string, AiSdkTool>>(tools: T, options: AiSdkAdapterOptions): T {
  const kit = createAdapterKit(options);
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
        const wrappedExecute = kit.wrapTool(
          {
            name,
            sideEffectClass: tool.__isplaySideEffectClass ?? classifyToolName(name),
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

function classifyToolName(name: string): SideEffectClass {
  const lower = name.toLowerCase();
  if (/(bash|shell|exec|terminal|command|code|python|node|script|deploy|send|delete|remove|write|edit|patch|apply)/.test(lower)) return "external_mutation";
  if (/(search|read|fetch|get|list|query|lookup|retrieve)/.test(lower)) return "read";
  return "unknown";
}
