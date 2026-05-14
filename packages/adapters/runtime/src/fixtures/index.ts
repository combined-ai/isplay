import type { JsonValue, SideEffectClass, ToolFixture } from "@isplay/core";

export type RuntimeToolCall = {
  runtime: string;
  runKey: string;
  toolName: string;
  toolCallId?: string;
  args: JsonValue;
  sideEffectClass: SideEffectClass;
  metadata?: Record<string, JsonValue>;
};

export type RuntimeFixtureDecision =
  | { action: "allow" }
  | { action: "block"; reason: string }
  | { action: "require_fixture"; reason: string }
  | { action: "inject"; fixture: ToolFixture; output: JsonValue };

export type RuntimeFixtureGateway = {
  resolveToolCall(call: RuntimeToolCall): Promise<RuntimeFixtureDecision> | RuntimeFixtureDecision;
};

export const allowAllFixtures: RuntimeFixtureGateway = {
  resolveToolCall() {
    return { action: "allow" };
  }
};

export function isInjection(decision: RuntimeFixtureDecision): decision is Extract<RuntimeFixtureDecision, { action: "inject" }> {
  return decision.action === "inject";
}
