export function inferProvider(model: unknown): string | undefined {
  return model && typeof model === "object" && typeof (model as Record<string, unknown>).provider === "string"
    ? String((model as Record<string, unknown>).provider)
    : undefined;
}

export function inferModel(model: unknown): string | undefined {
  if (!model || typeof model !== "object") return undefined;
  const object = model as Record<string, unknown>;
  return typeof object.modelId === "string" ? object.modelId : typeof object.model === "string" ? object.model : undefined;
}
