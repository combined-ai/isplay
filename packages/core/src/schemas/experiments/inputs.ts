import { z } from "zod";
import { JsonValueSchema, MetadataSchema } from "../common/json.js";
import { SideEffectClassSchema } from "../runtime/model-tool.js";
import { FixtureProvenanceSchema, InterventionKindSchema, InterventionTargetSchema, PatchOperationSchema, ReplayPolicySchema } from "../runtime/replay.js";

export const CreateProjectSchema = z.object({
  name: z.string(),
  metadata: MetadataSchema.optional()
});

export const CreateRunSchema = z.object({
  projectId: z.string(),
  agentId: z.string().optional(),
  name: z.string().optional(),
  metadata: MetadataSchema.optional()
});

export const CreateArtifactSchema = z.object({
  projectId: z.string(),
  runId: z.string().optional(),
  kind: z.string(),
  payload: JsonValueSchema,
  mimeType: z.string().optional(),
  redactionState: z.enum(["raw", "redacted", "metadata_only"]).optional(),
  metadata: MetadataSchema.optional()
});

export const CreateCheckpointSchema = z.object({
  projectId: z.string(),
  runId: z.string(),
  name: z.string(),
  state: JsonValueSchema,
  parentEventId: z.string().optional(),
  schemaName: z.string().optional(),
  schemaVersion: z.string().optional(),
  codeVersion: z.string().optional(),
  packageVersions: MetadataSchema.optional(),
  metadata: MetadataSchema.optional()
});

export const CreateBranchSchema = z.object({
  projectId: z.string(),
  baseRunId: z.string(),
  checkpointId: z.string(),
  parentBranchId: z.string().optional(),
  name: z.string().optional(),
  replayPolicy: ReplayPolicySchema.optional(),
  metadata: MetadataSchema.optional()
});

export const CreateInterventionSchema = z.object({
  projectId: z.string(),
  branchId: z.string(),
  kind: InterventionKindSchema,
  target: InterventionTargetSchema.default({}),
  operations: z.array(PatchOperationSchema).default([]),
  description: z.string().optional(),
  patch: JsonValueSchema.optional(),
  expectedBaseHash: z.string().optional(),
  metadata: MetadataSchema.optional()
});

export const CreateReplaySchema = z.object({
  projectId: z.string(),
  baseRunId: z.string(),
  branchId: z.string().optional(),
  experimentId: z.string().optional(),
  armId: z.string().optional(),
  trialIndex: z.number().int().nonnegative().optional(),
  policy: ReplayPolicySchema.optional(),
  wait: z.boolean().optional(),
  metadata: MetadataSchema.optional()
});

export const CreateToolFixtureSchema = z.object({
  projectId: z.string(),
  replayId: z.string().optional(),
  branchId: z.string().optional(),
  toolName: z.string(),
  matcher: JsonValueSchema,
  output: JsonValueSchema,
  schemaVersion: z.string().optional(),
  implementationVersion: z.string().optional(),
  sideEffectClass: SideEffectClassSchema.optional(),
  provenance: FixtureProvenanceSchema,
  author: z.string().optional(),
  metadata: MetadataSchema.optional()
});

export const CreateAnalysisRunSchema = z.object({
  projectId: z.string(),
  baseRunId: z.string(),
  replayId: z.string().optional(),
  experimentId: z.string().optional(),
  metadata: MetadataSchema.optional()
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type CreateRunInput = z.infer<typeof CreateRunSchema>;
export type CreateArtifactInput = z.infer<typeof CreateArtifactSchema>;
export type CreateCheckpointInput = z.infer<typeof CreateCheckpointSchema>;
export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;
export type CreateInterventionInput = z.infer<typeof CreateInterventionSchema>;
export type CreateReplayInput = z.infer<typeof CreateReplaySchema>;
export type CreateToolFixtureInput = z.infer<typeof CreateToolFixtureSchema>;
export type CreateAnalysisRunInput = z.infer<typeof CreateAnalysisRunSchema>;
