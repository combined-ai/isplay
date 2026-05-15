"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CommandBlock({ children, featured = false }: { children: string; featured?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`command-block${featured ? " is-feature" : ""}`}>
      <pre>
        <code>{children}</code>
      </pre>
      <button type="button" className="command-copy" aria-label="Copy command" onClick={copy}>
        {copied ? <Check size={16} strokeWidth={1.75} /> : <Copy size={16} strokeWidth={1.75} />}
      </button>
    </div>
  );
}
