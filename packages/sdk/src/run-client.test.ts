import { describe, expect, it } from "vitest";
import type { EventRecord } from "@isplay/core";
import { IsplaySdk } from "./index.js";

describe("RunCaptureClient sequencing", () => {
  it("allocates unique event seq values across concurrent contexts for the same run", async () => {
    const sdk = new IsplaySdk({ projectId: "project_1" });
    const appended: EventRecord[] = [];

    sdk.api.appendEvents = async (_runId: string, events: EventRecord[]) => {
      await Promise.resolve();
      appended.push(...events);
      return { inserted: events.length };
    };

    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        sdk.withRunContext({ runId: "run_1", projectId: "project_1" }, async () => {
          await Promise.resolve();
          await sdk.recordEvent("test.event", { index });
        })
      )
    );

    expect(appended.map((event) => event.seq)).toEqual([1, 2, 3, 4, 5]);
  });
});
