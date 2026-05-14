import { describe, expect, it } from "vitest";
import { createProgram } from "./program.js";

describe("CLI program", () => {
  it("uses a structured command tree for agent-facing workflows", () => {
    const program = createProgram();
    const commands = program.commands.map((command) => command.name());

    expect(commands).toEqual(expect.arrayContaining(["start", "health", "jobs", "projects", "runs", "branch", "artifacts", "context", "replay", "fixtures", "discover", "experiments", "effects"]));
    expect(subcommands(program, "jobs")).toContain("events");
    expect(subcommands(program, "runs")).toEqual(expect.arrayContaining(["list", "inspect", "events", "checkpoints", "catalog", "context"]));
    expect(subcommands(program, "branch")).toEqual(expect.arrayContaining(["get", "create", "intervene", "interventions"]));
    expect(subcommands(program, "replay")).toEqual(expect.arrayContaining(["get", "events", "diff", "metrics", "effects", "requirements", "resume"]));
    expect(subcommands(program, "experiments")).toEqual(expect.arrayContaining(["create", "get", "run", "results", "requirements", "trial-matrix", "statistics", "arm-comparison", "effects"]));
    expect(program.commands.find((command) => command.name() === "experiments")?.aliases()).toContain("experiment");
  });
});

function subcommands(program: ReturnType<typeof createProgram>, name: string): string[] {
  return program.commands.find((command) => command.name() === name)?.commands.map((command) => command.name()) ?? [];
}
