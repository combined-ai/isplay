import { describe, expect, it } from "vitest";
import { applyCapturePolicy } from "./redaction.js";
import { toJsonValue } from "./json.js";
import { stableHash } from "./ids.js";
import { ContextItemSchema, CreateHypothesisBatchSchema, JsonValueSchema } from "./schemas.js";

describe("@isplay/core", () => {
  it("serializes circular values safely", () => {
    const value: Record<string, unknown> = { name: "root" };
    value.self = value;
    expect(JSON.stringify(toJsonValue(value))).toContain("[CIRCULAR]");
  });

  it("serializes optional undefined fields into schema-valid JSON", () => {
    const value = toJsonValue({ id: "run_1", optional: undefined });
    expect(() => JsonValueSchema.parse(value)).not.toThrow();
    expect(value).toEqual({ id: "run_1", optional: null });
  });

  it("applies capture policy and default sensitive-field masking", () => {
    const { value, report } = applyCapturePolicy(
      {
        email: "dev@example.com",
        auth: { token: "secret" },
        hidden: "remove me"
      },
      {
        defaultAction: "capture",
        rules: [{ path: "hidden", action: "drop" }]
      }
    );
    expect(JSON.stringify(value)).not.toContain("dev@example.com");
    expect(JSON.stringify(value)).not.toContain("secret");
    expect(report.fieldsDropped).toBe(1);
    expect(report.fieldsMasked).toBeGreaterThan(0);
  });

  it("hashes undefined distinctly and without throwing", () => {
    expect(() => stableHash(undefined)).not.toThrow();
    expect(stableHash({})).not.toBe(stableHash({ a: undefined }));
  });

  it("accepts agent-facing experiment and context primitives", () => {
    expect(() =>
      CreateHypothesisBatchSchema.parse({
        projectId: "project_1",
        baseRunIds: ["run_1"],
        hypotheses: [{ statement: "Mask system instruction", interventions: [{ kind: "message_patch", target: { modelCallId: "model_1" }, operations: [{ op: "replace", path: "/prompt", value: "patched" }] }] }]
      })
    ).not.toThrow();
    expect(() =>
      ContextItemSchema.parse({
        id: "context_1",
        createdAt: "2026-05-22T00:00:00.000Z",
        projectId: "project_1",
        runId: "run_1",
        kind: "tool_argument",
        path: "tool.started.args",
        contentHash: "hash",
        provenance: "captured",
        visibility: "tool_visible",
        redactionState: "raw",
        metadata: {}
      })
    ).not.toThrow();
  });
});
