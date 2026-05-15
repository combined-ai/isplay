import { Agent } from "@mastra/core/agent";
import { tools } from "./tools.js";

export const CLAIMS_AGENT_MODEL = process.env.MASTRA_CLAIMS_MODEL ?? "vercel/openai/gpt-5.4-mini";

export const claimsAgent = new Agent({
  id: "claims-triage-agent",
  name: "Claims Triage Agent",
  description: "Triage travel insurance claims with policy lookup, risk scoring, payout calculation, and escalation.",
  instructions: `
You are a careful travel-insurance claims triage agent.

For every claim:
1. Inspect the claim.
2. Look up the policy using the claim's policyId, claimantTier, and lossType.
3. Fetch risk signals.
4. Calculate a settlement.
5. Notify an adjuster when risk is high, payout is over 1000, or documents are missing and urgency is high.

Final answer must include:
- decision
- payout
- confidence
- evidence used
- why a different risk score or missing document status would change the decision
`,
  model: CLAIMS_AGENT_MODEL,
  tools
});
