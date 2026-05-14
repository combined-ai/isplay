import { z } from "zod";
import { JsonValueSchema, MetadataSchema } from "../common/json.js";
import { BaseRecordSchema } from "../runtime/records.js";
import { ValidityLabelSchema } from "../runtime/replay.js";

export const EvidenceRefSchema = z.object({
  kind: z.enum(["event", "diff", "metric", "artifact", "fixture", "replay", "experiment"]),
  id: z.string()
});

export const EffectCandidateSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  experimentId: z.string().optional(),
  replayId: z.string().optional(),
  branchId: z.string().optional(),
  baseRunId: z.string().optional(),
  rank: z.number().int().positive(),
  title: z.string(),
  score: z.number(),
  status: z.enum(["supported", "not_supported", "inconclusive", "invalid"]),
  effectType: z.enum(["tool_args_changed", "output_changed", "fixture_sensitive", "early_divergence", "non_comparable", "no_effect"]),
  validityLabels: z.array(ValidityLabelSchema),
  confidence: z.object({ n: z.number().int().nonnegative(), low: z.number().optional(), high: z.number().optional() }),
  evidenceRefs: z.array(EvidenceRefSchema),
  recommendedNextActions: z.array(z.string()),
  metadata: MetadataSchema
});
export type EffectCandidate = z.infer<typeof EffectCandidateSchema>;

export const ExperimentStatisticsSchema = z.object({
  projectId: z.string(),
  experimentId: z.string(),
  trialCount: z.number().int().nonnegative(),
  comparableCount: z.number().int().nonnegative(),
  fixtureDependencyRate: z.number(),
  nonComparableRate: z.number(),
  metrics: z.array(
    z.object({
      name: z.string(),
      n: z.number().int().nonnegative(),
      mean: z.number().optional(),
      rate: z.number().optional(),
      confidenceLow: z.number().optional(),
      confidenceHigh: z.number().optional(),
      method: z.enum(["exact_replay", "bootstrap", "binomial", "deterministic"])
    })
  ),
  metadata: MetadataSchema
});
export type ExperimentStatistics = z.infer<typeof ExperimentStatisticsSchema>;

export const EvidenceReportSchema = z.object({
  projectId: z.string(),
  experimentId: z.string().optional(),
  status: z.enum(["supported", "not_supported", "inconclusive", "invalid"]),
  effects: z.array(EffectCandidateSchema),
  statistics: ExperimentStatisticsSchema.optional(),
  validityLabels: z.array(ValidityLabelSchema),
  missingEvidence: z.array(z.string()),
  metadata: MetadataSchema
});
export type EvidenceReport = z.infer<typeof EvidenceReportSchema>;

export const RankEffectsInputSchema = z.object({
  projectId: z.string(),
  replayIds: z.array(z.string()).optional(),
  experimentId: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  weights: JsonValueSchema.optional()
});
export type RankEffectsInput = z.infer<typeof RankEffectsInputSchema>;
