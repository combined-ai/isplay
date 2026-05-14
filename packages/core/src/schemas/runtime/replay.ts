import { z } from "zod";
import { JsonValueSchema, MetadataSchema } from "../common/json.js";
import { SideEffectClassSchema } from "./model-tool.js";
import { BaseRecordSchema } from "./records.js";

export const ModelReplayPolicySchema = z.enum([
  "recorded-only",
  "determinism-probe",
  "pinned-live",
  "compatible-live",
  "provider-fixture",
  "blocked"
]);
export type ModelReplayPolicy = z.infer<typeof ModelReplayPolicySchema>;

export const ToolReplayPolicySchema = z.enum([
  "recorded-only",
  "pause-for-fixture",
  "analyst-fixture",
  "simulated",
  "live-readonly",
  "live-explicit",
  "blocked"
]);
export type ToolReplayPolicy = z.infer<typeof ToolReplayPolicySchema>;

export const ReplayPolicySchema = z.object({
  model: ModelReplayPolicySchema.default("recorded-only"),
  tool: ToolReplayPolicySchema.default("pause-for-fixture"),
  drift: z.enum(["stop_on_first_divergence", "continue_to_terminal", "continue_until_budget"]).default("continue_to_terminal"),
  maxSteps: z.number().int().positive().default(100),
  temperatureOverride: z.number().min(0).max(2).optional()
});
export type ReplayPolicy = z.infer<typeof ReplayPolicySchema>;

export const FixtureProvenanceSchema = z.enum(["recorded", "analyst_fixture", "ai_fixture", "simulator", "live_readonly", "live_explicit"]);
export type FixtureProvenance = z.infer<typeof FixtureProvenanceSchema>;

export const ComparabilitySchema = z.enum(["exact", "aligned", "diverged_but_comparable", "non_comparable"]);
export const ValidityLabelSchema = z.enum([
  "confirmed_by_replay",
  "sensitive_to_fixture",
  "model_nondeterministic",
  "diverged_but_comparable",
  "non_comparable",
  "unsupported"
]);
export type ValidityLabel = z.infer<typeof ValidityLabelSchema>;

export const InterventionKindSchema = z.enum([
  "context_mask",
  "message_patch",
  "prompt_patch",
  "prompt_clause_mask",
  "memory_mask",
  "state_mask",
  "state_patch",
  "tool_args_patch",
  "tool_mask",
  "tool_schema_edit",
  "tool_schema_patch",
  "tool_result_substitution",
  "retrieval_substitution",
  "model_config_patch",
  "model_config_change",
  "policy_override",
  "input_patch",
  "human_decision_substitution",
  "latency_or_error_injection",
  "checkpoint_resume"
]);
export type InterventionKind = z.infer<typeof InterventionKindSchema>;

export const InterventionSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  branchId: z.string(),
  kind: InterventionKindSchema,
  targetId: z.string().optional(),
  description: z.string().optional(),
  patch: JsonValueSchema.optional(),
  metadata: MetadataSchema
});
export type Intervention = z.infer<typeof InterventionSchema>;

export const BranchSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  baseRunId: z.string(),
  checkpointId: z.string(),
  parentBranchId: z.string().optional(),
  name: z.string().optional(),
  replayPolicy: ReplayPolicySchema,
  metadata: MetadataSchema
});
export type Branch = z.infer<typeof BranchSchema>;

export const TrialSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  branchId: z.string(),
  trialIndex: z.number().int().nonnegative(),
  seed: z.string().optional(),
  replayPolicy: ReplayPolicySchema,
  status: z.enum(["queued", "running", "paused", "ok", "error"]),
  metadata: MetadataSchema
});
export type Trial = z.infer<typeof TrialSchema>;

export const ReplaySchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  branchId: z.string().optional(),
  trialId: z.string().optional(),
  status: z.enum(["queued", "running", "paused", "ok", "error"]),
  policy: ReplayPolicySchema,
  firstDivergenceEventId: z.string().optional(),
  comparability: ComparabilitySchema.optional(),
  pausedRequirementId: z.string().optional(),
  error: z.string().optional(),
  metadata: MetadataSchema
});
export type Replay = z.infer<typeof ReplaySchema>;

export const ToolFixtureSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  replayId: z.string().optional(),
  branchId: z.string().optional(),
  toolName: z.string(),
  matcher: JsonValueSchema,
  outputArtifactId: z.string().optional(),
  outputHash: z.string().optional(),
  schemaVersion: z.string().optional(),
  implementationVersion: z.string().optional(),
  sideEffectClass: SideEffectClassSchema.default("unknown"),
  provenance: FixtureProvenanceSchema,
  author: z.string().optional(),
  metadata: MetadataSchema
});
export type ToolFixture = z.infer<typeof ToolFixtureSchema>;

export const FixtureRequirementSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  replayId: z.string(),
  branchId: z.string().optional(),
  toolName: z.string(),
  argsArtifactId: z.string().optional(),
  argsHash: z.string().optional(),
  reason: z.string(),
  status: z.enum(["open", "satisfied", "cancelled"]),
  satisfiedByFixtureId: z.string().optional(),
  metadata: MetadataSchema
});
export type FixtureRequirement = z.infer<typeof FixtureRequirementSchema>;

export const DiffSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  replayId: z.string(),
  kind: z.enum(["output", "trace", "tool", "state", "timeline", "metric", "causal"]),
  comparability: ComparabilitySchema,
  patch: JsonValueSchema,
  summary: z.string().optional(),
  metadata: MetadataSchema
});
export type DiffRecord = z.infer<typeof DiffSchema>;

export const MetricSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  replayId: z.string().optional(),
  analysisRunId: z.string().optional(),
  name: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  provenance: z.enum(["deterministic", "analyst_annotation", "simulator_derived", "provider_signal", "model_judged"]),
  confidenceLow: z.number().optional(),
  confidenceHigh: z.number().optional(),
  metadata: MetadataSchema
});
export type Metric = z.infer<typeof MetricSchema>;
