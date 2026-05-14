import { IsplayApiClient, type ApiClientOptions } from "@isplay/api-client";
import { type CapturePolicy, type JsonValue } from "@isplay/core";
import { captureMetadata, captureValue } from "./capture.js";

export type IsplaySdkOptions = ApiClientOptions & {
  projectId: string;
  serviceName?: string;
  capturePolicy?: CapturePolicy;
};

export class IsplaySdkBase {
  readonly api: IsplayApiClient;
  readonly projectId: string;
  readonly serviceName: string;
  readonly capturePolicy?: CapturePolicy;

  constructor(options: IsplaySdkOptions) {
    this.api = new IsplayApiClient(options);
    this.projectId = options.projectId;
    this.serviceName = options.serviceName ?? "agent-app";
    this.capturePolicy = options.capturePolicy;
  }

  protected capture(value: unknown) {
    return captureValue(value, this.capturePolicy);
  }

  protected captureMetadata(value: unknown): Record<string, JsonValue> {
    return captureMetadata(this.capture(value).report);
  }
}
