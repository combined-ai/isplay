<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./resources/brand/isplay-logo.svg">
    <img src="./resources/brand/isplay-readme-logo.svg" alt="isplay" width="180">
  </picture>
</p>

<p align="center">
  Replay and analysis infrastructure for AI agents.
</p>

<p align="center">
  <a href="https://isplay.vercel.app">Website</a>
  ·
  <a href="https://isplay.vercel.app/docs">Docs</a>
  ·
  <a href="#quick-start">Quick Start</a>
</p>

## Overview

isplay records agent runs as structured evidence, then lets humans or analyst agents test controlled counterfactuals against that evidence. It captures context, model calls, tool proposals, tool executions, artifacts, checkpoints, branches, replays, experiments, effects, and validity labels.

The goal is not to guess why an agent failed. The goal is to preserve enough evidence to replay, compare, and explain behavior with visible uncertainty.

## What It Provides

- Structured run capture for agent systems.
- Checkpoints and branches for controlled interventions.
- Replay policies for recorded, live, or fixture-backed execution.
- Diff, metric, effect, and validity reporting for investigations.
- SDK, adapter kit, AI SDK integration, Mastra example, CLI, HTTP API, and docs app.

## Quick Start

```bash
npm install
npx isplay start
```

`isplay start` creates local artifacts, starts or reuses a Docker Postgres container, runs migrations, and starts the API server.

In another terminal:

```bash
export ISPLAY_API_URL=http://127.0.0.1:7373
npx isplay health
npx isplay projects create --name "Local Agent Lab"
export ISPLAY_PROJECT_ID="<id from JSON>"
```

## Web Docs

The frontend and documentation app lives in `packages/apps/web`.

```bash
npm run dev:web
npm run build:web
```

Production deploys run from GitHub Actions through Vercel using the `isplay` project.

## Repository Map

| Path | Purpose |
| --- | --- |
| `packages/core` | Shared schemas, IDs, and redaction primitives. |
| `packages/sdk` | Capture client and runtime surface. |
| `packages/adapters` | Adapter kit, AI SDK middleware, and runtime helpers. |
| `packages/apps/cli` | `isplay` command-line interface. |
| `packages/apps/server` | Local API server and replay routes. |
| `packages/apps/web` | Next.js site and documentation. |
| `resources/examples` | Copyable agent examples. |
| `resources/skills` | Agent analysis skill material. |

## License

MIT
