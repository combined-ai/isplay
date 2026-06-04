<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./resources/brand/isplay-logo.svg">
    <img src="./resources/brand/isplay-readme-logo.svg" alt="isplay" width="180">
  </picture>
</p>

<h3 align="center">Replayable evidence for AI agents.</h3>

<p align="center">
  Capture runs, replay hypotheses, and explain agent behavior with diffs, metrics, and validity labels.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/isplay"><img alt="npm version" src="https://img.shields.io/npm/v/isplay?color=0f766e"></a>
  <a href="https://www.npmjs.com/package/isplay"><img alt="npm downloads" src="https://img.shields.io/npm/dm/isplay?color=0f766e"></a>
  <a href="https://github.com/combined-ai/isplay/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/combined-ai/isplay/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/combined-ai/isplay/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/combined-ai/isplay?style=flat&logo=github"></a>
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/github/license/combined-ai/isplay"></a>
</p>

<p align="center">
  <a href="https://isplay.dev">Website</a>
  ·
  <a href="https://isplay.dev/docs">Docs</a>
  ·
  <a href="https://github.com/combined-ai/isplay">GitHub</a>
</p>

## Why isplay

isplay is infrastructure for debugging agent decisions. It captures the evidence behind every turn: context, prompts, model and tool calls, artifacts, checkpoints, branches, replays, experiments, effects, and validity labels.

Use it when agent debugging needs to move past logs and vibes into replayable, testable decision forensics.

## Quick Start

Requires Node `>=22.22.0`. `start` uses Docker for the default local Postgres.

```bash
npm install isplay @isplay/sdk
npx isplay start
```

In another terminal:

```bash
export ISPLAY_API_URL=http://127.0.0.1:7373
npx isplay health
npx isplay projects create --name "Agent Lab"
```

## Surface Area

- [`isplay`](./packages/apps/cli): local stack, CLI, replay, jobs, and analysis.
- [`@isplay/sdk`](./packages/sdk): capture client and API convenience surface.
- [`@isplay/adapter-*`](./packages/adapters): AI SDK, Mastra, LangGraph, Codex, Claude Code, OpenClaw, and adapter kit packages.
- [`@isplay/server`](./packages/apps/server), [`@isplay/replay`](./packages/replay), [`@isplay/analysis`](./packages/analysis): API, replay engine, and evidence-bounded analysis.

For the full package map, CLI reference, and integration guides, use the [docs](https://isplay.dev/docs).

## License

MIT
