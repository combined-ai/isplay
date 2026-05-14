import { describe, expect, it } from "vitest";
import { annotationsFrom, promptClause, systemPrompt, valueOf } from "./annotations.js";
import { extractToolCalls } from "./capture.js";

describe("adapter annotations", () => {
  it("keeps prompt values usable while preserving context metadata", () => {
    const prompt = systemPrompt("Use refunds policy.", "system.policy");
    const clause = promptClause("Escalate fraud claims.", "system.policy.fraud");
    const annotations = annotationsFrom({ prompt, clause });

    expect(valueOf(prompt)).toBe("Use refunds policy.");
    expect(annotations.map((item) => item.kind)).toEqual(["system_message", "prompt_clause"]);
    expect(annotations[1]?.path).toBe("system.policy.fraud");
  });

  it("extracts common tool-call shapes", () => {
    expect(extractToolCalls({ toolCalls: [{ id: "call_1", name: "lookup", args: { id: 1 } }] })).toEqual([
      { id: "call_1", name: "lookup", args: { id: 1 } }
    ]);
    expect(extractToolCalls({ message: { tool_calls: [{ function: { name: "search", arguments: "{\"q\":\"x\"}" } }] } })).toEqual([
      { id: undefined, name: "search", args: "{\"q\":\"x\"}" }
    ]);
  });
});
