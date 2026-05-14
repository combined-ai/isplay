export type ExtractedToolCall = {
  toolName: string;
  toolCallId?: string;
  args?: unknown;
};

export function extractToolCalls(value: unknown): ExtractedToolCall[] {
  const calls: ExtractedToolCall[] = [];
  visit(value, calls);
  return calls;
}

function visit(item: unknown, calls: ExtractedToolCall[]): void {
  if (!item || typeof item !== "object") return;
  if (Array.isArray(item)) {
    item.forEach((entry) => visit(entry, calls));
    return;
  }
  const object = item as Record<string, unknown>;
  const fn = objectRecord(object.function);
  const toolName = firstString(object.toolName, object.name, object.functionName, fn.name);
  if (isToolCallShape(object) && toolName) {
    calls.push({
      toolName,
      toolCallId: firstString(object.toolCallId, object.id),
      args: object.args ?? object.arguments ?? object.input ?? fn.arguments
    });
  }
  Object.values(object).forEach((entry) => visit(entry, calls));
}

function isToolCallShape(object: Record<string, unknown>): boolean {
  return object.type === "tool-call" || "toolCallId" in object || "toolName" in object || "function" in object;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
