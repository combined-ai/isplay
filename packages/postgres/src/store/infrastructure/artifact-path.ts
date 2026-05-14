import path from "node:path";

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

export function artifactObjectKey(projectId: string, runId: string | undefined, artifactId: string): string {
  return `${safeSegment(projectId)}/${safeSegment(runId ?? "shared")}/${safeSegment(artifactId)}.json`;
}

export function artifactPath(root: string, objectKey: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, objectKey);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Artifact path escapes artifact root");
  }
  return resolvedPath;
}

function safeSegment(value: string): string {
  if (!SAFE_SEGMENT.test(value)) throw new Error(`Unsafe artifact path segment: ${value}`);
  return value;
}
