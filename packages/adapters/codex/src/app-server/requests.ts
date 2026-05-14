export function threadFork(threadId: string) {
  return { method: "thread/fork", params: { threadId } };
}

export function threadRollback(threadId: string, turns: number) {
  return { method: "thread/rollback", params: { threadId, turns } };
}

export function injectAssistantContext(threadId: string, text: string) {
  return {
    method: "thread/inject_items",
    params: {
      threadId,
      items: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }]
    }
  };
}
