import {
  AnalysisRunSchema,
  DiffSchema,
  EventSchema,
  EvidenceEdgeSchema,
  EvidenceNodeSchema,
  MetricSchema,
  type AnalysisRun,
  type DiffRecord,
  type EventRecord,
  type EvidenceEdge,
  type EvidenceNode,
  type Metric
} from "@isplay/core";
import { ExperimentStore } from "../experiments/records.js";

export type PersistedAnalysis = {
  analysisRun: AnalysisRun;
  evidenceNodes: EvidenceNode[];
  evidenceEdges: EvidenceEdge[];
  scores: Metric[];
};

export class ResultStore extends ExperimentStore {
  async clearReplayOutputs(replayId: string): Promise<void> {
    await this.deleteReplayDerived(replayId);
  }

  async putReplayEvents(replayId: string, events: EventRecord[]): Promise<EventRecord[]> {
    for (const event of events) {
      const record = EventSchema.parse(event);
      await this.putProjection(`${replayId}:${record.id}`, record.projectId, record.runId, "replay_event", undefined, { ...record, replayId });
    }
    return events;
  }

  async listReplayEvents(replayId: string): Promise<EventRecord[]> {
    const result = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'replay_event' AND data->>'replayId' = $1 ORDER BY (data->>'seq')::int ASC",
      [replayId]
    );
    return result.rows.map((row) => EventSchema.parse(row.data));
  }

  async putDiff(record: DiffRecord): Promise<DiffRecord> {
    await this.putProjection(record.id, record.projectId, undefined, "diff", undefined, record);
    return record;
  }

  async listDiffs(replayId: string): Promise<DiffRecord[]> {
    const result = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'diff' AND data->>'replayId' = $1 ORDER BY created_at ASC",
      [replayId]
    );
    return result.rows.map((row) => DiffSchema.parse(row.data));
  }

  async putMetric(record: Metric): Promise<Metric> {
    await this.putProjection(record.id, record.projectId, undefined, "metric", undefined, record);
    return record;
  }

  async listMetrics(replayId: string): Promise<Metric[]> {
    const result = await this.pool.query<{ data: unknown }>(
      "SELECT data FROM projections WHERE kind = 'metric' AND data->>'replayId' = $1 ORDER BY created_at ASC",
      [replayId]
    );
    return result.rows.map((row) => MetricSchema.parse(row.data));
  }

  async putAnalysisOutput(output: PersistedAnalysis): Promise<PersistedAnalysis> {
    const run = AnalysisRunSchema.parse(output.analysisRun);
    await this.putProjection(run.id, run.projectId, run.baseRunId, "analysis_run", undefined, run);
    for (const node of output.evidenceNodes) await this.putProjection(node.id, node.projectId, undefined, "evidence_node", undefined, EvidenceNodeSchema.parse(node));
    for (const edge of output.evidenceEdges) await this.putProjection(edge.id, edge.projectId, undefined, "evidence_edge", undefined, EvidenceEdgeSchema.parse(edge));
    for (const score of output.scores) await this.putMetric(score);
    return output;
  }

  async getAnalysisRun(id: string): Promise<AnalysisRun | undefined> {
    return this.getProjection(id, AnalysisRunSchema.parse);
  }
}
