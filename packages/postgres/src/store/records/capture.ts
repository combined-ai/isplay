import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ArtifactSchema,
  CheckpointSchema,
  createId,
  ModelCallSchema,
  nowIso,
  stableHash,
  ToolExecutionSchema,
  ToolProposalSchema,
  toJsonValue,
  type Artifact,
  type Checkpoint,
  type CreateArtifactInput,
  type CreateCheckpointInput,
  type JsonValue,
  type ModelCall,
  type ToolExecution,
  type ToolProposal
} from "@isplay/core";
import { artifactObjectKey, artifactPath } from "../infrastructure/artifact-path.js";
import { ProjectRunStore } from "./project-run.js";

export class CaptureStore extends ProjectRunStore {
  async createArtifact(input: CreateArtifactInput): Promise<Artifact> {
    await this.assertArtifactScope(input);
    const payload = toJsonValue(input.payload);
    const bytes = Buffer.from(JSON.stringify(payload, null, 2));
    const id = createId("artifact");
    const objectKey = artifactObjectKey(input.projectId, input.runId, id);
    const filePath = artifactPath(this.artifactsDir, objectKey);
    const record = artifactRecord(input, id, objectKey, bytes);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
    try {
      await this.pool.query(
        "INSERT INTO artifacts (id, project_id, run_id, kind, object_key, sha256, size_bytes, mime_type, redaction_state, data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [record.id, record.projectId, record.runId ?? null, record.kind, record.objectKey, record.sha256, record.sizeBytes, record.mimeType, record.redactionState, JSON.stringify(record)]
      );
    } catch (error) {
      await rm(filePath, { force: true }).catch(() => undefined);
      throw error;
    }
    return record;
  }

  private async assertArtifactScope(input: CreateArtifactInput): Promise<void> {
    if (!input.runId) {
      if (!(await this.getProject(input.projectId))) throw new Error(`Project not found: ${input.projectId}`);
      return;
    }
    const run = await this.getRun(input.runId);
    if (!run) throw new Error(`Run not found: ${input.runId}`);
    if (run.projectId !== input.projectId) throw new Error("Artifact projectId and run projectId differ");
  }

  async getArtifact(id: string): Promise<(Artifact & { payload?: JsonValue }) | undefined> {
    const artifact = await this.getData("artifacts", id, ArtifactSchema.parse);
    if (!artifact) return undefined;
    const filePath = artifactPath(this.artifactsDir, artifact.objectKey);
    const file = await readFile(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") throw new Error(`Artifact payload missing: ${artifact.id}`);
      throw error;
    });
    const actualHash = createHash("sha256").update(file).digest("hex");
    if (actualHash !== artifact.sha256) throw new Error(`Artifact payload corrupt: ${artifact.id}`);
    return { ...artifact, payload: JSON.parse(file.toString("utf8")) as JsonValue };
  }

  async createCheckpoint(input: CreateCheckpointInput): Promise<Checkpoint> {
    const artifact = await this.createArtifact({ projectId: input.projectId, runId: input.runId, kind: "checkpoint.state", payload: input.state, metadata: { checkpointName: input.name } });
    const record = CheckpointSchema.parse({
      id: createId("checkpoint"),
      createdAt: nowIso(),
      projectId: input.projectId,
      runId: input.runId,
      name: input.name,
      parentEventId: input.parentEventId,
      stateArtifactId: artifact.id,
      stateHash: stableHash(input.state),
      schemaName: input.schemaName,
      schemaVersion: input.schemaVersion,
      codeVersion: input.codeVersion,
      packageVersions: input.packageVersions ?? {},
      metadata: input.metadata ?? {}
    });
    await this.putProjection(record.id, record.projectId, record.runId, "checkpoint", undefined, record);
    return record;
  }

  async listCheckpoints(runId: string): Promise<Checkpoint[]> {
    return this.listProjections(runId, "checkpoint", CheckpointSchema.parse);
  }

  async putModelCall(record: ModelCall): Promise<ModelCall> {
    await this.putProjection(record.id, record.projectId, record.runId, "model_call", record.status, ModelCallSchema.parse(record));
    return record;
  }

  async putToolProposal(record: ToolProposal): Promise<ToolProposal> {
    await this.putProjection(record.id, record.projectId, record.runId, "tool_proposal", undefined, ToolProposalSchema.parse(record));
    return record;
  }

  async putToolExecution(record: ToolExecution): Promise<ToolExecution> {
    await this.putProjection(record.id, record.projectId, record.runId, "tool_execution", record.status, ToolExecutionSchema.parse(record));
    return record;
  }
}

function artifactRecord(input: CreateArtifactInput, id: string, objectKey: string, bytes: Buffer): Artifact {
  return ArtifactSchema.parse({
    id,
    createdAt: nowIso(),
    projectId: input.projectId,
    runId: input.runId,
    kind: input.kind,
    objectKey,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength,
    mimeType: input.mimeType ?? "application/json",
    redactionState: input.redactionState ?? "raw",
    metadata: input.metadata ?? {}
  });
}
