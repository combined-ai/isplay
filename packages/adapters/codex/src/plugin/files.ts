export type CodexPluginFiles = {
  "plugin.json": unknown;
  "hooks/hooks.json": unknown;
  ".mcp.json": unknown;
};

export function createCodexPluginFiles(command = "isplay-codex-hook"): CodexPluginFiles {
  return {
    "plugin.json": {
      name: "isplay",
      version: "0.2.0",
      description: "isplay replay-grade capture, fixtures, and analysis for managed Codex runs.",
      skills: "./skills/",
      hooks: "./hooks/hooks.json",
      mcpServers: "./.mcp.json"
    },
    "hooks/hooks.json": {
      hooks: {
        SessionStart: [{ matcher: "startup|resume", hooks: [{ type: "command", command }] }],
        UserPromptSubmit: [{ hooks: [{ type: "command", command }] }],
        PreToolUse: [{ matcher: ".*", hooks: [{ type: "command", command }] }],
        PermissionRequest: [{ matcher: ".*", hooks: [{ type: "command", command }] }],
        PostToolUse: [{ matcher: ".*", hooks: [{ type: "command", command }] }],
        Stop: [{ hooks: [{ type: "command", command }] }]
      }
    },
    ".mcp.json": {
      mcp_servers: {
        isplay: { command: "isplay", args: ["mcp", "serve"] }
      }
    }
  };
}
