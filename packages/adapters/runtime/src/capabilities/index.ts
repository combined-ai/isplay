import type { JsonValue } from "@isplay/core";

export type AdapterSupportLevel = "native_full" | "managed_replay" | "observability_only" | "unsupported";
export type InterceptionMode = "native_replace" | "proxy_replace" | "post_result_replace" | "block_only" | "observe_only";

export type PrimitiveCapability = {
  status: AdapterSupportLevel;
  mode: InterceptionMode;
  notes: string;
  requirements?: string[];
};

export type AdapterCapabilityManifest = {
  adapterId: string;
  displayName: string;
  status: AdapterSupportLevel;
  primitives: Record<string, PrimitiveCapability>;
  warnings: string[];
  metadata?: Record<string, JsonValue>;
};

export function primitive(
  status: AdapterSupportLevel,
  mode: InterceptionMode,
  notes: string,
  requirements: string[] = []
): PrimitiveCapability {
  return { status, mode, notes, requirements };
}

export function supportsNativeReplay(manifest: AdapterCapabilityManifest): boolean {
  return Object.values(manifest.primitives).every((capability) => capability.status === "native_full");
}

export function unsupportedPrimitive(notes: string): PrimitiveCapability {
  return primitive("unsupported", "observe_only", notes);
}
