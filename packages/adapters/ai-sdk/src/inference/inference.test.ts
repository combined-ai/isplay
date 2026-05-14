import { describe, expect, it } from "vitest";
import { extractLogprobSignals } from "./logprobs.js";
import { inferModel, inferProvider } from "./model-info.js";
import { extractToolCalls } from "./tool-calls.js";

describe("AI SDK inference helpers", () => {
  it("extracts tool calls from common AI SDK and provider shapes", () => {
    expect(extractToolCalls({ toolCalls: [{ toolCallId: "call_1", toolName: "lookup", args: { id: 1 } }] })).toEqual([
      { toolName: "lookup", toolCallId: "call_1", args: { id: 1 } }
    ]);
    expect(extractToolCalls({ message: { tool_calls: [{ id: "call_2", function: { name: "search", arguments: "{\"q\":\"x\"}" } }] } })).toEqual([
      { toolName: "search", toolCallId: "call_2", args: "{\"q\":\"x\"}" }
    ]);
  });

  it("extracts logprob signals and model identity", () => {
    expect(extractLogprobSignals({ choices: [{ token: "A", logprob: -0.1, topLogprobs: [] }] })).toEqual([
      { token: "A", logprob: -0.1, topAlternatives: [], position: undefined }
    ]);
    expect(inferProvider({ provider: "openai" })).toBe("openai");
    expect(inferModel({ modelId: "gpt-test" })).toBe("gpt-test");
  });
});
