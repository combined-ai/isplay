import type { Command } from "commander";
import { createApiClient } from "../lib/api.js";
import { printJson } from "../lib/output.js";

export function registerProjectCommands(program: Command): void {
  const projects = program.command("projects").description("Create and inspect projects");

  projects
    .command("create")
    .description("Create a project")
    .option("--name <name>", "Project name", "isplay Project")
    .action(async (options: { name: string }) => {
      printJson(await createApiClient().createProject({ name: options.name }));
    });

  projects
    .command("get")
    .description("Get a project")
    .argument("<projectId>")
    .action(async (projectId: string) => {
      printJson(await createApiClient().getProject(projectId));
    });
}
