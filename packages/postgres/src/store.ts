import { ReplayAttemptStore } from "./store/replay/attempts.js";
export type { IsplayStoreOptions } from "./store/infrastructure/base.js";
export type { PersistedAnalysis } from "./store/replay/results.js";

export class IsplayStore extends ReplayAttemptStore {}
