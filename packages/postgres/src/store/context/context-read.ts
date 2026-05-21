import {
  ContextInventorySchema,
  ContextItemSchema,
  stableHash,
  type Catalog,
  type ContextInventory,
  type ContextItem,
  type ContextSearchInput,
  type JsonValue
} from "@isplay/core";
import { contextFromEvents } from "./context-events.js";
import { ResultStore } from "../replay/results.js";

type ProjectionRow = { id: string; kind: string; data: unknown };
type ArtifactPayload = { id: string; kind: string; redactionState: string; payload?: JsonValue };

export class ContextReadStore extends ResultStore {
  async getRunContextInventory(runId: string): Promise<ContextInventory> {
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    const events = await this.getEvents(runId);
    const projections = await this.runProjections(runId);
    const artifacts = await this.runArtifacts(run.projectId, runId);
    const items = [
      ...contextFromModelCalls(run.projectId, runId, projections, artifacts),
      ...contextFromTools(run.projectId, runId, projections, artifacts),
      ...contextFromCheckpoints(run.projectId, runId, projections),
      ...contextFromEvents(run.projectId, runId, events)
    ];
    return ContextInventorySchema.parse({ projectId: run.projectId, runId, items, summary: summarize(items), metadata: {} });
  }

  async getModelCallContextInventory(modelCallId: string): Promise<ContextInventory> {
    const row = await this.projection(modelCallId);
    const data = (row?.data ?? {}) as { projectId?: string; runId?: string };
    if (!data.runId || !data.projectId) throw new Error(`Model call not found: ${modelCallId}`);
    const inventory = await this.getRunContextInventory(data.runId);
    return { ...inventory, modelCallId, items: inventory.items.filter((item) => item.modelCallId === modelCallId) };
  }

  async getCheckpointContextInventory(checkpointId: string): Promise<ContextInventory> {
    const row = await this.projection(checkpointId);
    const data = (row?.data ?? {}) as { projectId?: string; runId?: string };
    if (!data.runId || !data.projectId) throw new Error(`Checkpoint not found: ${checkpointId}`);
    const inventory = await this.getRunContextInventory(data.runId);
    return { ...inventory, checkpointId, items: inventory.items.filter((item) => item.checkpointId === checkpointId) };
  }

  async searchContext(input: ContextSearchInput): Promise<ContextItem[]> {
    const runs = input.runId ? [await this.getRun(input.runId)] : await this.listRuns(input.projectId);
    const all = (await Promise.all(runs.filter(Boolean).map((run) => this.getRunContextInventory(run!.id)))).flatMap((inventory) => inventory.items);
    return all
      .filter((item) => !input.kinds?.length || input.kinds.includes(item.kind))
      .filter((item) => !input.query || JSON.stringify(item).toLowerCase().includes(input.query.toLowerCase()))
      .slice(input.offset, input.offset + input.limit);
  }

  async getProjectCatalog(projectId: string): Promise<Catalog> {
    const runs = await this.listRuns(projectId);
    const projections = await this.projectProjections(projectId);
    return catalog(projectId, undefined, runs.length, projections);
  }

  async getRunCatalog(runId: string): Promise<Catalog> {
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    const projections = await this.runProjections(runId);
    return catalog(run.projectId, runId, 1, projections);
  }

  private async projection(id: string): Promise<ProjectionRow | undefined> {
    return (await this.pool.query<ProjectionRow>("SELECT id, kind, data FROM projections WHERE id = $1", [id])).rows[0];
  }

  private async projectProjections(projectId: string): Promise<ProjectionRow[]> {
    return (await this.pool.query<ProjectionRow>("SELECT id, kind, data FROM projections WHERE project_id = $1", [projectId])).rows;
  }

  private async runProjections(runId: string): Promise<ProjectionRow[]> {
    return (await this.pool.query<ProjectionRow>("SELECT id, kind, data FROM projections WHERE run_id = $1", [runId])).rows;
  }

  private async runArtifacts(projectId: string, runId: string): Promise<ArtifactPayload[]> {
    const rows = (await this.pool.query<{ id: string }>("SELECT id FROM artifacts WHERE project_id = $1 AND run_id = $2", [projectId, runId])).rows;
    return Promise.all(
      rows.map(async (row) => {
        const artifact = await this.getArtifact(row.id);
        return {
          id: row.id,
          kind: artifact?.kind ?? "unknown",
          redactionState: artifact?.redactionState ?? "metadata_only",
          payload: artifact?.payload
        };
      })
    );
  }
}

function contextFromModelCalls(projectId: string, runId: string, rows: ProjectionRow[], artifacts: ArtifactPayload[]): ContextItem[] {
  return rows.filter((row) => row.kind === "model_call").flatMap((row) => modelContext(projectId, runId, row.data as Record<string, JsonValue>, artifacts));
}

function modelContext(projectId: string, runId: string, model: Record<string, JsonValue>, artifacts: ArtifactPayload[]): ContextItem[] {
  const settings = model.settings && typeof model.settings === "object" ? (model.settings as Record<string, JsonValue>) : {};
  const artifact = artifacts.find((item) => item.id === model.requestArtifactId);
  const requestItems = artifact ? requestContext(projectId, runId, String(model.id), artifact) : [];
  return [
    ...Object.entries(settings).map(([key, value]) => item(projectId, runId, "model_setting", `model.${key}`, value, { modelCallId: String(model.id) })),
    ...requestItems
  ];
}

function requestContext(projectId: string, runId: string, modelCallId: string, artifact: ArtifactPayload): ContextItem[] {
  const payload = artifactPayload(artifact);
  const items: ContextItem[] = [];
  if (typeof payload.prompt === "string") items.push(item(projectId, runId, "user_message", "request.prompt", payload.prompt, { modelCallId, contentArtifactId: artifact.id }));
  if (typeof payload.system === "string") items.push(item(projectId, runId, "system_message", "request.system", payload.system, { modelCallId, contentArtifactId: artifact.id }));
  if (Array.isArray(payload.messages)) payload.messages.forEach((message, index) => items.push(messageItem(projectId, runId, modelCallId, artifact.id, message, index)));
  for (const key of ["retrieval", "retrievals", "context", "memory", "memories"]) {
    if (Array.isArray(payload[key])) payload[key].forEach((entry, index) => items.push(item(projectId, runId, key.startsWith("memory") ? "memory_item" : "retrieval_chunk", `request.${key}.${index}`, entry, { modelCallId, contentArtifactId: artifact.id })));
  }
  if (payload.tools || payload.toolDefinitions) items.push(item(projectId, runId, "tool_schema", "request.tools", payload.tools ?? payload.toolDefinitions, { modelCallId, contentArtifactId: artifact.id }));
  return items;
}

function contextFromTools(projectId: string, runId: string, rows: ProjectionRow[], artifacts: ArtifactPayload[]): ContextItem[] {
  return rows
    .filter((row) => row.kind === "tool_proposal" || row.kind === "tool_execution")
    .flatMap((row) => {
      const data = row.data as Record<string, JsonValue>;
      const toolName = typeof data.toolName === "string" ? data.toolName : "unknown_tool";
      const metadata = toolMetadata(data);
      const items = [item(projectId, runId, row.kind === "tool_execution" ? "tool_result" : "tool_schema", `${row.kind}.${toolName}.${row.id}`, data, { sourceEventId: row.id, metadata })];
      const argsArtifact = typeof data.argsArtifactId === "string" ? artifacts.find((artifact) => artifact.id === data.argsArtifactId) : undefined;
      const resultArtifact = typeof data.resultArtifactId === "string" ? artifacts.find((artifact) => artifact.id === data.resultArtifactId) : undefined;
      if (argsArtifact?.payload !== undefined) items.push(item(projectId, runId, "tool_argument", `${row.kind}.${toolName}.${row.id}.args`, argsArtifact.payload, { sourceEventId: row.id, contentArtifactId: argsArtifact.id, metadata }));
      if (resultArtifact?.payload !== undefined) items.push(item(projectId, runId, "tool_result", `${row.kind}.${toolName}.${row.id}.result`, resultArtifact.payload, { sourceEventId: row.id, contentArtifactId: resultArtifact.id, metadata }));
      return items;
    });
}

function toolMetadata(data: Record<string, JsonValue>): Record<string, JsonValue> {
  return {
    ...(typeof data.toolName === "string" ? { toolName: data.toolName } : {}),
    ...(typeof data.toolCallId === "string" ? { toolCallId: data.toolCallId } : {}),
    ...(typeof data.proposalId === "string" ? { proposalId: data.proposalId } : {}),
    ...(typeof data.sideEffectClass === "string" ? { sideEffectClass: data.sideEffectClass } : {}),
    ...(typeof data.status === "string" ? { status: data.status } : {})
  };
}

function contextFromCheckpoints(projectId: string, runId: string, rows: ProjectionRow[]): ContextItem[] {
  return rows.filter((row) => row.kind === "checkpoint").map((row) => item(projectId, runId, "state_field", `checkpoint.${row.id}`, row.data as JsonValue, { checkpointId: row.id }));
}

function messageItem(projectId: string, runId: string, modelCallId: string, artifactId: string, message: unknown, ordinal: number): ContextItem {
  const role = message && typeof message === "object" && "role" in message ? String((message as { role?: unknown }).role) : "user";
  const kind = role === "system" ? "system_message" : role === "developer" ? "developer_message" : role === "assistant" ? "assistant_message" : "user_message";
  return item(projectId, runId, kind, `request.messages.${ordinal}`, message as JsonValue, { modelCallId, contentArtifactId: artifactId, ordinal });
}

function item(projectId: string, runId: string, kind: ContextItem["kind"], path: string, value: JsonValue, extra: Partial<ContextItem> = {}): ContextItem {
  const contentHash = stableHash(value);
  const identityHash = stableHash({ projectId, runId, kind, path, contentHash, modelCallId: extra.modelCallId, sourceEventId: extra.sourceEventId, contentArtifactId: extra.contentArtifactId, checkpointId: extra.checkpointId, ordinal: extra.ordinal });
  return ContextItemSchema.parse({ id: `context_${identityHash.slice(0, 32)}`, createdAt: new Date(0).toISOString(), projectId, runId, kind, path, contentHash, provenance: "captured", visibility: kind === "state_field" ? "state_only" : "model_visible", redactionState: "raw", metadata: {}, ...extra });
}

function artifactPayload(artifact: ArtifactPayload): Record<string, JsonValue> {
  return artifact.payload && typeof artifact.payload === "object" && !Array.isArray(artifact.payload) ? (artifact.payload as Record<string, JsonValue>) : {};
}

function summarize(items: ContextItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((summary, item) => ({ ...summary, [item.kind]: (summary[item.kind] ?? 0) + 1 }), {});
}

function catalog(projectId: string, runId: string | undefined, runCount: number, rows: ProjectionRow[]): Catalog {
  const byKind = rows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.kind]: (acc[row.kind] ?? 0) + 1 }), {});
  return {
    projectId,
    runId,
    observed: { runs: runCount, projections: byKind },
    capabilities: { replayPolicies: ["recorded-only", "pause-for-fixture"], interventionKinds: ["message_patch", "tool_args_patch", "state_patch"], liveExecutors: [] },
    nextActions: ["GET context-inventory", "POST hypothesis-batches", "GET effects after experiment run"]
  };
}
