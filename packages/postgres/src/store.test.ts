import { describe, expect, it } from "vitest";
import { artifactObjectKey, artifactPath } from "./store/infrastructure/artifact-path.js";

describe("@isplay/postgres artifact paths", () => {
  it("rejects unsafe path segments before filesystem writes", () => {
    expect(() => artifactObjectKey("../project", "run_1", "artifact_1")).toThrow(/Unsafe/);
  });

  it("rejects object keys that escape the artifact root", () => {
    expect(() => artifactPath("/tmp/isplay-artifacts", "../escape.json")).toThrow(/escapes/);
  });
});
