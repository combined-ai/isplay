<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./resources/brand/isplay-logo.svg">
    <img src="./resources/brand/isplay-readme-logo.svg" alt="isplay" width="180">
  </picture>
</p>

<h3 align="center">Replay infrastructure for agent decisions.</h3>

<p align="center">
  Capture the evidence behind a run, branch from checkpoints, and give human or AI analysts the replays, diffs, metrics, fixtures, and validity labels they need to explain what happened.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/isplay"><img alt="npm version" src="https://img.shields.io/npm/v/isplay?color=0f766e"></a>
  <a href="https://www.npmjs.com/package/isplay"><img alt="npm downloads" src="https://img.shields.io/npm/dm/isplay?color=0f766e"></a>
  <a href="https://github.com/combined-ai/isplay/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/combined-ai/isplay/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/combined-ai/isplay"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-isplay-181717?logo=github"></a>
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-0f766e"></a>
</p>

<p align="center">
  <a href="https://isplay.dev">Website</a>
  ·
  <a href="https://isplay.dev/docs">Docs</a>
  ·
  <a href="https://github.com/combined-ai/isplay">GitHub</a>
</p>

## Why isplay

isplay is replay and analysis infrastructure for understanding agent decisions. It records the context behind each turn: prompts, model calls, tool calls, artifacts, checkpoints, branches, replay outputs, experiments, effects, and validity labels.

That gives humans and analyst agents a shared evidence system for decision forensics: reconstruct the baseline run, test counterfactual hypotheses, compare divergences, rank effects, and separate observed facts from supported, fixture-sensitive, or unsupported explanations.

Use it when logs are not enough and you need a repeatable way to ask why an agent made a decision, what evidence supports that explanation, and what uncertainty remains.

## Quick Start

Most teams should start with the agent skill. It installs the right pieces for the repo, chooses the adapter, captures the next run, and starts the investigation loop.

```bash
npx skills add combined-ai/isplay --skill isplay-analysis -a codex
```

Restart Codex, then prompt the agent:

```text
Use $isplay-analysis to set up isplay for this repo, choose the right adapter, capture my next run, and return an evidence-bounded RCA report.
```

Manual CLI and SDK setup are covered in the [docs](https://isplay.dev/docs/install).

## Surface Area

- [`isplay`](./packages/apps/cli): local stack, CLI, replay, jobs, and analysis.
- [`@isplay/sdk`](./packages/sdk): capture client and API convenience surface.
- [`@isplay/adapter-*`](./packages/adapters): AI SDK, Mastra, LangGraph, Codex, Claude Code, OpenClaw, and adapter kit packages.
- [`@isplay/server`](./packages/apps/server), [`@isplay/replay`](./packages/replay), [`@isplay/analysis`](./packages/analysis): API, replay engine, and evidence-bounded analysis.

For the full package map, CLI reference, and integration guides, use the [docs](https://isplay.dev/docs).

## License

MIT
