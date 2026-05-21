import { z } from "zod";
import { JsonValueSchema, MetadataSchema } from "../common/json.js";
import { BaseRecordSchema } from "./records.js";
import { ComparabilitySchema, ReplayPolicySchema } from "./replay.js";

export const ReplayStepDecisionSchema = z.enum([
  "copy_recorded",
  "apply_intervention",
  "inject_fixture",
  "require_fixture",
  "blocked",
  "stop"
]);

export const ReplayFailureSchema = z.object({
  reason: z.enum([
    "unsupported_live_policy",
    "missing_fixture",
    "fixture_scope_mismatch",
    "fixture_schema_mismatch",
    "prompt_patch_conflict",
    "target_not_found",
    "side_effect_blocked",
    "max_steps_exceeded",
    "trace_alignment_failed",
    "non_deterministic_model",
    "artifact_missing",
    "store_conflict"
  ]),
  message: z.string(),
  eventId: z.string().optional(),
  interventionId: z.string().optional(),
  requirementId: z.string().optional(),
  recoverable: z.boolean()
});
export type ReplayFailure = z.infer<typeof ReplayFailureSchema>;

export const ReplayAttemptSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  replayId: z.string(),
  baseRunId: z.string(),
  branchId: z.string().optional(),
  experimentId: z.string().optional(),
  armId: z.string().optional(),
  trialIndex: z.number().int().nonnegative().optional(),
  status: z.enum(["running", "paused", "ok", "error", "non_comparable"]),
  mode: z.enum(["recorded", "counterfactual", "determinism_probe", "live_probe"]),
  policy: ReplayPolicySchema,
  startedAt: z.string(),
  endedAt: z.string().optional(),
  comparability: ComparabilitySchema.optional(),
  failure: ReplayFailureSchema.optional(),
  metadata: MetadataSchema
});
export type ReplayAttempt = z.infer<typeof ReplayAttemptSchema>;

export const ReplayStepSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  attemptId: z.string(),
  replayId: z.string(),
  seq: z.number().int().nonnegative(),
  baseEventId: z.string().optional(),
  derivedEventId: z.string().optional(),
  decision: ReplayStepDecisionSchema,
  inputHash: z.string().optional(),
  outputHash: z.string().optional(),
  details: JsonValueSchema.optional(),
  metadata: MetadataSchema
});
export type ReplayStep = z.infer<typeof ReplayStepSchema>;

export const FixtureUseSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  attemptId: z.string(),
  replayId: z.string(),
  fixtureId: z.string(),
  requirementId: z.string().optional(),
  targetEventId: z.string().optional(),
  injectedEventId: z.string().optional(),
  argsHash: z.string().optional(),
  outputHash: z.string().optional(),
  metadata: MetadataSchema
});
export type FixtureUse = z.infer<typeof FixtureUseSchema>;
