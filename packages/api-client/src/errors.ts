export class IsplayApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly method: string;
  readonly path: string;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly recoverable: boolean;

  constructor(
    message: string,
    options: {
      status: number;
      body: unknown;
      method: string;
      path: string;
      requestId?: string;
      retryable?: boolean;
      recoverable?: boolean;
    }
  ) {
    super(message);
    this.name = "IsplayApiError";
    this.status = options.status;
    this.body = options.body;
    this.method = options.method;
    this.path = options.path;
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? (options.status >= 500 || options.status === 429);
    this.recoverable = options.recoverable ?? options.status < 500;
  }
}

export function apiErrorOptions(response: Response, body: unknown, method: string, path: string) {
  const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  return {
    status: response.status,
    body,
    method,
    path,
    requestId: response.headers.get("x-request-id") ?? (typeof record.requestId === "string" ? record.requestId : undefined),
    retryable: typeof record.retryable === "boolean" ? record.retryable : undefined,
    recoverable: typeof record.recoverable === "boolean" ? record.recoverable : undefined
  };
}

export function summarizeError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = payload as { error: unknown; details?: unknown };
    const details = error.details === undefined ? "" : ` ${JSON.stringify(error.details).slice(0, 500)}`;
    return `${String(error.error)}${details}`;
  }
  return typeof payload === "string" ? payload.slice(0, 300) : JSON.stringify(payload)?.slice(0, 300) ?? "unknown error";
}
