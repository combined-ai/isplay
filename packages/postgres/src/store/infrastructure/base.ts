import { Pool } from "pg";
import { mkdir } from "node:fs/promises";
import { migrate } from "../../migrations.js";

export type IsplayStoreOptions = {
  connectionString: string;
  artifactsDir: string;
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

  protected async putProjection(
    id: string,
    projectId: string,
    runId: string | undefined,
    kind: string,
    status: string | undefined,
    data: unknown
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO projections (id, project_id, run_id, kind, status, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = now()`,
      [id, projectId, runId ?? null, kind, status ?? null, JSON.stringify(data)]
    );
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
       WHERE kind IN ('diff', 'metric', 'replay_event', 'replay_attempt', 'replay_step', 'fixture_use', 'effect')
       AND data->>'replayId' = $1`,
      [replayId]
    );
  }
}
