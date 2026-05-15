import { Mastra } from "@mastra/core";
import { claimsAgent } from "../agent.js";

export const mastra = new Mastra({
  agents: { claimsAgent }
});
