import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  data: jsonb("data").notNull(),
  ...timestamps
});

export const runs = pgTable(
  "runs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    agentId: text("agent_id"),
    name: text("name"),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    data: jsonb("data").notNull(),
    ...timestamps
  },
  (table) => [index("idx_runs_project_id").on(table.projectId), index("idx_runs_status").on(table.status)]
);

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    runId: text("run_id").notNull(),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    refId: text("ref_id"),
    parentEventId: text("parent_event_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    data: jsonb("data").notNull(),
    metadata: jsonb("metadata").notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("idx_events_run_seq").on(table.runId, table.seq),
    index("idx_events_run_id").on(table.runId),
    index("idx_events_type").on(table.type)
  ]
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    runId: text("run_id"),
    kind: text("kind").notNull(),
    objectKey: text("object_key").notNull(),
    sha256: text("sha256").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    mimeType: text("mime_type").notNull(),
    redactionState: text("redaction_state").notNull(),
    data: jsonb("data").notNull(),
    ...timestamps
  },
  (table) => [index("idx_artifacts_project_id").on(table.projectId), index("idx_artifacts_run_id").on(table.runId)]
);

export const projections = pgTable(
  "projections",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    runId: text("run_id"),
    kind: text("kind").notNull(),
    status: text("status"),
    refId: text("ref_id"),
    data: jsonb("data").notNull(),
    ...timestamps
  },
  (table) => [
    index("idx_projections_kind").on(table.kind),
    index("idx_projections_project_kind").on(table.projectId, table.kind),
    index("idx_projections_run_kind").on(table.runId, table.kind)
  ]
);
