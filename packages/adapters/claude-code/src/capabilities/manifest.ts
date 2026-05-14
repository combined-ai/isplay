import { primitive, type AdapterCapabilityManifest } from "@isplay/adapter-runtime";

export const claudeCodeCapabilities: AdapterCapabilityManifest = {
  adapterId: "claude-code",
  displayName: "Claude Code",
  status: "managed_replay",
  primitives: {
    contextInventory: primitive("managed_replay", "observe_only", "Hooks, stream-json output, transcript paths, and MCP metadata allow reconstructed context inventory."),
    promptPatch: primitive("managed_replay", "native_replace", "UserPromptSubmit can add context; managed runner can alter submitted prompts and settings."),
    modelCapture: primitive("observability_only", "observe_only", "Claude Code does not expose a stable full model request/response hook."),
    modelReplay: primitive("unsupported", "observe_only", "No public model-output injection API exists for Claude Code."),
    toolCapture: primitive("managed_replay", "observe_only", "PreToolUse/PostToolUse hooks expose tool proposal and result lifecycle."),
    toolFixtureReplay: primitive("managed_replay", "post_result_replace", "Safe for isplay-owned MCP/proxy tools; built-ins can be denied/deferred before execution or adjusted after execution."),
    checkpointing: primitive("managed_replay", "observe_only", "Use Claude file checkpoints plus external worktree/container snapshots for non-Write/Edit changes.")
  },
  warnings: [
    "Claude Code full recorded-only replay is unsupported without Anthropic exposing model-output injection.",
    "Built-in tool output replacement after execution cannot undo side effects."
  ]
};
