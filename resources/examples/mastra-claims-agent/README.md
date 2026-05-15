# Mastra Claims Agent Demo

This demo exercises isplay against a Mastra agent with multiple tools and non-trivial branching decisions.

Run it against a local isplay API:

```bash
npm run build
npm run dev:cli -- start
AI_GATEWAY_API_KEY=... npm run demo:mastra-claims
```

The script:

- Creates an isplay project when `ISPLAY_PROJECT_ID` is not set.
- Runs several live Mastra agent scenarios through Vercel AI Gateway.
- Captures model calls, tool proposals, tool executions, checkpoints, and artifacts.
- Uses the one-call hypothesis batch API to create a branch from a checkpoint.
- Applies a typed tool-argument intervention to a captured risk tool call.
- Replays two trials, pauses for the missing divergent fixture, submits a branch-scoped analyst fixture, resumes, diffs, ranks effects, and writes `.isplay/mastra-claims-analysis.json`.

No gateway key is written to disk.
