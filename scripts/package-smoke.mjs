import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(tmpdir(), `isplay-pack-${Date.now()}`);
mkdirSync(outDir, { recursive: true });

try {
  const workspaceJson = execFileSync("npm", ["query", ".workspace", "--json"], { cwd: root, encoding: "utf8" });
  const publicWorkspaces = JSON.parse(workspaceJson).filter((workspace) => !workspace.private);
  const packages = publicWorkspaces.flatMap((workspace) => {
    const output = execFileSync("npm", ["pack", "--json", "--workspace", workspace.name, "--pack-destination", outDir], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"]
    });
    const packed = JSON.parse(output);
    return Array.isArray(packed) ? packed : [packed];
  });
  const failures = [];

  for (const pkg of packages) {
    const files = new Set(pkg.files.map((file) => file.path));
    if (!files.has("dist/index.js")) failures.push(`${pkg.name} is missing dist/index.js`);
    if (!files.has("dist/index.d.ts")) failures.push(`${pkg.name} is missing dist/index.d.ts`);
    if (!files.has("README.md")) failures.push(`${pkg.name} is missing README.md`);
    if (!files.has("LICENSE")) failures.push(`${pkg.name} is missing LICENSE`);
    for (const file of files) {
      if (file.startsWith("src/") || file.endsWith(".test.ts")) failures.push(`${pkg.name} ships source/test file ${file}`);
    }
  }

  if (failures.length) {
    throw new Error(`Package smoke failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  }

  const publicPackages = packages;
  const installDir = path.join(outDir, "install");
  mkdirSync(installDir, { recursive: true });
  writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ type: "module", private: true }, null, 2));

  const tarballs = publicPackages.map((pkg) => path.join(outDir, pkg.filename));
  const peerSpecs = collectPeerSpecs(new Set(publicPackages.map((pkg) => pkg.name)));
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", ...tarballs, ...peerSpecs], {
    cwd: installDir,
    stdio: "inherit"
  });

  const importNames = publicPackages.map((pkg) => pkg.name);
  const importScript = `
    const packages = ${JSON.stringify(importNames)};
    for (const name of packages) {
      await import(name);
    }
  `;
  execFileSync(process.execPath, ["--input-type=module", "--eval", importScript], { cwd: installDir, stdio: "inherit" });
  execFileSync(path.join(installDir, "node_modules", ".bin", "isplay"), ["--help"], { cwd: installDir, stdio: "ignore" });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

function collectPeerSpecs(publicNames) {
  const workspaceJson = execFileSync("npm", ["query", ".workspace", "--json"], { cwd: root, encoding: "utf8" });
  const workspaces = JSON.parse(workspaceJson);
  const specs = new Map();
  for (const workspace of workspaces) {
    if (!publicNames.has(workspace.name)) continue;
    for (const [name, range] of Object.entries(workspace.peerDependencies ?? {})) {
      if (workspace.peerDependenciesMeta?.[name]?.optional) continue;
      specs.set(name, `${name}@${range}`);
    }
  }
  return [...specs.values()];
}
