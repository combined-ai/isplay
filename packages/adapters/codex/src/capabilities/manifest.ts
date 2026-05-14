import { primitive, type AdapterCapabilityManifest } from "@isplay/adapter-runtime";

export const codexCapabilities: AdapterCapabilityManifest = {
  adapterId: "codex",
  displayName: "Codex",
  status: "managed_replay",
  primitives: {
    contextInventory: primitive("managed_replay", "observe_only", "JSONL, hooks, app-server items, MCP resources, and plugin skills expose reconstructable context."),
    promptPatch: primitive("managed_replay", "native_replace", "Managed app-server mode can inject raw Responses items or steer turns."),
    modelCapture: primitive("managed_replay", "proxy_replace", "Use JSONL/app-server events plus optional isplay Responses proxy for exact request streams."),
    modelReplay: primitive("managed_replay", "proxy_replace", "Recorded model replay requires isplay as model provider/base URL."),
    toolCapture: primitive("managed_replay", "observe_only", "Hooks and JSONL expose Bash/apply_patch/MCP calls; some shell/WebSearch paths remain partial."),
    toolFixtureReplay: primitive("managed_replay", "post_result_replace", "MCP/proxy tools are fixture-safe; built-ins can be blocked or replaced after execution only."),
    checkpointing: primitive("managed_replay", "observe_only", "Use app-server fork/rollback plus external git/worktree snapshots for filesystem checkpoints.")
  },
  warnings: [
    "Public Codex hooks do not provide pre-execution synthetic results for every built-in tool.",
    "Full built-in shell/apply_patch replay needs a Codex fork or upstream pre-dispatch replacement hook."
  ]
};
