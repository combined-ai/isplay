import {
  createId,
  EventSchema,
  nowIso,
  ProjectSchema,
  RunSchema,
  type CreateProjectInput,
  type CreateRunInput,
  type EventRecord,
  type Project,
  type Run,
  toJsonValue
} from "@isplay/core";
import { StoreBase } from "../infrastructure/base.js";

export class ProjectRunStore extends StoreBase {
  async createProject(input: CreateProjectInput): Promise<Project> {
    const record = ProjectSchema.parse({ id: createId("project"), createdAt: nowIso(), name: input.name, metadata: input.metadata ?? {} });
    await this.pool.query("INSERT INTO projects (id, name, data) VALUES ($1, $2, $3)", [record.id, record.name, JSON.stringify(record)]);
    return record;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.getData("projects", id, ProjectSchema.parse);
  }

  async createRun(input: CreateRunInput): Promise<Run> {
    const record = RunSchema.parse({
      id: createId("run"),
      createdAt: nowIso(),
      projectId: input.projectId,
      agentId: input.agentId,
      name: input.name,
      status: "running",
      startedAt: nowIso(),
      metadata: input.metadata ?? {}
    });
    await this.pool.query(
      "INSERT INTO runs (id, project_id, agent_id, name, status, started_at, data) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [record.id, record.projectId, record.agentId ?? null, record.name ?? null, record.status, record.startedAt, JSON.stringify(record)]
    );
    await this.appendEvents(record.id, [runStartedEvent(record)]);
    return record;
  }

  async getRun(id: string): Promise<Run | undefined> {
    return this.getData("runs", id, RunSchema.parse);
  }

  async listRuns(projectId?: string): Promise<Run[]> {
    const result = projectId
      ? await this.pool.query<{ data: unknown }>("SELECT data FROM runs WHERE project_id = $1 ORDER BY started_at DESC", [projectId])
      : await this.pool.query<{ data: unknown }>("SELECT data FROM runs ORDER BY started_at DESC");
    return result.rows.map((row) => RunSchema.parse(row.data));
  }

  async patchRun(id: string, input: Partial<Run>): Promise<Run> {
    const current = await this.getRun(id);
    if (!current) throw new Error(`Run not found: ${id}`);
    const updated = RunSchema.parse({ ...current, ...input });
    await this.pool.query("UPDATE runs SET status = $2, ended_at = $3, data = $4, updated_at = now() WHERE id = $1", [
      id,
      updated.status,
      updated.endedAt ?? null,
      JSON.stringify(updated)
    ]);
    return updated;
  }

  async appendEvents(runId: string, events: EventRecord[]): Promise<number> {
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    let inserted = 0;
    for (const event of events) {
      const record = EventSchema.parse(event);
      if (record.runId !== runId) throw new Error("Path run id and event runId differ");
      if (record.projectId !== run.projectId) throw new Error("Run project id and event projectId differ");
      const result = await this.pool.query(
        `INSERT INTO events (id, project_id, run_id, seq, type, ref_id, parent_event_id, occurred_at, data, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (run_id, seq) DO NOTHING`,
        [
          record.id,
          record.projectId,
          record.runId,
          record.seq,
          record.type,
          record.refId ?? null,
          record.parentEventId ?? null,
          record.occurredAt,
          JSON.stringify(record.data),
          JSON.stringify(record.metadata)
        ]
      );
      inserted += result.rowCount ?? 0;
    }
    return inserted;
  }

  async getEvents(runId: string): Promise<EventRecord[]> {
    const result = await this.pool.query("SELECT * FROM events WHERE run_id = $1 ORDER BY seq ASC", [runId]);
    return result.rows.map((row) =>
      EventSchema.parse({
        id: row.id,
        createdAt: row.created_at.toISOString(),
        projectId: row.project_id,
        runId: row.run_id,
        seq: row.seq,
        type: row.type,
        refId: row.ref_id ?? undefined,
        parentEventId: row.parent_event_id ?? undefined,
        occurredAt: row.occurred_at.toISOString(),
        data: row.data,
        metadata: row.metadata
      })
    );
  }
}

function runStartedEvent(record: Run): EventRecord {
  return EventSchema.parse({
    id: createId("event"),
    createdAt: nowIso(),
    projectId: record.projectId,
    runId: record.id,
    seq: 0,
    type: "run.started",
    refId: record.id,
    occurredAt: record.startedAt,
    data: toJsonValue(record),
    metadata: {}
  });
}
