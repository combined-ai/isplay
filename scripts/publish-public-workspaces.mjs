import { execFileSync, spawnSync } from "node:child_process";

const root = process.cwd();
const dryRun = process.argv.includes("--dry-run");

const workspaceJson = execFileSync("npm", ["query", ".workspace", "--json"], {
  cwd: root,
  encoding: "utf8"
});
const workspaces = JSON.parse(workspaceJson).filter((workspace) => !workspace.private);

for (const workspace of workspaces) {
  const spec = `${workspace.name}@${workspace.version}`;

  if (isPublished(spec)) {
    console.log(`skip ${spec}; already published`);
    continue;
  }

  if (dryRun) {
    console.log(`would publish ${spec}`);
    continue;
  }

  console.log(`publish ${spec}`);
  const result = spawnSync("npm", ["publish", "--workspace", workspace.name, "--access", "public"], {
    cwd: root,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function isPublished(spec) {
  const result = spawnSync("npm", ["view", "--prefer-online", spec, "version"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status === 0) return true;

  const output = `${result.stdout}\n${result.stderr}`;
  if (output.includes("E404") || output.includes("404 Not Found") || output.includes("No match found")) {
    return false;
  }

  throw new Error(`Failed checking npm registry for ${spec}:\n${output.trim()}`);
}
