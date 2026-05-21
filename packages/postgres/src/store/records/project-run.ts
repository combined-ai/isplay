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
  stableHash,
  toJsonValue
} from "@isplay/core";
import { StoreBase } from "../infrastructure/base.js";

type PaginationOptions = { limit?: number; offset?: number };

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

  async listRuns(projectId?: string, page?: PaginationOptions): Promise<Run[]> {
    const pagination = normalizePagination(page);
    const result = projectId
      ? pagination
        ? await this.pool.query<{ data: unknown }>("SELECT data FROM runs WHERE project_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3", [projectId, pagination.limit, pagination.offset])
        : await this.pool.query<{ data: unknown }>("SELECT data FROM runs WHERE project_id = $1 ORDER BY started_at DESC", [projectId])
      : pagination
        ? await this.pool.query<{ data: unknown }>("SELECT data FROM runs ORDER BY started_at DESC LIMIT $1 OFFSET $2", [pagination.limit, pagination.offset])
        : await this.pool.query<{ data: unknown }>("SELECT data FROM runs ORDER BY started_at DESC");
    return result.rows.map((row) => RunSchema.parse(row.data));
  }

  async patchRun(id: string, input: Partial<Run>): Promise<Run> {
    const current = await this.getRun(id);
    if (!current) throw new Error(`Run not found: ${id}`);
    const updated = RunSchema.parse({ ...current, ...input });
    validateRunTransition(current, updated);
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
    if (run.status !== "running") throw new Error(`Cannot append events to terminal run ${runId}.`);
    if (!events.length) return 0;
    const records = events.map((event) => EventSchema.parse(event)).sort((left, right) => left.seq - right.seq);
    const seqs = new Set<number>();
    const ids = new Set<string>();
    for (const record of records) {
      if (record.runId !== runId) throw new Error("Path run id and event runId differ");
      if (record.projectId !== run.projectId) throw new Error("Run project id and event projectId differ");
      if (seqs.has(record.seq)) throw new Error(`Duplicate event seq ${record.seq} in append batch.`);
      if (ids.has(record.id)) throw new Error(`Duplicate event id ${record.id} in append batch.`);
      seqs.add(record.seq);
      ids.add(record.id);
    }

    const client = await this.pool.connect();
    let inserted = 0;
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM runs WHERE id = $1 FOR UPDATE", [runId]);
      const existingRows = await client.query(
        "SELECT * FROM events WHERE run_id = $1 AND seq = ANY($2::int[]) ORDER BY seq ASC",
        [runId, [...seqs]]
      );
      const existingBySeq = new Map<number, EventRecord>(
        existingRows.rows.map((row) => [Number(row.seq), eventFromRow(row)])
      );
      const existingIdRows = await client.query("SELECT * FROM events WHERE id = ANY($1::text[])", [[...ids]]);
      const recordsById = new Map(records.map((record) => [record.id, record]));
      for (const row of existingIdRows.rows) {
        const existing = eventFromRow(row);
        const attempted = recordsById.get(existing.id);
        if (!attempted || eventIdentityHash(existing) !== eventIdentityHash(attempted)) {
          throw new Error(`Conflicting event already exists with id ${existing.id}.`);
        }
      }
      for (const record of records) {
        const existing = existingBySeq.get(record.seq);
        if (existing && eventIdentityHash(existing) !== eventIdentityHash(record)) {
          throw new Error(`Conflicting event already exists for run ${runId} seq ${record.seq}.`);
        }
      }
      const fresh = records.filter((record) => !existingBySeq.has(record.seq));
      if (fresh.length) {
        const max = await client.query<{ max: number | null }>("SELECT max(seq)::int AS max FROM events WHERE run_id = $1", [runId]);
        let expected = (max.rows[0]?.max ?? -1) + 1;
        for (const record of fresh) {
          if (record.seq !== expected) throw new Error(`Non-contiguous event append for run ${runId}: expected seq ${expected}, got ${record.seq}.`);
          expected += 1;
        }
      }
      for (const record of fresh) {
        await client.query(
          `INSERT INTO events (id, project_id, run_id, seq, type, ref_id, parent_event_id, occurred_at, data, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
        inserted += 1;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return inserted;
  }

  async getEvents(runId: string, page?: PaginationOptions): Promise<EventRecord[]> {
    const pagination = normalizePagination(page);
    const result = pagination
      ? await this.pool.query("SELECT * FROM events WHERE run_id = $1 ORDER BY seq ASC LIMIT $2 OFFSET $3", [runId, pagination.limit, pagination.offset])
      : await this.pool.query("SELECT * FROM events WHERE run_id = $1 ORDER BY seq ASC", [runId]);
    return result.rows.map(eventFromRow);
  }
}

function normalizePagination(page?: PaginationOptions): Required<PaginationOptions> | undefined {
  if (!page) return undefined;
  return { limit: Math.min(Math.max(Math.trunc(page.limit ?? 100), 1), 500), offset: Math.max(Math.trunc(page.offset ?? 0), 0) };
}

function validateRunTransition(current: Run, next: Run): void {
  if (current.status !== "running" && next.status === "running") throw new Error(`Cannot transition terminal run ${current.id} back to running.`);
  if (next.status !== "running" && !next.endedAt) throw new Error(`Run ${next.id} cannot enter terminal status ${next.status} without endedAt.`);
}

function eventFromRow(row: any): EventRecord {
  return EventSchema.parse({
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
  });
}

function eventIdentityHash(event: EventRecord): string {
  return stableHash({
    id: event.id,
    projectId: event.projectId,
    runId: event.runId,
    seq: event.seq,
    type: event.type,
    refId: event.refId,
    parentEventId: event.parentEventId,
    occurredAt: event.occurredAt,
    data: event.data,
    metadata: event.metadata
  });
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
