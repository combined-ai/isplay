import {
  BranchSchema,
  createId,
  FixtureRequirementSchema,
  InterventionSchema,
  nowIso,
  ReplaySchema,
  stableHash,
  ToolFixtureSchema,
  type Branch,
  type CreateBranchInput,
  type CreateInterventionInput,
  type CreateReplayInput,
  type CreateToolFixtureInput,
  type FixtureRequirement,
  type Intervention,
  type Replay,
  type ToolFixture
} from "@isplay/core";
import { CaptureStore } from "../records/capture.js";

export class ExperimentStore extends CaptureStore {
  async createBranch(input: CreateBranchInput): Promise<Branch> {
    const run = await this.getRun(input.baseRunId);
    if (!run) throw new Error(`Run not found: ${input.baseRunId}`);
    if (run.projectId !== input.projectId) throw new Error("Branch projectId and run projectId differ");
    const checkpoint = (await this.listCheckpoints(input.baseRunId)).find((item) => item.id === input.checkpointId);
    if (!checkpoint) throw new Error(`Checkpoint not found: ${input.checkpointId}`);
    const record = BranchSchema.parse({
      id: createId("branch"),
      createdAt: nowIso(),
      projectId: input.projectId,
      baseRunId: input.baseRunId,
      checkpointId: input.checkpointId,
      parentBranchId: input.parentBranchId,
      name: input.name,
      replayPolicy: input.replayPolicy ?? { model: "recorded-only", tool: "pause-for-fixture" },
      metadata: input.metadata ?? {}
    });
    await this.putProjection(record.id, record.projectId, record.baseRunId, "branch", undefined, record);
    return record;
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    return this.getProjection(id, BranchSchema.parse);
  }

  async createIntervention(input: CreateInterventionInput): Promise<Intervention> {
    const branch = await this.getBranch(input.branchId);
    if (!branch) throw new Error(`Branch not found: ${input.branchId}`);
    if (branch.projectId !== input.projectId) throw new Error("Intervention projectId and branch projectId differ");
    const record = InterventionSchema.parse({ id: createId("intervention"), createdAt: nowIso(), ...input, metadata: input.metadata ?? {} });
    await this.putProjection(record.id, record.projectId, branch.baseRunId, "intervention", undefined, record);
    return record;
  }

  async listInterventions(branchId: string): Promise<Intervention[]> {
    const result = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'intervention' AND data->>'branchId' = $1 ORDER BY created_at ASC",
      [branchId]
    );
    return result.rows.map((row) => parseInterventionRecord(row.data));
  }

  async createReplay(input: CreateReplayInput): Promise<Replay> {
    const run = await this.getRun(input.baseRunId);
    if (!run) throw new Error(`Run not found: ${input.baseRunId}`);
    if (run.projectId !== input.projectId) throw new Error("Replay projectId and run projectId differ");
    if (input.branchId) {
      const branch = await this.getBranch(input.branchId);
      if (!branch) throw new Error(`Branch not found: ${input.branchId}`);
      if (branch.projectId !== input.projectId) throw new Error("Replay projectId and branch projectId differ");
      if (branch.baseRunId !== input.baseRunId) throw new Error("Replay baseRunId and branch baseRunId differ");
    }
    const record = ReplaySchema.parse({
      id: createId("replay"),
      createdAt: nowIso(),
      projectId: input.projectId,
      baseRunId: input.baseRunId,
      branchId: input.branchId,
      experimentId: input.experimentId,
      armId: input.armId,
      trialIndex: input.trialIndex,
      status: "queued",
      policy: input.policy ?? { model: "recorded-only", tool: "pause-for-fixture" },
      metadata: input.metadata ?? {}
    });
    await this.putProjection(record.id, record.projectId, record.baseRunId, "replay", record.status, record);
    return record;
  }

  async getReplay(id: string): Promise<Replay | undefined> {
    return this.getProjection(id, parseReplayRecord);
  }

  async updateReplay(record: Replay): Promise<Replay> {
    const current = await this.getReplay(record.id);
    if (current) validateReplayTransition(current, record);
    await this.putProjection(record.id, record.projectId, record.baseRunId, "replay", record.status, record);
    return record;
  }

  async createToolFixture(input: CreateToolFixtureInput): Promise<ToolFixture> {
    await this.assertFixtureScope(input);
    const artifact = await this.createArtifact({ projectId: input.projectId, kind: "tool.fixture.output", payload: input.output, metadata: { toolName: input.toolName } });
    const record = ToolFixtureSchema.parse({
      id: createId("fixture"),
      createdAt: nowIso(),
      ...input,
      outputArtifactId: artifact.id,
      outputHash: stableHash(input.output),
      sideEffectClass: input.sideEffectClass ?? "unknown",
      metadata: input.metadata ?? {}
    });
    await this.putProjection(record.id, record.projectId, undefined, "tool_fixture", undefined, record);
    await this.satisfyMatchingRequirements(record);
    return record;
  }

  private async assertFixtureScope(input: CreateToolFixtureInput): Promise<void> {
    if (input.replayId) {
      const replay = await this.getReplay(input.replayId);
      if (!replay) throw new Error(`Replay not found: ${input.replayId}`);
      if (replay.projectId !== input.projectId) throw new Error("Fixture projectId and replay projectId differ");
      if (input.branchId && replay.branchId && input.branchId !== replay.branchId) throw new Error("Fixture branchId and replay branchId differ");
    }
    if (input.branchId) {
      const branch = await this.getBranch(input.branchId);
      if (!branch) throw new Error(`Branch not found: ${input.branchId}`);
      if (branch.projectId !== input.projectId) throw new Error("Fixture projectId and branch projectId differ");
    }
  }

  async listToolFixtures(input: { projectId: string; replayId?: string; branchId?: string }): Promise<ToolFixture[]> {
    const result = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE project_id = $1 AND kind = 'tool_fixture' ORDER BY created_at ASC",
      [input.projectId]
    );
    return result.rows.map((row) => ToolFixtureSchema.parse(row.data)).filter((fixture) => fixtureApplies(fixture, input.replayId, input.branchId));
  }

  async listFixtureRequirements(replayId: string): Promise<FixtureRequirement[]> {
    const result = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'fixture_requirement' AND data->>'replayId' = $1 ORDER BY created_at ASC",
      [replayId]
    );
    return result.rows.map((row) => FixtureRequirementSchema.parse(row.data));
  }

  private async listBranchFixtureRequirements(branchId: string): Promise<FixtureRequirement[]> {
    const result = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'fixture_requirement' AND data->>'branchId' = $1 ORDER BY created_at ASC",
      [branchId]
    );
    return result.rows.map((row) => FixtureRequirementSchema.parse(row.data));
  }

  async putFixtureRequirement(record: FixtureRequirement): Promise<FixtureRequirement> {
    await this.putProjection(record.id, record.projectId, undefined, "fixture_requirement", record.status, record);
    return record;
  }

  private async satisfyMatchingRequirements(fixture: ToolFixture): Promise<void> {
    const requirements = fixture.replayId ? await this.listFixtureRequirements(fixture.replayId) : fixture.branchId ? await this.listBranchFixtureRequirements(fixture.branchId) : [];
    for (const requirement of requirements) {
      if (requirement.status !== "open" || !fixtureMatchesRequirement(fixture, requirement)) continue;
      await this.putFixtureRequirement({ ...requirement, status: "satisfied", satisfiedByFixtureId: fixture.id });
    }
  }
}

function parseReplayRecord(value: unknown): Replay {
  const record = normalizeLegacyObject(value);
  if (!record.baseRunId && record.runId) {
    record.baseRunId = record.runId;
    delete record.runId;
  }
  return ReplaySchema.parse(record);
}

function parseInterventionRecord(value: unknown): Intervention {
  const record = normalizeLegacyObject(value);
  if (!record.target && record.targetId) {
    record.target = { refId: String(record.targetId) };
    delete record.targetId;
  }
  if (!record.operations) record.operations = [];
  return InterventionSchema.parse(record);
}

function normalizeLegacyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object record.");
  return { ...(value as Record<string, unknown>) };
}

function validateReplayTransition(current: Replay, next: Replay): void {
  if ((current.status === "ok" || current.status === "error") && next.status === "running") {
    throw new Error(`Cannot transition terminal replay ${current.id} back to running.`);
  }
  if ((next.status === "ok" || next.status === "error" || next.status === "paused") && !next.endedAt) {
    throw new Error(`Replay ${next.id} cannot enter status ${next.status} without endedAt.`);
  }
}

function fixtureApplies(fixture: ToolFixture, replayId?: string, branchId?: string): boolean {
  return (!fixture.replayId || fixture.replayId === replayId) && (!fixture.branchId || fixture.branchId === branchId);
}

function fixtureMatchesRequirement(fixture: ToolFixture, requirement: FixtureRequirement): boolean {
  const matcher = fixture.matcher && typeof fixture.matcher === "object" && !Array.isArray(fixture.matcher) ? fixture.matcher : {};
  return fixture.toolName === requirement.toolName && (matcher as Record<string, unknown>).argsHash === requirement.argsHash;
}
