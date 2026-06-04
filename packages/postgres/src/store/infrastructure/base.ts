import { Pool, type PoolClient } from "pg";
import { mkdir } from "node:fs/promises";
import { createId, nowIso, toJsonValue, type JsonValue } from "@isplay/core";
import { migrate } from "../../migrations.js";

export type IsplayStoreOptions = {
  connectionString: string;
  artifactsDir: string;
};

export type DurableJobStatus = "queued" | "running" | "ok" | "error";
export type DurableJob = {
  id: string;
  createdAt: string;
  recordVersion: number;
  projectId: string;
  kind: "replay.run" | "experiment.run";
  status: DurableJobStatus;
  resourceId: string;
  graphileJobId?: string;
  error?: string;
  metadata: Record<string, JsonValue>;
};
export type DurableJobEvent = {
  id: string;
  createdAt: string;
  recordVersion: number;
  projectId: string;
  jobId: string;
  seq: number;
  event: string;
  data: JsonValue;
  occurredAt: string;
  metadata: Record<string, JsonValue>;
};

export class StoreBase {
  readonly pool: Pool;
  readonly artifactsDir: string;

  constructor(options: IsplayStoreOptions) {
    this.pool = new Pool({ connectionString: options.connectionString });
    this.artifactsDir = options.artifactsDir;
  }

  async migrate(): Promise<void> {
    await migrate(this.pool);
    await mkdir(this.artifactsDir, { recursive: true });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createDurableJob(input: {
    projectId: string;
    kind: DurableJob["kind"];
    resourceId: string;
    metadata?: Record<string, JsonValue>;
  }): Promise<DurableJob> {
    const job: DurableJob = {
      id: createId("job"),
      createdAt: nowIso(),
      recordVersion: 1,
      projectId: input.projectId,
      kind: input.kind,
      status: "queued",
      resourceId: input.resourceId,
      metadata: input.metadata ?? {}
    };
    await this.putProjection(job.id, job.projectId, undefined, "job", job.status, job);
    await this.appendDurableJobEvent(job.id, "job.queued", { kind: job.kind, resourceId: job.resourceId });
    return job;
  }

  async updateDurableJob(id: string, input: Partial<Pick<DurableJob, "status" | "graphileJobId" | "error" | "metadata">>): Promise<DurableJob> {
    const current = await this.getDurableJob(id);
    if (!current) throw new Error(`Job not found: ${id}`);
    const updated: DurableJob = {
      ...current,
      ...input,
      metadata: { ...current.metadata, ...(input.metadata ?? {}) }
    };
    await this.putProjection(updated.id, updated.projectId, undefined, "job", updated.status, updated);
    return updated;
  }

  async getDurableJob(id: string): Promise<DurableJob | undefined> {
    return this.getProjection(id, parseDurableJob);
  }

  async appendDurableJobEvent(jobId: string, event: string, data: JsonValue, metadata: Record<string, JsonValue> = {}): Promise<DurableJobEvent> {
    const job = await this.getDurableJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    const latest = await this.pool.query<{ seq: string }>(
      "SELECT data->>'seq' AS seq FROM projections WHERE kind = 'job_event' AND data->>'jobId' = $1 ORDER BY (data->>'seq')::int DESC LIMIT 1",
      [jobId]
    );
    const record: DurableJobEvent = {
      id: createId("event"),
      createdAt: nowIso(),
      recordVersion: 1,
      projectId: job.projectId,
      jobId,
      seq: latest.rows[0] ? Number(latest.rows[0].seq) + 1 : 0,
      event,
      data,
      occurredAt: nowIso(),
      metadata
    };
    await this.putProjection(record.id, record.projectId, undefined, "job_event", undefined, record);
    return record;
  }

  async listDurableJobEvents(jobId: string): Promise<DurableJobEvent[]> {
    const rows = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'job_event' AND data->>'jobId' = $1 ORDER BY (data->>'seq')::int ASC",
      [jobId]
    );
    return rows.rows.map((row) => parseDurableJobEvent(row.data));
  }

  protected async putProjection(
    id: string,
    projectId: string,
    runId: string | undefined,
    kind: string,
    status: string | undefined,
    data: unknown
  ): Promise<void> {
    await this.putProjectionOn(this.pool, id, projectId, runId, kind, status, data);
  }

  protected async putProjectionOn(
    client: Pick<PoolClient, "query">,
    id: string,
    projectId: string,
    runId: string | undefined,
    kind: string,
    status: string | undefined,
    data: unknown
  ): Promise<void> {
    await client.query(
      `INSERT INTO projections (id, project_id, run_id, kind, status, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = now()`,
      [id, projectId, runId ?? null, kind, status ?? null, JSON.stringify(data)]
    );
  }

  protected async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  protected async getProjection<T>(id: string, parser: (value: unknown) => T): Promise<T | undefined> {
    const result = await this.pool.query<{ data: unknown }>("SELECT data FROM projections WHERE id = $1", [id]);
    return result.rows[0] ? parser(result.rows[0].data) : undefined;
  }

  protected async listProjections<T>(runId: string, kind: string, parser: (value: unknown) => T): Promise<T[]> {
    const result = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE run_id = $1 AND kind = $2 ORDER BY created_at ASC",
      [runId, kind]
    );
    return result.rows.map((row) => parser(row.data));
  }

  protected async getData<T>(table: "projects" | "runs" | "artifacts", id: string, parser: (value: unknown) => T): Promise<T | undefined> {
    const result = await this.pool.query<{ data: unknown }>(`SELECT data FROM ${table} WHERE id = $1`, [id]);
    return result.rows[0] ? parser(result.rows[0].data) : undefined;
  }

  protected async deleteReplayDerived(replayId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM projections
       WHERE kind IN ('diff', 'metric', 'replay_event', 'effect')
       AND data->>'replayId' = $1`,
      [replayId]
    );
  }
}

function parseDurableJob(value: unknown): DurableJob {
  const record = objectRecord(value);
  return {
    id: stringField(record, "id"),
    createdAt: stringField(record, "createdAt"),
    recordVersion: numberField(record, "recordVersion", 1),
    projectId: stringField(record, "projectId"),
    kind: stringField(record, "kind") as DurableJob["kind"],
    status: stringField(record, "status") as DurableJobStatus,
    resourceId: stringField(record, "resourceId"),
    graphileJobId: optionalStringishField(record, "graphileJobId"),
    error: optionalStringField(record, "error"),
    metadata: metadataRecord(record.metadata)
  };
}

function parseDurableJobEvent(value: unknown): DurableJobEvent {
  const record = objectRecord(value);
  return {
    id: stringField(record, "id"),
    createdAt: stringField(record, "createdAt"),
    recordVersion: numberField(record, "recordVersion", 1),
    projectId: stringField(record, "projectId"),
    jobId: stringField(record, "jobId"),
    seq: numberField(record, "seq", 0),
    event: stringField(record, "event"),
    data: toJsonValue(record.data),
    occurredAt: stringField(record, "occurredAt"),
    metadata: metadataRecord(record.metadata)
  };
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object record.");
  return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new Error(`Expected ${key} to be a string.`);
  return value;
}

function optionalStringField(record: Record<string, unknown>, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] : undefined;
}

function numberField(record: Record<string, unknown>, key: string, fallback: number): number {
  return typeof record[key] === "number" ? record[key] : fallback;
}

function optionalStringishField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function metadataRecord(value: unknown): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? (toJsonValue(value) as Record<string, JsonValue>) : {};
}
