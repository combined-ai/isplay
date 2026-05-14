import { SdkSurfaceClient } from "./surface-client.js";
import { currentRunId } from "./context.js";
import type { IsplaySdkOptions } from "./base.js";

export class IsplaySdk extends SdkSurfaceClient {}

let activeClient: IsplaySdk | undefined;

export function init(options: IsplaySdkOptions): IsplaySdk {
  activeClient = new IsplaySdk(options);
  return activeClient;
}

export function getClient(): IsplaySdk {
  if (!activeClient) {
    const projectId = process.env.ISPLAY_PROJECT_ID;
    if (!projectId) throw new Error("isplay SDK is not initialized and ISPLAY_PROJECT_ID is unset.");
    activeClient = new IsplaySdk({ projectId });
  }
  return activeClient;
}

export { currentRunId };
export type { IsplaySdkOptions };
export type { ContextAnnotationInput } from "./run-client.js";
