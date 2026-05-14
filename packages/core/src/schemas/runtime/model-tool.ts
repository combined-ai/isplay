import { z } from "zod";
import { JsonValueSchema, MetadataSchema } from "../common/json.js";
import { BaseRecordSchema } from "./records.js";

export const SideEffectClassSchema = z.enum(["none", "read", "write", "external_mutation", "unknown"]);
export type SideEffectClass = z.infer<typeof SideEffectClassSchema>;

export const ModelCallSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  provider: z.string().optional(),
  model: z.string().optional(),
  operation: z.enum(["generate", "stream", "unknown"]).default("unknown"),
  status: z.enum(["running", "ok", "error"]),
  settings: JsonValueSchema.optional(),
  requestArtifactId: z.string().optional(),
  responseArtifactId: z.string().optional(),
  usage: JsonValueSchema.optional(),
  logprobs: JsonValueSchema.optional(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  error: z.string().optional(),
  metadata: MetadataSchema
});
export type ModelCall = z.infer<typeof ModelCallSchema>;

export const ToolProposalSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  modelCallId: z.string().optional(),
  toolCallId: z.string(),
  toolName: z.string(),
  argsArtifactId: z.string().optional(),
  argsHash: z.string().optional(),
  schemaVersion: z.string().optional(),
  metadata: MetadataSchema
});
export type ToolProposal = z.infer<typeof ToolProposalSchema>;

export const ToolExecutionSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  proposalId: z.string().optional(),
  toolCallId: z.string().optional(),
  toolName: z.string(),
  status: z.enum(["running", "ok", "error", "blocked"]),
  argsArtifactId: z.string().optional(),
  resultArtifactId: z.string().optional(),
  argsHash: z.string().optional(),
  resultHash: z.string().optional(),
  sideEffectClass: SideEffectClassSchema.default("unknown"),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  error: z.string().optional(),
  metadata: MetadataSchema
});
export type ToolExecution = z.infer<typeof ToolExecutionSchema>;

export const CheckpointSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  name: z.string(),
  parentEventId: z.string().optional(),
  stateArtifactId: z.string(),
  stateHash: z.string(),
  schemaName: z.string().optional(),
  schemaVersion: z.string().optional(),
  codeVersion: z.string().optional(),
  packageVersions: MetadataSchema,
  metadata: MetadataSchema
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;
