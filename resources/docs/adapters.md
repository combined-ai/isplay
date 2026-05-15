# Adapter Support

isplay adapters publish capability manifests so runtime limits are explicit. A primitive can be `native_full`, `managed_replay`, `observability_only`, or `unsupported`, and the interception mode explains whether the runtime can replace outputs before execution or only observe them.

Use the website docs under `packages/apps/web/content/docs/integrations/` as the complete reference. This file is a compact repo-local summary.

## Capability Vocabulary

| Status | Meaning |
| --- | --- |
| `native_full` | The runtime exposes hooks that can capture context and replace results before side effects. |
| `managed_replay` | The adapter can capture, steer, block, defer, or replace in some paths, but runtime limits remain. |
| `observability_only` | The adapter can reconstruct observed behavior, not deterministic replay. |
| `unsupported` | The primitive is not available through public runtime APIs. |

| Mode | Meaning |
| --- | --- |
| `native_replace` | Runtime can accept replacement input/output natively. |
| `proxy_replace` | Replacement works through a provider, model, or tool proxy. |
| `post_result_replace` | Adapter can add context after execution, but side effects may already have happened. |
| `block_only` | Adapter can prevent execution but cannot supply a synthetic result. |
| `observe_only` | Adapter records evidence only. |

## Implemented Adapters

| Adapter | Package | Summary |
| --- | --- | --- |
| Adapter kit | `@isplay/adapter-kit` | Shared primitives for annotations, model capture, framework events, tool wrappers, and checkpoints. Best for custom frameworks and explicit app-owned instrumentation. |
| AI SDK | `@isplay/adapter-ai-sdk` | Middleware for generate/stream, tool proposal extraction, logprob extraction, and `execute` wrappers. Streams finish capture only when consumed. |
| Mastra | `@isplay/adapter-mastra` | Explicit helper adapter for workflow snapshots, agent events, and tool lifecycle capture. It does not automatically wrap `Agent.generate`. |
| LangGraph | `@isplay/adapter-langgraph` | Node wrappers, state checkpoints, chat model wrappers, stream instrumentation, and tool wrappers that record proposals by default. |
| Runtime | `@isplay/adapter-runtime` | Shared capability, fixture gateway, JSON, side-effect inference, and run registry primitives used by managed adapters. |
| Codex | `@isplay/adapter-codex` | Hook handling, JSONL ingestion, plugin file generation, and app-server helper requests. Managed replay, with built-in tool fixture caveats. |
| Claude Code | `@isplay/adapter-claude-code` | Hook handling, stream-json ingestion, and settings generation. Model replay is unsupported with current public hooks. |
| OpenClaw | `@isplay/adapter-openclaw` | Native plugin hook adapter for model input/output, context, tool lifecycle, fixture decisions, and synthetic before-tool outputs when supported. |

## Replay Guarantees By Runtime

| Runtime | Current guarantee |
| --- | --- |
| App-owned SDK or adapter-kit | Strong when model/tool/checkpoint boundaries are captured before side effects. |
| AI SDK | Strong capture. Replay strength depends on whether the surrounding app can consume recorded model/tool outputs. |
| Mastra | Explicit capture. Replay requires app-owned checkpoints and fixture-aware tool handling. |
| LangGraph | Strong graph evidence through nodes, streams, state, and tools. Replay still depends on graph executor support. |
| Codex | Managed replay. JSONL and hooks expose rich evidence, but built-in tool outputs are not universally replaceable before execution. |
| Claude Code | Managed capture. Tool hooks are useful, but public model-output injection is unavailable. |
| OpenClaw | Strongest runtime story when before-tool synthetic results are honored. |

## Documentation Rule

Do not describe hook-only or post-result integrations as deterministic replay. Use "captured evidence", "managed replay", or "fixture-guided analysis" unless the runtime can safely replace model or tool outputs before side effects.
