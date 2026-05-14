import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function dockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync("docker", ["info"]);
    return true;
  } catch {
    return false;
  }
}

export async function ensurePostgresContainer(options: {
  name?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
} = {}): Promise<string> {
  const name = options.name ?? "isplay-postgres";
  const port = options.port ?? 54329;
  const user = options.user ?? "isplay";
  const password = options.password ?? "isplay";
  const database = options.database ?? "isplay";

  if (!(await dockerAvailable())) {
    throw new Error("Docker is not available or the Docker daemon is not running. Set DATABASE_URL to use an external Postgres.");
  }

  const exists = await containerExists(name);
  if (exists) {
    await execFileAsync("docker", ["start", name]).catch(() => undefined);
  } else {
    await runDocker([
      "run",
      "-d",
      "--name",
      name,
      "-e",
      `POSTGRES_USER=${user}`,
      "-e",
      `POSTGRES_PASSWORD=${password}`,
      "-e",
      `POSTGRES_DB=${database}`,
      "-p",
      `${port}:5432`,
      "-v",
      "isplay-postgres:/var/lib/postgresql/data",
      "postgres:16-alpine"
    ]);
  }

  await waitForPostgres(name, user, database);
  return `postgres://${user}:${password}@127.0.0.1:${port}/${database}`;
}

async function runDocker(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("docker", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`docker ${args[0]} exited with ${code}`))));
  });
}

async function containerExists(name: string): Promise<boolean> {
  const { stdout } = await execFileAsync("docker", ["ps", "-a", "--format", "{{.Names}}"]);
  return stdout.split(/\r?\n/).includes(name);
}

async function waitForPostgres(name: string, user: string, database: string): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try {
      await execFileAsync("docker", ["exec", name, "pg_isready", "-U", user, "-d", database]);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  throw new Error("Timed out waiting for local isplay Postgres container.");
}
