# Recipes

## Discover A Run

```bash
export ISPLAY_API_URL=http://127.0.0.1:7373
isplay discover run <runId>
```

API:

```bash
curl "$ISPLAY_API_URL/v1/runs/<runId>/context-inventory"
curl "$ISPLAY_API_URL/v1/runs/<runId>/catalog"
```

## One-Call Hypothesis Batch

```json
{
  "projectId": "project_...",
  "baseRunIds": ["run_..."],
  "checkpointSelector": { "kind": "first" },
  "hypotheses": [
    {
      "statement": "Removing the duplicate receipt signal should reduce escalation behavior.",
      "interventions": [
        {
          "kind": "tool_args_patch",
          "target": { "refId": "tool_...", "toolName": "risk-signals" },
          "expectedBaseHash": "context_item_content_hash",
          "patch": {
            "toolName": "risk-signals",
            "args": { "claimId": "CLM_2002", "claimedAmount": 900 }
          }
        }
      ],
      "expectedEffect": { "metric": "tool_argument_changed", "direction": "increase" }
    }
  ],
  "trialPlan": {
    "repetitions": 3,
    "concurrency": 1,
    "maxReplays": 3,
    "seedPolicy": "none",
    "stopRule": "none"
  },
  "policy": {
    "model": "recorded-only",
    "tool": "pause-for-fixture",
    "drift": "continue_to_terminal",
    "maxSteps": 100
  },
  "validityGates": [{ "kind": "minimum_trials", "value": 3 }]
}
```

Run with CLI:

```bash
isplay experiments run experiment.json
```

## Resolve Fixture Requirement

List requirements:

```bash
isplay requirements list <experimentId>
```

Create `fixture-output.json`, then submit it:

```bash
isplay fixtures add <replayId> \
  --project <projectId> \
  --tool <toolName> \
  --file fixture-output.json
```

For repeated trials, prefer a branch-scoped fixture through the API or SDK by setting metadata:

```json
{
  "projectId": "project_...",
  "replayId": "replay_...",
  "branchId": "branch_...",
  "toolName": "risk-signals",
  "matcher": { "argsHash": "..." },
  "output": { "riskScore": 0.18, "flags": [] },
  "provenance": "analyst_fixture",
  "author": "analyst",
  "metadata": { "scope": "branch" }
}
```

## Inspect Effects

```bash
isplay effects list <experimentId>
isplay effects explain <effectId> --experiment <experimentId>
isplay experiments results <experimentId>
```

## Context Search

```bash
curl -X POST "$ISPLAY_API_URL/v1/context/search" \
  -H "content-type: application/json" \
  -d '{"projectId":"project_...","runId":"run_...","kinds":["tool_argument"],"query":"risk","limit":20}'
```
