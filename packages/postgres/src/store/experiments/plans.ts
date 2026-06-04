import {
  BranchSchema,
  createId,
  ExperimentArmSchema,
  ExperimentSchema,
  HypothesisSchema,
  InterventionSchema,
  nowIso,
  toJsonValue,
  type Branch,
  type CreateHypothesisBatchInput,
  type Experiment,
  type ExperimentArm,
  type Hypothesis,
  type Intervention,
  type InterventionSpec,
  type Replay
} from "@isplay/core";
import type { PoolClient } from "pg";
import { ContextReadStore } from "../context/context-read.js";

export type CreatedExperimentPlan = {
  experiment: Experiment;
  hypotheses: Hypothesis[];
  arms: ExperimentArm[];
};

type PlanInput = CreateHypothesisBatchInput & { status?: "draft" | "queued" };

export class ExperimentPlanStore extends ContextReadStore {
  async createExperimentPlan(input: PlanInput): Promise<CreatedExperimentPlan> {
    return this.withTransaction(async (client) => {
      const experiment = ExperimentSchema.parse({
        id: createId("experiment"),
        createdAt: nowIso(),
        projectId: input.projectId,
        name: input.name,
        baseRunIds: input.baseRunIds,
        checkpointSelector: input.checkpointSelector,
        trialPlan: input.trialPlan,
        policy: input.policy,
        validityGates: input.validityGates,
        status: input.status ?? "queued",
        metadata: input.metadata ?? {}
      });
      await this.putProjectionOn(client, experiment.id, experiment.projectId, undefined, "experiment", experiment.status, experiment);
      const hypotheses = await this.materializeHypotheses(input, experiment.id, client);
      const arms = await this.materializeArms(input, experiment, hypotheses, client);
      return { experiment, hypotheses, arms };
    });
  }

  async getExperiment(id: string): Promise<Experiment | undefined> {
    return this.getProjection(id, ExperimentSchema.parse);
  }

  async updateExperiment(experiment: Experiment): Promise<Experiment> {
    const current = await this.getExperiment(experiment.id);
    if (current) validateExperimentTransition(current, experiment);
    await this.putProjection(experiment.id, experiment.projectId, undefined, "experiment", experiment.status, experiment);
    return experiment;
  }

  async listHypotheses(experimentId: string): Promise<Hypothesis[]> {
    const rows = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'hypothesis' AND data->>'experimentId' = $1 ORDER BY created_at ASC",
      [experimentId]
    );
    return rows.rows.map((row) => HypothesisSchema.parse(row.data));
  }

  async listExperimentArms(experimentId: string): Promise<ExperimentArm[]> {
    const rows = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'experiment_arm' AND data->>'experimentId' = $1 ORDER BY created_at ASC",
      [experimentId]
    );
    return rows.rows.map((row) => ExperimentArmSchema.parse(row.data));
  }

  async updateExperimentArm(arm: ExperimentArm): Promise<ExperimentArm> {
    await this.putProjection(arm.id, arm.projectId, arm.baseRunId, "experiment_arm", arm.status, arm);
    return arm;
  }

  async addReplayToArm(arm: ExperimentArm, replay: Replay): Promise<ExperimentArm> {
    return this.updateExperimentArm({
      ...arm,
      replayIds: Array.from(new Set([...arm.replayIds, replay.id])),
      status: replay.status === "ok" ? "ok" : replay.status === "error" ? "error" : replay.status === "paused" ? "paused" : "running"
    });
  }

  async listExperimentReplays(experimentId: string): Promise<Replay[]> {
    const arms = await this.listExperimentArms(experimentId);
    const replays = await Promise.all(arms.flatMap((arm) => arm.replayIds).map((id) => this.getReplay(id)));
    return replays.filter((replay): replay is Replay => Boolean(replay));
  }

  private async materializeHypotheses(input: PlanInput, experimentId: string, client: PoolClient): Promise<Hypothesis[]> {
    const hypotheses = input.hypotheses.map((hypothesis) =>
      HypothesisSchema.parse({ id: createId("hypothesis"), createdAt: nowIso(), projectId: input.projectId, experimentId, metadata: {}, ...hypothesis })
    );
    for (const hypothesis of hypotheses) await this.putProjectionOn(client, hypothesis.id, hypothesis.projectId, undefined, "hypothesis", undefined, hypothesis);
    return hypotheses;
  }

  private async materializeArms(input: PlanInput, experiment: Experiment, hypotheses: Hypothesis[], client: PoolClient): Promise<ExperimentArm[]> {
    const arms: ExperimentArm[] = [];
    for (const runId of input.baseRunIds) {
      const run = await this.getRun(runId);
      if (!run) throw new Error(`Run not found: ${runId}`);
      if (run.projectId !== input.projectId) throw new Error("Experiment projectId and run projectId differ");
      const checkpointId = await this.selectCheckpoint(runId, input.checkpointSelector);
      for (const hypothesis of hypotheses) {
        const branch = await this.createExperimentBranch(input, runId, checkpointId, hypothesis, client);
        for (const spec of hypothesis.interventions) await this.createInterventionFromSpec(input.projectId, runId, branch.id, spec, client);
        const arm = ExperimentArmSchema.parse({ id: createId("arm"), createdAt: nowIso(), projectId: input.projectId, experimentId: experiment.id, hypothesisId: hypothesis.id, baseRunId: runId, branchId: branch.id, replayIds: [], status: "queued", metadata: {} });
        await this.putProjectionOn(client, arm.id, arm.projectId, arm.baseRunId, "experiment_arm", arm.status, arm);
        arms.push(arm);
      }
    }
    return arms;
  }

  private async createExperimentBranch(input: PlanInput, runId: string, checkpointId: string, hypothesis: Hypothesis, client: PoolClient): Promise<Branch> {
    const record = BranchSchema.parse({
      id: createId("branch"),
      createdAt: nowIso(),
      projectId: input.projectId,
      baseRunId: runId,
      checkpointId,
      name: hypothesis.statement.slice(0, 80),
      replayPolicy: input.policy,
      metadata: {}
    });
    await this.putProjectionOn(client, record.id, record.projectId, record.baseRunId, "branch", undefined, record);
    return record;
  }

  private async selectCheckpoint(runId: string, selector: PlanInput["checkpointSelector"]): Promise<string> {
    const checkpoints = await this.listCheckpoints(runId);
    const selected =
      selector.kind === "latest"
        ? checkpoints.at(-1)
        : selector.kind === "name"
          ? checkpoints.find((checkpoint) => checkpoint.name === selector.value)
          : checkpoints[0];
    if (!selected) throw new Error(`Checkpoint not found for run ${runId} selector ${selector.kind}`);
    return selected.id;
  }

  private async createInterventionFromSpec(projectId: string, runId: string, branchId: string, spec: InterventionSpec, client: PoolClient): Promise<Intervention> {
    await this.assertExpectedHash(runId, spec);
    const record = InterventionSchema.parse({
      id: createId("intervention"),
      createdAt: nowIso(),
      projectId,
      branchId,
      kind: spec.kind,
      target: spec.target,
      operations: spec.operations,
      description: spec.description,
      patch: spec.patch,
      expectedBaseHash: spec.expectedBaseHash,
      metadata: {}
    });
    await this.putProjectionOn(client, record.id, record.projectId, runId, "intervention", undefined, record);
    return record;
  }

  private async assertExpectedHash(runId: string, spec: InterventionSpec): Promise<void> {
    if (!spec.expectedBaseHash) return;
    const targets = (await this.getRunContextInventory(runId)).items.filter((item) => targetMatches(item, spec));
    if (!targets.length) throw new Error("Intervention target not found for expected base hash");
    if (!targets.some((target) => target.contentHash === spec.expectedBaseHash)) throw new Error("Stale intervention target: expectedBaseHash does not match current context");
  }
}

function validateExperimentTransition(current: Experiment, next: Experiment): void {
  if ((current.status === "completed" || current.status === "invalid") && next.status === "running") {
    throw new Error(`Cannot transition terminal experiment ${current.id} back to running.`);
  }
  if ((next.status === "completed" || next.status === "invalid" || next.status === "paused") && !next.endedAt) {
    throw new Error(`Experiment ${next.id} cannot enter status ${next.status} without endedAt.`);
  }
}

function targetMatches(item: { id: string; path: string; sourceEventId?: string; contentArtifactId?: string; modelCallId?: string }, spec: InterventionSpec): boolean {
  return Boolean(
    [spec.target.contextItemId, spec.target.contextPath, spec.target.refId, spec.target.eventId, spec.target.artifactId, spec.target.modelCallId, spec.target.jsonPointer].filter(Boolean).some((value) => [item.id, item.sourceEventId, item.contentArtifactId, item.modelCallId, item.path].includes(value))
  );
}
