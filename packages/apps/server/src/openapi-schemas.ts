import { z } from "@hono/zod-openapi";

const MetadataDoc = z.record(z.string(), z.any());
const BaseDoc = { id: z.string(), createdAt: z.string(), recordVersion: z.number().optional() };
const OptionalString = z.string().optional();
const InterventionTargetDoc = z.object({
  refId: OptionalString,
  eventId: OptionalString,
  eventType: OptionalString,
  toolName: OptionalString,
  modelCallId: OptionalString,
  artifactId: OptionalString,
  contextItemId: OptionalString,
  contextPath: OptionalString,
  jsonPointer: OptionalString
});
const PatchOperationDoc = z.object({ op: z.string(), path: z.string(), value: z.any().optional(), from: OptionalString });
const ReplayPolicyDoc = z.object({
  model: z.string(),
  tool: z.string(),
  drift: z.string().optional(),
  maxSteps: z.number().optional(),
  temperatureOverride: z.number().optional()
});

export const ProjectDoc = z.object({ ...BaseDoc, name: z.string(), metadata: MetadataDoc });
export const CreateProjectDoc = z.object({ name: z.string(), metadata: MetadataDoc.optional() });

export const RunDoc = z.object({
  ...BaseDoc,
  projectId: z.string(),
  agentId: z.string().optional(),
  name: z.string().optional(),
  status: z.string(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  metadata: MetadataDoc
});
export const CreateRunDoc = z.object({ projectId: z.string(), agentId: z.string().optional(), name: z.string().optional(), metadata: MetadataDoc.optional() });

export const EventDoc = z.object({
  ...BaseDoc,
  projectId: z.string(),
  runId: z.string(),
  seq: z.number(),
  type: z.string(),
  refId: z.string().optional(),
  parentEventId: z.string().optional(),
  occurredAt: z.string(),
  data: z.any(),
  metadata: MetadataDoc
});

export const ArtifactDoc = z.object({
  ...BaseDoc,
  projectId: z.string(),
  runId: z.string().optional(),
  kind: z.string(),
  objectKey: z.string(),
  sha256: z.string(),
  sizeBytes: z.number(),
  mimeType: z.string(),
  redactionState: z.string(),
  metadata: MetadataDoc,
  payload: z.any().optional()
});
export const CreateArtifactDoc = z.object({ projectId: z.string(), runId: z.string().optional(), kind: z.string(), payload: z.any(), metadata: MetadataDoc.optional() });

export const CheckpointDoc = z.object({ ...BaseDoc, projectId: z.string(), runId: z.string(), name: z.string(), stateArtifactId: z.string(), stateHash: z.string(), metadata: MetadataDoc });
export const CreateCheckpointDoc = z.object({
  projectId: z.string(),
  runId: z.string(),
  name: z.string(),
  state: z.any(),
  parentEventId: OptionalString,
  schemaName: OptionalString,
  schemaVersion: OptionalString,
  codeVersion: OptionalString,
  packageVersions: MetadataDoc.optional(),
  metadata: MetadataDoc.optional()
});

export const BranchDoc = z.object({ ...BaseDoc, projectId: z.string(), baseRunId: z.string(), checkpointId: z.string(), parentBranchId: OptionalString, name: OptionalString, replayPolicy: ReplayPolicyDoc, metadata: MetadataDoc });
export const CreateBranchDoc = z.object({ projectId: z.string(), baseRunId: z.string(), checkpointId: z.string(), parentBranchId: OptionalString, name: OptionalString, replayPolicy: ReplayPolicyDoc.optional(), metadata: MetadataDoc.optional() });

export const InterventionDoc = z.object({ ...BaseDoc, projectId: z.string(), branchId: z.string(), kind: z.string(), target: InterventionTargetDoc, operations: z.array(PatchOperationDoc), description: OptionalString, patch: z.any().optional(), expectedBaseHash: OptionalString, metadata: MetadataDoc });
export const CreateInterventionDoc = z.object({ projectId: z.string(), branchId: z.string(), kind: z.string(), target: InterventionTargetDoc.optional(), operations: z.array(PatchOperationDoc).optional(), description: OptionalString, patch: z.any().optional(), expectedBaseHash: OptionalString, metadata: MetadataDoc.optional() });

export const ReplayDoc = z.object({ ...BaseDoc, projectId: z.string(), baseRunId: z.string(), branchId: OptionalString, experimentId: OptionalString, armId: OptionalString, trialIndex: z.number().optional(), status: z.string(), policy: ReplayPolicyDoc, startedAt: OptionalString, endedAt: OptionalString, latestAttemptId: OptionalString, firstDivergenceEventId: OptionalString, comparability: OptionalString, pausedRequirementId: OptionalString, error: OptionalString, metadata: MetadataDoc });
export const CreateReplayDoc = z.object({ projectId: z.string(), baseRunId: z.string(), branchId: OptionalString, experimentId: OptionalString, armId: OptionalString, trialIndex: z.number().optional(), policy: ReplayPolicyDoc.optional(), wait: z.boolean().optional(), metadata: MetadataDoc.optional() });
export const ReplayAttemptDoc = z.object({ ...BaseDoc, projectId: z.string(), replayId: z.string(), baseRunId: z.string(), branchId: OptionalString, experimentId: OptionalString, armId: OptionalString, trialIndex: z.number().optional(), status: z.string(), mode: z.string(), policy: ReplayPolicyDoc, startedAt: z.string(), endedAt: OptionalString, comparability: OptionalString, failure: z.any().optional(), metadata: MetadataDoc });
export const DiffDoc = z.object({ ...BaseDoc, projectId: z.string(), replayId: z.string(), kind: z.string(), comparability: z.string(), patch: z.any(), summary: OptionalString, metadata: MetadataDoc });
export const MetricDoc = z.object({ ...BaseDoc, projectId: z.string(), replayId: OptionalString, analysisRunId: OptionalString, name: z.string(), value: z.number(), unit: OptionalString, provenance: z.string(), metadata: MetadataDoc });

export const JobDoc = z.object({ ...BaseDoc, projectId: OptionalString, kind: z.string(), status: z.string(), resourceId: z.string(), graphileJobId: OptionalString, error: OptionalString, metadata: MetadataDoc });
export const JobEventDoc = z.object({ ...BaseDoc, projectId: OptionalString, jobId: z.string(), seq: z.number(), event: z.string(), data: z.any(), occurredAt: z.string(), metadata: MetadataDoc });

export const FixtureRequirementDoc = z.object({ ...BaseDoc, projectId: z.string(), replayId: z.string(), branchId: OptionalString, toolName: z.string(), argsArtifactId: OptionalString, argsHash: OptionalString, reason: z.string(), status: z.string(), satisfiedByFixtureId: OptionalString, metadata: MetadataDoc });
export const ToolFixtureDoc = z.object({ ...BaseDoc, projectId: z.string(), replayId: OptionalString, branchId: OptionalString, toolName: z.string(), matcher: z.any(), outputArtifactId: OptionalString, outputHash: OptionalString, schemaVersion: OptionalString, implementationVersion: OptionalString, sideEffectClass: OptionalString, provenance: z.string(), author: OptionalString, metadata: MetadataDoc });
export const CreateToolFixtureDoc = z.object({ projectId: z.string(), replayId: OptionalString, branchId: OptionalString, toolName: z.string(), matcher: z.any(), output: z.any(), schemaVersion: OptionalString, implementationVersion: OptionalString, sideEffectClass: OptionalString, provenance: z.string(), author: OptionalString, metadata: MetadataDoc.optional() });

export const ModelCallDoc = z.object({ ...BaseDoc, projectId: z.string(), runId: z.string(), provider: OptionalString, model: OptionalString, operation: z.string(), status: z.string(), settings: z.any().optional(), requestArtifactId: OptionalString, responseArtifactId: OptionalString, usage: z.any().optional(), logprobs: z.any().optional(), startedAt: z.string(), endedAt: OptionalString, error: OptionalString, metadata: MetadataDoc });
export const ToolProposalDoc = z.object({ ...BaseDoc, projectId: z.string(), runId: z.string(), modelCallId: OptionalString, toolCallId: z.string(), toolName: z.string(), argsArtifactId: OptionalString, argsHash: OptionalString, schemaVersion: OptionalString, metadata: MetadataDoc });
export const ToolExecutionDoc = z.object({ ...BaseDoc, projectId: z.string(), runId: z.string(), proposalId: OptionalString, toolCallId: OptionalString, toolName: z.string(), status: z.string(), argsArtifactId: OptionalString, resultArtifactId: OptionalString, argsHash: OptionalString, resultHash: OptionalString, sideEffectClass: z.string(), startedAt: z.string(), endedAt: OptionalString, error: OptionalString, metadata: MetadataDoc });

export const AnalysisRunDoc = z.object({ ...BaseDoc, projectId: z.string(), baseRunId: z.string(), experimentId: z.string().optional(), replayId: z.string().optional(), validityLabels: z.array(z.string()), summary: z.string().optional(), metadata: MetadataDoc });
export const CreateAnalysisRunDoc = z.object({ projectId: z.string(), baseRunId: z.string(), replayId: z.string().optional(), experimentId: z.string().optional(), metadata: MetadataDoc.optional() });
export const EvidenceNodeDoc = z.object({ ...BaseDoc, projectId: z.string(), analysisRunId: z.string(), type: z.string(), label: z.string(), refId: OptionalString, weight: z.number().optional(), metadata: MetadataDoc });
export const EvidenceEdgeDoc = z.object({ ...BaseDoc, projectId: z.string(), analysisRunId: z.string(), fromNodeId: z.string(), toNodeId: z.string(), relation: z.string(), weight: z.number().optional(), metadata: MetadataDoc });

export const ExperimentDoc = z.object({ ...BaseDoc, projectId: z.string(), baseRunIds: z.array(z.string()), checkpointSelector: z.any(), trialPlan: z.any(), policy: ReplayPolicyDoc, validityGates: z.array(z.any()), status: z.string(), startedAt: OptionalString, endedAt: OptionalString, metadata: MetadataDoc });
export const HypothesisDoc = z.object({ ...BaseDoc, projectId: z.string(), experimentId: z.string(), statement: z.string(), interventions: z.array(z.any()), metadata: MetadataDoc });
export const ExperimentArmDoc = z.object({ ...BaseDoc, projectId: z.string(), experimentId: z.string(), hypothesisId: OptionalString, baseRunId: z.string(), branchId: OptionalString, replayIds: z.array(z.string()), status: z.string(), metadata: MetadataDoc });
export const CreateExperimentDoc = z.object({ projectId: z.string(), baseRunIds: z.array(z.string()), checkpointSelector: z.any(), hypotheses: z.array(z.any()), trialPlan: z.any(), policy: ReplayPolicyDoc.optional(), validityGates: z.array(z.any()).optional(), metadata: MetadataDoc.optional() });
export const RunExperimentDoc = z.object({ wait: z.boolean().optional(), maxReplays: z.number().optional() });
export const ExperimentPlanDoc = z.object({ experiment: ExperimentDoc, hypotheses: z.array(HypothesisDoc), arms: z.array(ExperimentArmDoc) });
export const ExperimentJobDoc = z.object({ jobId: z.string(), experimentId: z.string(), status: z.literal("queued") });
export const EffectCandidateDoc = z.object({ ...BaseDoc, projectId: z.string(), experimentId: OptionalString, replayId: OptionalString, branchId: OptionalString, baseRunId: OptionalString, rank: z.number(), title: z.string(), score: z.number(), status: z.string(), effectType: z.string(), validityLabels: z.array(z.string()), confidence: z.any(), evidenceRefs: z.array(z.any()), recommendedNextActions: z.array(z.string()), metadata: MetadataDoc });
export const RankEffectsInputDoc = z.object({ projectId: z.string(), replayIds: z.array(z.string()).optional(), experimentId: OptionalString, limit: z.number().optional(), weights: z.any().optional() });
export const ExperimentStatisticsDoc = z.object({ projectId: z.string(), experimentId: z.string(), trialCount: z.number(), comparableCount: z.number(), fixtureDependencyRate: z.number(), nonComparableRate: z.number(), metrics: z.array(z.any()), metadata: MetadataDoc });
export const ExperimentResultsDoc = z.object({ experiment: ExperimentDoc, arms: z.array(ExperimentArmDoc), replays: z.array(ReplayDoc), requirements: z.array(FixtureRequirementDoc), effects: z.array(EffectCandidateDoc), statistics: ExperimentStatisticsDoc });
export const TrialMatrixDoc = z.array(z.object({ arm: ExperimentArmDoc, trials: z.array(z.object({ replay: ReplayDoc.optional(), attempts: z.array(ReplayAttemptDoc), metrics: z.array(MetricDoc), fixtureUses: z.array(z.any()) })) }));

export const ContextItemDoc = z.object({ ...BaseDoc, projectId: z.string(), runId: z.string(), checkpointId: OptionalString, modelCallId: OptionalString, sourceEventId: OptionalString, kind: z.string(), path: z.string(), ordinal: z.number().optional(), contentArtifactId: OptionalString, contentHash: z.string(), tokenEstimate: z.number().optional(), provenance: z.string(), visibility: z.string(), redactionState: z.string(), metadata: MetadataDoc });
export const ContextInventoryDoc = z.object({ projectId: z.string(), runId: OptionalString, checkpointId: OptionalString, modelCallId: OptionalString, items: z.array(ContextItemDoc), summary: z.record(z.string(), z.number()), metadata: MetadataDoc });
export const ContextSearchDoc = z.object({ projectId: z.string(), runId: OptionalString, kinds: z.array(z.string()).optional(), query: OptionalString, limit: z.number().optional(), offset: z.number().optional() });
export const CatalogDoc = z.object({ projectId: z.string(), runId: OptionalString, observed: z.any(), capabilities: z.any(), nextActions: z.array(z.string()) });
