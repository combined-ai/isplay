import {
  EffectCandidateSchema,
  FixtureUseSchema,
  ReplayAttemptSchema,
  ReplayStepSchema,
  type EffectCandidate,
  type FixtureRequirement,
  type FixtureUse,
  type ReplayAttempt,
  type ReplayStep
} from "@isplay/core";
import { ExperimentPlanStore } from "../experiments/plans.js";

export class ReplayAttemptStore extends ExperimentPlanStore {
  async putReplayAttempt(attempt: ReplayAttempt): Promise<ReplayAttempt> {
    const record = ReplayAttemptSchema.parse(attempt);
    await this.putProjection(record.id, record.projectId, record.runId, "replay_attempt", record.status, record);
    return record;
  }

  async listReplayAttempts(replayId: string): Promise<ReplayAttempt[]> {
    const rows = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'replay_attempt' AND data->>'replayId' = $1 ORDER BY created_at ASC",
      [replayId]
    );
    return rows.rows.map((row) => ReplayAttemptSchema.parse(row.data));
  }

  async putReplayStep(step: ReplayStep): Promise<ReplayStep> {
    const record = ReplayStepSchema.parse(step);
    await this.putProjection(record.id, record.projectId, undefined, "replay_step", undefined, record);
    return record;
  }

  async listReplaySteps(attemptId: string): Promise<ReplayStep[]> {
    const rows = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'replay_step' AND data->>'attemptId' = $1 ORDER BY (data->>'seq')::int ASC",
      [attemptId]
    );
    return rows.rows.map((row) => ReplayStepSchema.parse(row.data));
  }

  async putFixtureUse(use: FixtureUse): Promise<FixtureUse> {
    const record = FixtureUseSchema.parse(use);
    await this.putProjection(record.id, record.projectId, undefined, "fixture_use", undefined, record);
    return record;
  }

  async listFixtureUses(replayId: string): Promise<FixtureUse[]> {
    const rows = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'fixture_use' AND data->>'replayId' = $1 ORDER BY created_at ASC",
      [replayId]
    );
    return rows.rows.map((row) => FixtureUseSchema.parse(row.data));
  }

  async putEffectCandidate(effect: EffectCandidate): Promise<EffectCandidate> {
    const record = EffectCandidateSchema.parse(effect);
    await this.putProjection(record.id, record.projectId, record.baseRunId, "effect", record.status, record);
    return record;
  }

  async listReplayEffects(replayId: string): Promise<EffectCandidate[]> {
    const rows = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'effect' AND data->>'replayId' = $1 ORDER BY (data->>'rank')::int ASC",
      [replayId]
    );
    return rows.rows.map((row) => EffectCandidateSchema.parse(row.data));
  }

  async listExperimentEffects(experimentId: string): Promise<EffectCandidate[]> {
    const rows = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'effect' AND data->>'experimentId' = $1 ORDER BY (data->>'rank')::int ASC",
      [experimentId]
    );
    return rows.rows.map((row) => EffectCandidateSchema.parse(row.data));
  }

  async listExperimentRequirements(experimentId: string): Promise<FixtureRequirement[]> {
    const nested = await Promise.all((await this.listExperimentReplays(experimentId)).map((replay) => this.listFixtureRequirements(replay.id)));
    return nested.flat();
  }
}
