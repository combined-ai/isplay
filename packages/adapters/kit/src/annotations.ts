import type { ContextItem, JsonValue } from "@isplay/core";
import type { AdapterClient, ContextAnnotationSpec } from "./types.js";

const marker = "__isplayContext" as const;

export function annotateContext(kind: ContextItem["kind"], path: string, value: unknown, options: Omit<ContextAnnotationSpec, "kind" | "path" | "value"> = {}): ContextAnnotationSpec {
  return { kind, path, value, ...options };
}

export function systemPrompt(value: unknown, path = "prompt.system", options: AnnotationOptions = {}) {
  return marked(annotateContext("system_message", path, value, options));
}

export function developerPrompt(value: unknown, path = "prompt.developer", options: AnnotationOptions = {}) {
  return marked(annotateContext("developer_message", path, value, options));
}

export function userMessage(value: unknown, path = "messages.user", options: AnnotationOptions = {}) {
  return marked(annotateContext("user_message", path, value, options));
}

export function assistantMessage(value: unknown, path = "messages.assistant", options: AnnotationOptions = {}) {
  return marked(annotateContext("assistant_message", path, value, options));
}

export function promptClause(value: unknown, path: string, options: AnnotationOptions = {}) {
  return marked(annotateContext("prompt_clause", path, value, options));
}

export function retrievalChunk(value: unknown, path: string, options: AnnotationOptions = {}) {
  return marked(annotateContext("retrieval_chunk", path, value, options));
}

export function memoryItem(value: unknown, path: string, options: AnnotationOptions = {}) {
  return marked(annotateContext("memory_item", path, value, options));
}

export function stateField(value: unknown, path: string, options: AnnotationOptions = {}) {
  return marked(annotateContext("state_field", path, value, { visibility: "state_only", ...options }));
}

export function toolSchema(value: unknown, path: string, options: AnnotationOptions = {}) {
  return marked(annotateContext("tool_schema", path, value, options));
}

export function valueOf<T>(input: T | AnnotatedValue<T>): T {
  return isAnnotated(input) ? input.value : input;
}

export function annotationsFrom(input: unknown): ContextAnnotationSpec[] {
  if (isAnnotated(input)) return [input.annotation];
  if (Array.isArray(input)) return input.flatMap((entry) => annotationsFrom(entry));
  if (!input || typeof input !== "object") return [];
  return Object.values(input).flatMap((entry) => annotationsFrom(entry));
}

export async function recordAnnotations(client: AdapterClient, input: unknown): Promise<void> {
  for (const annotation of annotationsFrom(input)) await client.annotateContext(annotation);
}

function marked<T>(annotation: ContextAnnotationSpec): AnnotatedValue<T> {
  return { [marker]: true, annotation, value: annotation.value as T };
}

function isAnnotated<T = unknown>(value: unknown): value is AnnotatedValue<T> {
  return Boolean(value && typeof value === "object" && (value as { [marker]?: boolean })[marker]);
}

type AnnotationOptions = Omit<ContextAnnotationSpec, "kind" | "path" | "value"> & {
  metadata?: Record<string, JsonValue>;
};

export type AnnotatedValue<T = unknown> = {
  readonly [marker]: true;
  readonly annotation: ContextAnnotationSpec;
  readonly value: T;
};
