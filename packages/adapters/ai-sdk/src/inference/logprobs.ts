export type LogprobSignal = {
  token: string;
  logprob: number;
  topAlternatives?: unknown;
  position?: unknown;
};

export function extractLogprobSignals(value: unknown): LogprobSignal[] {
  const output: LogprobSignal[] = [];
  visit(value, output);
  return output;
}

function visit(item: unknown, output: LogprobSignal[]): void {
  if (!item || typeof item !== "object") return;
  if (Array.isArray(item)) {
    item.forEach((entry) => visit(entry, output));
    return;
  }
  const object = item as Record<string, unknown>;
  if (typeof object.token === "string" && typeof object.logprob === "number") {
    output.push({
      token: object.token,
      logprob: object.logprob,
      topAlternatives: object.topLogprobs ?? object.top_logprobs,
      position: object.position
    });
  }
  Object.values(object).forEach((entry) => visit(entry, output));
}
