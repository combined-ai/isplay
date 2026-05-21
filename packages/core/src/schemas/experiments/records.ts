import { z } from "zod";
import { JsonValueSchema, MetadataSchema } from "../common/json.js";
import { BaseRecordSchema } from "../runtime/records.js";
import { InterventionKindSchema, InterventionTargetSchema, PatchOperationSchema, ReplayPolicySchema } from "../runtime/replay.js";

export const CheckpointSelectorSchema = z.object({
  kind: z.enum(["first", "latest", "name"]),
  value: z.string().optional()
});

export const InterventionSpecSchema = z.object({
  kind: InterventionKindSchema,
  target: InterventionTargetSchema.default({}),
  operations: z.array(PatchOperationSchema).default([]),
  patch: JsonValueSchema.optional(),
  expectedBaseHash: z.string().optional(),
  description: z.string().optional()
});
export type InterventionSpec = z.infer<typeof InterventionSpecSchema>;

export const HypothesisSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  experimentId: z.string().optional(),
  statement: z.string(),
  interventions: z.array(InterventionSpecSchema).default([]),
  expectedEffect: z
    .object({ metric: z.string(), direction: z.enum(["increase", "decrease", "flip", "no_change"]), minimumEffect: z.number().optional() })
    .optional(),
  metadata: MetadataSchema
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

export const TrialPlanSchema = z.object({
  repetitions: z.number().int().positive().default(1),
  concurrency: z.number().int().positive().default(1),
  maxReplays: z.number().int().positive().default(20),
  seedPolicy: z.enum(["none", "fixed", "indexed"]).default("none"),
  stopRule: z.enum(["none", "first_supported", "first_invalid"]).default("none")
});
export type TrialPlan = z.infer<typeof TrialPlanSchema>;

export const ValidityGateSchema = z.object({
  kind: z.enum(["minimum_trials", "max_fixture_dependency_rate", "max_non_comparable_rate", "requires_effect_size"]),
  metric: z.string().optional(),
  value: z.number()
});
export type ValidityGate = z.infer<typeof ValidityGateSchema>;

export const ExperimentSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  name: z.string().optional(),
  baseRunIds: z.array(z.string()),
  checkpointSelector: CheckpointSelectorSchema,
  trialPlan: TrialPlanSchema,
  policy: ReplayPolicySchema,
  validityGates: z.array(ValidityGateSchema),
  status: z.enum(["draft", "queued", "running", "paused", "completed", "invalid"]),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  metadata: MetadataSchema
});
export type Experiment = z.infer<typeof ExperimentSchema>;

export const ExperimentArmSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  experimentId: z.string(),
  hypothesisId: z.string().optional(),
  baseRunId: z.string(),
  branchId: z.string().optional(),
  replayIds: z.array(z.string()),
  status: z.enum(["queued", "running", "paused", "ok", "error", "invalid"]),
  metadata: MetadataSchema
});
export type ExperimentArm = z.infer<typeof ExperimentArmSchema>;
