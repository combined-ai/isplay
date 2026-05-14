import {
  createId,
  FixtureRequirementSchema,
  stableHash,
  type FixtureRequirement,
  type JsonValue,
  type ToolFixture
} from "@isplay/core";

export type ToolRequest = {
  projectId: string;
  replayId: string;
  branchId?: string;
  toolName: string;
  args: JsonValue;
  argsArtifactId?: string;
  sideEffectClass?: string;
};

export type FixtureResolution =
  | { status: "resolved"; fixture: ToolFixture }
  | { status: "required"; requirement: FixtureRequirement };

export class ToolFixtureGateway {
  constructor(private readonly fixtures: ToolFixture[]) {}

  resolve(request: ToolRequest): FixtureResolution {
    const argsHash = stableHash(request.args);
    const fixture = this.fixtures.find((candidate) => {
      return (
        candidate.projectId === request.projectId &&
        candidate.toolName === request.toolName &&
        (candidate.replayId === undefined || candidate.replayId === request.replayId) &&
        (candidate.branchId === undefined || candidate.branchId === request.branchId) &&
        matcherApplies(candidate.matcher, request.args, argsHash)
      );
    });
    if (fixture) return { status: "resolved", fixture };

    return {
      status: "required",
      requirement: FixtureRequirementSchema.parse({
        id: createId("requirement"),
        createdAt: new Date().toISOString(),
        projectId: request.projectId,
        replayId: request.replayId,
        branchId: request.branchId,
        toolName: request.toolName,
        argsArtifactId: request.argsArtifactId,
        argsHash,
        reason: "Replay reached a divergent or missing tool call without a matching fixture.",
        status: "open",
        metadata: { sideEffectClass: request.sideEffectClass ?? "unknown" }
      })
    };
  }
}

function matcherApplies(matcher: JsonValue, args: JsonValue, argsHash: string): boolean {
  if (matcher && typeof matcher === "object" && !Array.isArray(matcher)) {
    const object = matcher as Record<string, JsonValue>;
    if (typeof object.argsHash === "string") return object.argsHash === argsHash;
    if (object.exact !== undefined) return stableHash(object.exact) === stableHash(args);
  }
  return stableHash(matcher) === stableHash(args);
}
