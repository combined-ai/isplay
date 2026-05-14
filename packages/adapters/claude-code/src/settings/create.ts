export function createClaudeCodeSettings(command = "isplay-claude-hook") {
  return {
    hooks: {
      UserPromptSubmit: [{ hooks: [{ type: "command", command }] }],
      PreToolUse: [{ matcher: ".*", hooks: [{ type: "command", command }] }],
      PostToolUse: [{ matcher: ".*", hooks: [{ type: "command", command }] }],
      Stop: [{ hooks: [{ type: "command", command }] }],
      PreCompact: [{ hooks: [{ type: "command", command }] }],
      SubagentStart: [{ hooks: [{ type: "command", command }] }],
      SubagentStop: [{ hooks: [{ type: "command", command }] }]
    }
  };
}
