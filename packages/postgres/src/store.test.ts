import { describe, expect, it } from "vitest";
import { artifactObjectKey, artifactPath } from "./store/infrastructure/artifact-path.js";
import { StoreBase } from "./store/infrastructure/base.js";

describe("@isplay/postgres artifact paths", () => {
  it("rejects unsafe path segments before filesystem writes", () => {
    expect(() => artifactObjectKey("../project", "run_1", "artifact_1")).toThrow(/Unsafe/);
  });

  it("rejects object keys that escape the artifact root", () => {
    expect(() => artifactPath("/tmp/isplay-artifacts", "../escape.json")).toThrow(/escapes/);
  });
});

describe("@isplay/postgres transactions", () => {
  it("commits successful callbacks and releases the client", async () => {
    const client = fakeClient();
    const store = new TransactionHarness(client);

    await expect(store.runInTransaction(async (tx) => tx.query("SELECT 1"))).resolves.toBeUndefined();

    expect(client.queries).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
    expect(client.released).toBe(true);
  });

  it("rolls back failed callbacks and releases the client", async () => {
    const client = fakeClient();
    const store = new TransactionHarness(client);

    await expect(store.runInTransaction(async () => {
      throw new Error("boom");
    })).rejects.toThrow("boom");

    expect(client.queries).toEqual(["BEGIN", "ROLLBACK"]);
    expect(client.released).toBe(true);
  });
});

type FakeClient = {
  queries: string[];
  released: boolean;
  query: (sql: string) => Promise<void>;
  release: () => void;
};

class TransactionHarness extends StoreBase {
  constructor(client: FakeClient) {
    super({ connectionString: "postgres://isplay:isplay@127.0.0.1:1/isplay", artifactsDir: "/tmp/isplay-test-artifacts" });
    Object.defineProperty(this, "pool", { value: { connect: async () => client } });
  }

  async runInTransaction(fn: (client: FakeClient) => Promise<void>): Promise<void> {
    await this.withTransaction(fn as never);
  }
}

function fakeClient(): FakeClient {
  return {
    queries: [],
    released: false,
    async query(sql: string) {
      this.queries.push(sql);
    },
    release() {
      this.released = true;
    }
  };
}
