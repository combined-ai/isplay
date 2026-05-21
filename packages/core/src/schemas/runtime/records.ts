import { z } from "zod";
import { JsonValueSchema, MetadataSchema } from "../common/json.js";

export const DurableIdSchema = z.string().regex(/^[a-z][a-z0-9_]*_[A-Za-z0-9]+$/, "Expected an isplay id with a durable prefix.");
export const IsoTimestampSchema = z.string().datetime({ offset: true });

export const RunStatusSchema = z.enum(["running", "ok", "error", "cancelled"]);

export const EventTypeSchema = z.enum([
  "run.started",
  "run.finished",
  "model_call.started",
  "model_call.finished",
  "tool.proposed",
  "tool.started",
  "tool.finished",
  "checkpoint.created",
  "artifact.created",
  "branch.created",
  "intervention.created",
  "replay.started",
  "replay.paused",
  "replay.finished",
  "fixture.required",
  "fixture.created",
  "analysis.created"
]);

export const BaseRecordSchema = z.object({
  id: DurableIdSchema,
  createdAt: IsoTimestampSchema,
  recordVersion: z.number().int().positive().default(1)
});

export const ProjectSchema = BaseRecordSchema.extend({
  name: z.string(),
  metadata: MetadataSchema
});
export type Project = z.infer<typeof ProjectSchema>;

export const AgentSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  serviceName: z.string(),
  framework: z.string().optional(),
  packageVersions: MetadataSchema,
  metadata: MetadataSchema
});
export type Agent = z.infer<typeof AgentSchema>;

export const RunSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  agentId: z.string().optional(),
  name: z.string().optional(),
  status: RunStatusSchema,
  startedAt: z.string(),
  endedAt: z.string().optional(),
  metadata: MetadataSchema
});
export type Run = z.infer<typeof RunSchema>;

export const EventSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string(),
  seq: z.number().int().nonnegative(),
  type: EventTypeSchema.or(z.string()),
  refId: z.string().optional(),
  parentEventId: z.string().optional(),
  occurredAt: z.string(),
  data: JsonValueSchema,
  metadata: MetadataSchema
});
export type EventRecord = z.infer<typeof EventSchema>;

export const ArtifactSchema = BaseRecordSchema.extend({
  projectId: z.string(),
  runId: z.string().optional(),
  kind: z.string(),
  objectKey: z.string(),
  sha256: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().default("application/json"),
  compression: z.string().optional(),
  redactionState: z.enum(["raw", "redacted", "metadata_only"]).default("raw"),
  metadata: MetadataSchema
});
export type Artifact = z.infer<typeof ArtifactSchema>;
