import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { createMastraIsplayAdapter } from "@isplay/adapter-mastra";
import type { ToolExecution } from "@isplay/core";
import { CLAIMS, POLICY_LIMITS, type ClaimRecord } from "./data.js";

const isplay = createMastraIsplayAdapter();

export const inspectClaimTool = createTool({
  id: "inspect-claim",
  description: "Load the claim record, submitted amount, missing documents, and claim context.",
  inputSchema: z.object({ claimId: z.string() }),
  outputSchema: z.any(),
  execute: (input) => instrumentTool("inspect-claim", input, () => claim(input.claimId))
});

export const lookupPolicyTool = createTool({
  id: "lookup-policy",
  description: "Return coverage limits and documentation rules for a policy and loss type.",
  inputSchema: z.object({
    policyId: z.string(),
    claimantTier: z.enum(["standard", "gold", "platinum"]),
    lossType: z.enum(["baggage_delay", "medical", "trip_cancellation"])
  }),
  outputSchema: z.any(),
  execute: (input) =>
    instrumentTool("lookup-policy", input, () => ({
      policyId: input.policyId,
      limit: POLICY_LIMITS[input.lossType][input.claimantTier],
      reimbursable: true,
      requiredDocs: input.lossType === "medical" ? ["invoice", "diagnosis"] : ["receipt", "proof of disruption"],
      exclusions: input.lossType === "trip_cancellation" ? ["voluntary cancellation"] : []
    }))
});

export const riskSignalsTool = createTool({
  id: "risk-signals",
  description: "Score fraud and operational risk using claim amount, merchant, location, and duplicate signals.",
  inputSchema: z.object({ claimId: z.string(), claimedAmount: z.number(), merchant: z.string(), location: z.string() }),
  outputSchema: z.any(),
  execute: (input) =>
    instrumentTool("risk-signals", input, () => {
      const record = claim(input.claimId);
      const score = Math.min(1, (record.duplicateReceipt ? 0.45 : 0.08) + (input.claimedAmount > 2000 ? 0.35 : 0.05) + (record.missingDocs.length ? 0.14 : 0));
      return { riskScore: Number(score.toFixed(2)), flags: riskFlags(record), historicalOverlap: record.duplicateReceipt, reviewedSignals: input };
    })
});

export const calculateSettlementTool = createTool({
  id: "calculate-settlement",
  description: "Calculate payout and recommended action from claim, policy, and risk evidence.",
  inputSchema: z.object({ claimId: z.string(), claimedAmount: z.number(), coverageLimit: z.number(), riskScore: z.number(), missingDocs: z.array(z.string()) }),
  outputSchema: z.any(),
  execute: (input) =>
    instrumentTool("calculate-settlement", input, () => {
      const payout = Math.max(0, Math.min(input.claimedAmount, input.coverageLimit));
      const action = input.riskScore > 0.65 ? "escalate" : input.missingDocs.length ? "partial_approve" : "approve";
      return { recommendedAction: action, payout, confidence: input.riskScore > 0.65 ? 0.52 : 0.82, rationale: settlementRationale(input.riskScore, input.missingDocs) };
    })
});

export const notifyAdjusterTool = createTool({
  id: "notify-adjuster",
  description: "Create a mock adjuster review ticket for high-risk or high-value claims.",
  inputSchema: z.object({ claimId: z.string(), reason: z.string(), priority: z.enum(["normal", "urgent"]) }),
  outputSchema: z.any(),
  execute: (input) => instrumentTool("notify-adjuster", input, () => ({ ticketId: `ADJ-${input.claimId}-${input.priority}`, channel: "mock-adjuster-queue", audit: input }))
});

export const tools = { inspectClaimTool, lookupPolicyTool, riskSignalsTool, calculateSettlementTool, notifyAdjusterTool };

async function instrumentTool<T>(toolName: string, args: unknown, run: () => T | Promise<T>): Promise<T> {
  let execution: ToolExecution | undefined;
  try {
    execution = await isplay.recordToolStart(toolName, args, { sideEffectClass: toolName === "notify-adjuster" ? "write" : "read" });
    const output = await run();
    await isplay.recordToolEnd(execution, output);
    return output;
  } catch (error) {
    if (execution) await isplay.recordToolError(execution, error);
    throw error;
  }
}

function claim(claimId: string): ClaimRecord {
  const record = CLAIMS[claimId];
  if (!record) throw new Error(`Unknown claim: ${claimId}`);
  return record;
}

function riskFlags(record: ClaimRecord): string[] {
  return [record.duplicateReceipt ? "duplicate_receipt" : undefined, record.missingDocs.length ? "missing_docs" : undefined, record.claimedAmount > 2000 ? "high_amount" : undefined].filter(Boolean) as string[];
}

function settlementRationale(riskScore: number, missingDocs: string[]): string {
  if (riskScore > 0.65) return "Risk score is above manual-review threshold.";
  if (missingDocs.length) return `Payment should be held back until ${missingDocs.join(", ")} is supplied.`;
  return "Coverage and risk checks support normal payment.";
}
