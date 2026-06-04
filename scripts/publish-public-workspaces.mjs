import { execFileSync, spawnSync } from "node:child_process";

const root = process.cwd();
const dryRun = process.argv.includes("--dry-run");
const releaseTag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME;

const workspaceJson = execFileSync("npm", ["query", ".workspace", "--json"], {
  cwd: root,
  encoding: "utf8"
});
const workspaces = sortForPublish(JSON.parse(workspaceJson).filter((workspace) => !workspace.private));

assertReleaseTag(workspaces);

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

function assertReleaseTag(workspaces) {
  if (!releaseTag) return;

  const tagVersion = releaseTag.startsWith("v") ? releaseTag.slice(1) : releaseTag;
  const mismatches = workspaces
    .filter((workspace) => workspace.version !== tagVersion)
    .map((workspace) => `${workspace.name}@${workspace.version}`);

  if (mismatches.length) {
    throw new Error(`Release tag ${releaseTag} does not match publishable workspace versions:\n${mismatches.join("\n")}`);
  }
}

function sortForPublish(workspaces) {
  const byName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  const remainingDeps = new Map();
  const dependents = new Map(workspaces.map((workspace) => [workspace.name, []]));

  for (const workspace of workspaces) {
    const internalDeps = internalDependencyNames(workspace, byName);
    remainingDeps.set(workspace.name, new Set(internalDeps));
    for (const dependencyName of internalDeps) {
      dependents.get(dependencyName)?.push(workspace.name);
    }
  }

  const ready = workspaces
    .filter((workspace) => remainingDeps.get(workspace.name)?.size === 0)
    .map((workspace) => workspace.name);
  const sorted = [];

  while (ready.length) {
    const name = ready.shift();
    sorted.push(byName.get(name));

    for (const dependentName of dependents.get(name) ?? []) {
      const deps = remainingDeps.get(dependentName);
      deps.delete(name);
      if (deps.size === 0) ready.push(dependentName);
    }
  }

  if (sorted.length !== workspaces.length) {
    const cycle = workspaces
      .filter((workspace) => !sorted.includes(workspace))
      .map((workspace) => `${workspace.name} depends on ${[...(remainingDeps.get(workspace.name) ?? [])].join(", ")}`);
    throw new Error(`Cannot publish workspaces with cyclic internal dependencies:\n${cycle.join("\n")}`);
  }

  return sorted;
}

function internalDependencyNames(workspace, byName) {
  return ["dependencies", "peerDependencies", "optionalDependencies"]
    .flatMap((field) => Object.keys(workspace[field] ?? {}))
    .filter((name) => byName.has(name));
}
