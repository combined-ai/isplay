import { primitive, type AdapterCapabilityManifest } from "@isplay/adapter-runtime";

export const openClawCapabilities: AdapterCapabilityManifest = {
  adapterId: "openclaw",
  displayName: "OpenClaw",
  status: "native_full",
  primitives: {
    contextInventory: primitive("native_full", "native_replace", "Prompt/context hooks expose model-visible input and context-engine ownership can capture provenance."),
    promptPatch: primitive("native_full", "native_replace", "before_prompt_build can inject or replace prompt/system context before submission."),
    modelCapture: primitive("native_full", "observe_only", "llm_input and llm_output expose provider input/output, usage, and timing."),
    modelReplay: primitive("managed_replay", "proxy_replace", "Full replay needs an isplay provider proxy or OpenClaw synthetic model hook."),
    toolCapture: primitive("native_full", "observe_only", "before_tool_call, after_tool_call, and tool_result_persist expose proposal/result lifecycle."),
    toolFixtureReplay: primitive("managed_replay", "native_replace", "Native synthetic fixture replay is supported when OpenClaw accepts skipExecution/result hook returns; otherwise block/pause."),
    checkpointing: primitive("managed_replay", "observe_only", "Session transcripts and compaction hooks support sidecar checkpoints; formal fork APIs remain runtime-owned.")
  },
  warnings: [
    "OpenClaw plugin-only mode cannot safely undo side effects from tools already executed.",
    "Use toolResultMode=native_synthetic only with an OpenClaw build that honors synthetic before_tool_call results."
  ]
};
