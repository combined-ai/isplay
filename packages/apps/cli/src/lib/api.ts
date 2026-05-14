import { IsplayApiClient } from "@isplay/api-client";

export function createApiClient(): IsplayApiClient {
  return new IsplayApiClient({ baseUrl: process.env.ISPLAY_API_URL });
}

export function requiredProjectId(value?: string): string {
  const projectId = value ?? process.env.ISPLAY_PROJECT_ID;
  if (!projectId) throw new Error("--project or ISPLAY_PROJECT_ID is required");
  return projectId;
}
