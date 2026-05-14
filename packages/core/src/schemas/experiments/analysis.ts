import { z } from "zod";
import { MetadataSchema } from "../common/json.js";
import { BaseRecordSchema } from "../runtime/records.js";
import { ValidityLabelSchema } from "../runtime/replay.js";

export const AnalysisRunSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  baseRunId: z.string(),
  experimentId: z.string().optional(),
  validityLabels: z.array(ValidityLabelSchema),
  summary: z.string().optional(),
  metadata: MetadataSchema
});
export type AnalysisRun = z.infer<typeof AnalysisRunSchema>;

export const EvidenceNodeSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  analysisRunId: z.string(),
  type: z.enum([
    "prompt_clause",
    "retrieval_chunk",
    "memory_item",
    "state_field",
    "tool_schema",
    "tool_fixture",
    "model_config",
    "token_signal",
    "intervention",
    "metric_delta"
  ]),
  label: z.string(),
  refId: z.string().optional(),
  weight: z.number().optional(),
  metadata: MetadataSchema
});
export type EvidenceNode = z.infer<typeof EvidenceNodeSchema>;

export const EvidenceEdgeSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  analysisRunId: z.string(),
  fromNodeId: z.string(),
  toNodeId: z.string(),
  relation: z.enum(["supports", "contradicts", "depends_on", "changed_by", "first_diverged_at", "sensitive_to"]),
  weight: z.number().optional(),
  metadata: MetadataSchema
});
export type EvidenceEdge = z.infer<typeof EvidenceEdgeSchema>;
