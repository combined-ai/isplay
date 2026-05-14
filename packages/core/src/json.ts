import type { JsonValue } from "./schemas.js";

export type SerializationOptions = {
  maxDepth?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
};

const DEFAULT_OPTIONS: Required<SerializationOptions> = {
  maxDepth: 24,
  maxArrayLength: 500,
  maxStringLength: 200_000
};

export function toJsonValue(value: unknown, options: SerializationOptions = {}): JsonValue {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  return serialize(value, merged, new WeakSet<object>(), 0);
}

function serialize(
  value: unknown,
  options: Required<SerializationOptions>,
  seen: WeakSet<object>,
  depth: number
): JsonValue {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") return null;
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    return value.length > options.maxStringLength ? `${value.slice(0, options.maxStringLength)}[TRUNCATED]` : value;
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null
    };
  }
  if (Buffer.isBuffer(value)) {
    return {
      type: "Buffer",
      encoding: "base64",
      byteLength: value.byteLength,
      data: value.byteLength <= 4096 ? value.toString("base64") : "[TRUNCATED]"
    };
  }
  if (depth >= options.maxDepth) return "[MAX_DEPTH]";
  if (typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, options.maxArrayLength)
      .map((item) => serialize(item, options, seen, depth + 1));
  }
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries())
        .slice(0, options.maxArrayLength)
        .map(([key, item]) => [String(key), serialize(item, options, seen, depth + 1)])
    );
  }
  if (value instanceof Set) {
    return Array.from(value.values())
      .slice(0, options.maxArrayLength)
      .map((item) => serialize(item, options, seen, depth + 1));
  }

  const output: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = serialize(item, options, seen, depth + 1);
  }
  return output;
}
