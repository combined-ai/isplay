import { z } from "zod";
import { MetadataSchema } from "../common/json.js";
import { ReplayPolicySchema } from "../runtime/replay.js";
import { CheckpointSelectorSchema, InterventionSpecSchema, TrialPlanSchema, ValidityGateSchema } from "./records.js";

export const CreateHypothesisBatchSchema = z.object({
  projectId: z.string(),
  name: z.string().optional(),
  baseRunIds: z.array(z.string()).min(1),
  checkpointSelector: CheckpointSelectorSchema.default({ kind: "first" }),
  hypotheses: z.array(
    z.object({
      statement: z.string(),
      interventions: z.array(InterventionSpecSchema).min(1),
      expectedEffect: z
        .object({ metric: z.string(), direction: z.enum(["increase", "decrease", "flip", "no_change"]), minimumEffect: z.number().optional() })
        .optional()
    })
  ),
  trialPlan: TrialPlanSchema.default({ repetitions: 1, concurrency: 1, maxReplays: 20, seedPolicy: "none", stopRule: "none" }),
  policy: ReplayPolicySchema.default({ model: "recorded-only", tool: "pause-for-fixture", drift: "continue_to_terminal", maxSteps: 100 }),
  validityGates: z.array(ValidityGateSchema).default([]),
  metadata: MetadataSchema.optional()
});
export type CreateHypothesisBatchInput = z.infer<typeof CreateHypothesisBatchSchema>;

export const CreateExperimentSchema = CreateHypothesisBatchSchema.extend({
  hypotheses: CreateHypothesisBatchSchema.shape.hypotheses.default([]),
  status: z.enum(["draft", "queued"]).default("draft")
});
export type CreateExperimentInput = z.infer<typeof CreateExperimentSchema>;

export const RunExperimentSchema = z.object({
  maxReplays: z.number().int().positive().optional(),
  wait: z.boolean().default(true)
});
export type RunExperimentInput = z.infer<typeof RunExperimentSchema>;
