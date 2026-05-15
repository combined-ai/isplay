export type ClaimRecord = {
  claimId: string;
  policyId: string;
  claimantTier: "standard" | "gold" | "platinum";
  lossType: "baggage_delay" | "medical" | "trip_cancellation";
  claimedAmount: number;
  merchant: string;
  location: string;
  missingDocs: string[];
  duplicateReceipt: boolean;
  urgency: "low" | "medium" | "high";
};

export const CLAIMS: Record<string, ClaimRecord> = {
  CLM_1001: {
    claimId: "CLM_1001",
    policyId: "TRAVEL_GOLD",
    claimantTier: "gold",
    lossType: "baggage_delay",
    claimedAmount: 420,
    merchant: "Nordic Outfitters",
    location: "Reykjavik",
    missingDocs: [],
    duplicateReceipt: false,
    urgency: "medium"
  },
  CLM_2002: {
    claimId: "CLM_2002",
    policyId: "TRAVEL_STANDARD",
    claimantTier: "standard",
    lossType: "trip_cancellation",
    claimedAmount: 2800,
    merchant: "City Travel Desk",
    location: "Lisbon",
    missingDocs: ["carrier cancellation letter"],
    duplicateReceipt: true,
    urgency: "low"
  },
  CLM_3003: {
    claimId: "CLM_3003",
    policyId: "TRAVEL_PLATINUM",
    claimantTier: "platinum",
    lossType: "medical",
    claimedAmount: 1350,
    merchant: "Alpine Clinic",
    location: "Zurich",
    missingDocs: ["translated diagnosis"],
    duplicateReceipt: false,
    urgency: "high"
  }
};

export const POLICY_LIMITS = {
  baggage_delay: { standard: 250, gold: 500, platinum: 900 },
  medical: { standard: 700, gold: 1200, platinum: 2500 },
  trip_cancellation: { standard: 1500, gold: 3000, platinum: 5000 }
} as const;
