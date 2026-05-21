import type { Pool } from "pg";
import { createHash } from "node:crypto";

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('isplay:migrations'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS isplay_migrations (
        id TEXT PRIMARY KEY,
        checksum TEXT,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query("ALTER TABLE isplay_migrations ADD COLUMN IF NOT EXISTS checksum TEXT");
    const applied = await client.query<{ id: string; checksum: string | null }>("SELECT id, checksum FROM isplay_migrations");
    const appliedChecksums = new Map(applied.rows.map((row) => [row.id, row.checksum]));

    for (const migration of MIGRATIONS) {
      const checksum = migrationChecksum(migration.sql);
      const appliedChecksum = appliedChecksums.get(migration.id);
      if (appliedChecksum !== undefined) {
        if (appliedChecksum && appliedChecksum !== checksum) throw new Error(`Migration checksum mismatch for ${migration.id}.`);
        if (!appliedChecksum) await client.query("UPDATE isplay_migrations SET checksum = $2 WHERE id = $1", [migration.id, checksum]);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO isplay_migrations (id, checksum) VALUES ($1, $2)", [migration.id, checksum]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('isplay:migrations'))").catch(() => undefined);
    client.release();
  }
}

function migrationChecksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

const MIGRATIONS: Array<{ id: string; sql: string }> = [
  {
    id: "0001_foundation",
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        agent_id TEXT,
        name TEXT,
        status TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        ended_at TIMESTAMPTZ,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_runs_project_id ON runs(project_id);
      CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        seq INTEGER NOT NULL,
        type TEXT NOT NULL,
        ref_id TEXT,
        parent_event_id TEXT,
        occurred_at TIMESTAMPTZ NOT NULL,
        data JSONB NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(run_id, seq)
      );
      CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_data_gin ON events USING GIN (data);

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        object_key TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        redaction_state TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON artifacts(project_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON artifacts(run_id);

      CREATE TABLE IF NOT EXISTS projections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        status TEXT,
        ref_id TEXT,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_projections_kind ON projections(kind);
      CREATE INDEX IF NOT EXISTS idx_projections_project_kind ON projections(project_id, kind);
      CREATE INDEX IF NOT EXISTS idx_projections_run_kind ON projections(run_id, kind);
      CREATE INDEX IF NOT EXISTS idx_projections_data_gin ON projections USING GIN (data);
    `
  },
  {
    id: "0002_v03_record_shape",
    sql: `
      UPDATE projects
      SET data = jsonb_set(data, '{recordVersion}', '1'::jsonb, true)
      WHERE NOT (data ? 'recordVersion');

      UPDATE runs
      SET data = jsonb_set(data, '{recordVersion}', '1'::jsonb, true)
      WHERE NOT (data ? 'recordVersion');

      UPDATE projections
      SET data = jsonb_set(data, '{recordVersion}', '1'::jsonb, true)
      WHERE NOT (data ? 'recordVersion');

      UPDATE projections
      SET data = (data - 'runId') || jsonb_build_object('baseRunId', data->'runId')
      WHERE kind IN ('replay', 'replay_attempt', 'effect')
        AND data ? 'runId'
        AND NOT (data ? 'baseRunId');

      UPDATE projections
      SET data = (data - 'targetId') || jsonb_build_object(
        'target',
        jsonb_build_object('refId', data->>'targetId'),
        'operations',
        COALESCE(data->'operations', '[]'::jsonb)
      )
      WHERE kind = 'intervention'
        AND data ? 'targetId'
        AND NOT (data ? 'target');
    `
  }
];
