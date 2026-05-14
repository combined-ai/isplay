export class IsplayApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown
  ) {
    super(message);
    this.name = "IsplayApiError";
  }
}

export function summarizeError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = payload as { error: unknown; details?: unknown };
    const details = error.details === undefined ? "" : ` ${JSON.stringify(error.details).slice(0, 500)}`;
    return `${String(error.error)}${details}`;
  }
  return typeof payload === "string" ? payload.slice(0, 300) : JSON.stringify(payload)?.slice(0, 300) ?? "unknown error";
}
