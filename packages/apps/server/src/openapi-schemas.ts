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

export const JobDoc = z.object({ ...BaseDoc, projectId: OptionalString, kind: z.string(), status: z.string(), resourceId: z.string(), graphileJobId: OptionalString, error: OptionalString, metadata: MetadataDoc });
export const JobEventDoc = z.object({ ...BaseDoc, projectId: OptionalString, jobId: z.string(), seq: z.number(), event: z.string(), data: z.any(), occurredAt: z.string(), metadata: MetadataDoc });

export const FixtureRequirementDoc = z.object({ ...BaseDoc, projectId: z.string(), replayId: z.string(), branchId: OptionalString, toolName: z.string(), argsArtifactId: OptionalString, argsHash: OptionalString, reason: z.string(), status: z.string(), satisfiedByFixtureId: OptionalString, metadata: MetadataDoc });
export const ToolFixtureDoc = z.object({ ...BaseDoc, projectId: z.string(), replayId: OptionalString, branchId: OptionalString, toolName: z.string(), matcher: z.any(), outputArtifactId: OptionalString, outputHash: OptionalString, schemaVersion: OptionalString, implementationVersion: OptionalString, sideEffectClass: OptionalString, provenance: z.string(), author: OptionalString, metadata: MetadataDoc });
export const CreateToolFixtureDoc = z.object({ projectId: z.string(), replayId: OptionalString, branchId: OptionalString, toolName: z.string(), matcher: z.any(), output: z.any(), schemaVersion: OptionalString, implementationVersion: OptionalString, sideEffectClass: OptionalString, provenance: z.string(), author: OptionalString, metadata: MetadataDoc.optional() });

export const ModelCallDoc = z.object({ ...BaseDoc, projectId: z.string(), runId: z.string(), provider: OptionalString, model: OptionalString, operation: z.string(), status: z.string(), settings: z.any().optional(), requestArtifactId: OptionalString, responseArtifactId: OptionalString, usage: z.any().optional(), logprobs: z.any().optional(), startedAt: z.string(), endedAt: OptionalString, error: OptionalString, metadata: MetadataDoc });
export const ToolProposalDoc = z.object({ ...BaseDoc, projectId: z.string(), runId: z.string(), modelCallId: OptionalString, toolCallId: z.string(), toolName: z.string(), argsArtifactId: OptionalString, argsHash: OptionalString, schemaVersion: OptionalString, metadata: MetadataDoc });
export const ToolExecutionDoc = z.object({ ...BaseDoc, projectId: z.string(), runId: z.string(), proposalId: OptionalString, toolCallId: OptionalString, toolName: z.string(), status: z.string(), argsArtifactId: OptionalString, resultArtifactId: OptionalString, argsHash: OptionalString, resultHash: OptionalString, sideEffectClass: z.string(), startedAt: z.string(), endedAt: OptionalString, error: OptionalString, metadata: MetadataDoc });

export const AnalysisRunDoc = z.object({ ...BaseDoc, projectId: z.string(), baseRunId: z.string(), experimentId: z.string().optional(), validityLabels: z.array(z.string()), summary: z.string().optional(), metadata: MetadataDoc });
export const CreateAnalysisRunDoc = z.object({ projectId: z.string(), baseRunId: z.string(), replayId: z.string().optional(), experimentId: z.string().optional(), metadata: MetadataDoc.optional() });
