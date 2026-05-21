import { z } from "zod";
import { JsonValueSchema, MetadataSchema } from "../common/json.js";
import { BaseRecordSchema } from "../runtime/records.js";

export const PromptRoleSchema = z.enum(["system", "developer", "user", "assistant", "tool"]);
export const ContextItemKindSchema = z.enum([
  "system_message",
  "developer_message",
  "user_message",
  "assistant_message",
  "prompt_clause",
  "tool_argument",
  "tool_result",
  "retrieval_chunk",
  "memory_item",
  "state_field",
  "tool_schema",
  "model_setting"
]);
export const ContextVisibilitySchema = z.enum(["model_visible", "tool_visible", "state_only", "metadata_only"]);
export const RedactionStateSchema = z.enum(["raw", "redacted", "metadata_only"]);

export const PromptMessageSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  modelCallId: z.string().optional(),
  role: PromptRoleSchema,
  ordinal: z.number().int().nonnegative(),
  contentArtifactId: z.string().optional(),
  contentHash: z.string(),
  metadata: MetadataSchema
});
export type PromptMessage = z.infer<typeof PromptMessageSchema>;

export const PromptClauseSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  messageId: z.string().optional(),
  path: z.string(),
  textHash: z.string(),
  ordinal: z.number().int().nonnegative().optional(),
  metadata: MetadataSchema
});
export type PromptClause = z.infer<typeof PromptClauseSchema>;

export const ContextItemSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  checkpointId: z.string().optional(),
  modelCallId: z.string().optional(),
  sourceEventId: z.string().optional(),
  kind: ContextItemKindSchema,
  path: z.string(),
  ordinal: z.number().int().nonnegative().optional(),
  contentArtifactId: z.string().optional(),
  contentHash: z.string(),
  tokenEstimate: z.number().int().nonnegative().optional(),
  provenance: z.string(),
  visibility: ContextVisibilitySchema,
  redactionState: RedactionStateSchema,
  metadata: MetadataSchema
});
export type ContextItem = z.infer<typeof ContextItemSchema>;

export const ContextInventorySchema = z.object({
  projectId: z.string(),
  runId: z.string().optional(),
  checkpointId: z.string().optional(),
  modelCallId: z.string().optional(),
  items: z.array(ContextItemSchema),
  summary: z.record(z.string(), z.number().int().nonnegative()),
  metadata: MetadataSchema
});
export type ContextInventory = z.infer<typeof ContextInventorySchema>;

export const ContextSearchSchema = z.object({
  projectId: z.string(),
  runId: z.string().optional(),
  kinds: z.array(ContextItemKindSchema).optional(),
  query: z.string().optional(),
  limit: z.number().int().positive().max(200).default(50),
  offset: z.number().int().nonnegative().default(0)
});
export type ContextSearchInput = z.infer<typeof ContextSearchSchema>;

export const CatalogSchema = z.object({
  projectId: z.string(),
  runId: z.string().optional(),
  observed: JsonValueSchema,
  capabilities: JsonValueSchema,
  nextActions: z.array(z.string())
});
export type Catalog = z.infer<typeof CatalogSchema>;
