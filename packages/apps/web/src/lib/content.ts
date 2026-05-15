import { assets } from "./assets";

export const enterpriseCards = [
  {
    number: "01",
    icon: "capture",
    title: "Capture",
    description: "Record prompts, context, model calls, tool proposals, tool results, artifacts, and checkpoints",
    lottie: assets.lotties.evaluation,
    wId: "32c135c9-061a-d4eb-24c6-2973b3b7d45d",
    wrapperClass: "",
    shuffle: "",
  },
  {
    number: "02",
    icon: "replay",
    title: "Replay",
    description: "Run fixture-first replays from explicit checkpoints without repeating unsafe side effects",
    lottie: assets.lotties.verifiers,
    wId: "814c7c5b-c39f-6a58-bbff-1a730a332667",
    wrapperClass: " is-right",
    shuffle: "scroll",
  },
  {
    number: "03",
    icon: "branch",
    title: "Branch Experiments",
    description: "Apply typed interventions to context, prompts, model policy, or tool outputs and compare traces",
    lottie: assets.lotties.reasoning,
    wId: "5b4a4f79-8470-bdfb-f664-340aac6f899b",
    wrapperClass: "",
    shuffle: "scroll",
  },
  {
    number: "04",
    icon: "effects",
    title: "Ranked Effects",
    description: "Measure first divergence, fixture dependence, low-N risk, and comparable downstream effects",
    lottie: assets.lotties.foundation,
    wId: "b9d81c83-13cc-2ced-9452-12819ef5579b",
    wrapperClass: "",
    shuffle: "scroll",
  },
  {
    number: "05",
    icon: "validity",
    title: "Validity Labels",
    description: "Keep every conclusion bounded by replay evidence instead of unsupported causal claims",
    lottie: assets.lotties.security,
    wId: "dd417e95-b6ad-292a-0440-0b250d65e262",
    wrapperClass: "",
    shuffle: "scroll",
  },
] as const;

export const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "isplay",
  description:
    "isplay is replay and analysis infrastructure for AI agents, with capture, checkpoint branching, fixture-first replay, and evidence-bounded reports.",
  url: "https://isplay.dev",
  logo: {
    "@type": "ImageObject",
    url: "/mirror/cdn.prod.website-files.com/691621fbb0674afe0d3eb98c/69176dd905112c0630a72135_logo-icon.svg",
  },
  inLanguage: "en",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Node.js",
  offers: enterpriseCards.map((card) => ({
    "@type": "Offer",
    itemOffered: {
      "@type": "SoftwareApplication",
      name: card.title,
      description: card.description,
    },
  })),
};

export const skillInstallCommand =
  "npx skills add isplay/isplay --skill isplay-analysis";
