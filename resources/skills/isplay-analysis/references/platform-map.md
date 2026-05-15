# Platform Map

## Core Objects

- `project`: API boundary and logical workspace.
- `run`: one captured agent execution.
- `event`: ordered run stream.
- `model_call`: provider/model/settings plus request and response artifacts.
- `tool_proposal`: model-proposed tool call.
- `tool_execution`: actually executed tool call and output/error artifact.
- `checkpoint`: explicit restart point with state snapshot and hash.
- `context_inventory`: what entered model/tool/state context.
- `branch`: checkpoint fork plus interventions.
- `replay`: replay job/result.
- `replay_attempt`: one execution attempt of a replay/trial.
- `replay_step`: step-level replay decision.
- `fixture_requirement`: missing divergent tool output that pauses replay.
- `tool_fixture`: recorded or analyst/simulator/live output used during replay.
- `fixture_use`: actual use of a fixture in an attempt.
- `experiment`: batch of arms and trials.
- `effect`: ranked candidate explaining what changed.

## Default Policies

- Model policy: use `recorded-only` unless the user asks for a diagnostic live policy.
- Tool policy: use `pause-for-fixture` unless exact recorded-only replay is required.
- Drift policy: use `continue_to_terminal` for analysis; use `stop_on_first_divergence` only when isolating a single decision.
- Repetitions: use at least 3 for nondeterminism checks when cost allows; use 2 for a fast smoke test.

## CLI Map

```bash
isplay start
isplay discover run <runId>
isplay experiments run <experimentId|file.json>
isplay experiments results <experimentId>
isplay requirements list <experimentId>
isplay fixtures add <replayId> --project <projectId> --tool <name> --file output.json
isplay effects list <experimentId>
isplay effects explain <effectId> --experiment <experimentId>
isplay diff <replayId>
```

## API Map

- `GET /v1/runs/:id/catalog`
- `GET /v1/runs/:id/context-inventory`
- `GET /v1/model-calls/:id/context-inventory`
- `POST /v1/context/search`
- `POST /v1/hypothesis-batches`
- `POST /v1/experiments/:id/run`
- `GET /v1/experiments/:id/results`
- `GET /v1/experiments/:id/requirements`
- `GET /v1/experiments/:id/statistics`
- `GET /v1/experiments/:id/effects`
- `GET /v1/replays/:id/diff`
- `GET /v1/replays/:id/effects`

## Validity Labels

- `confirmed_by_replay`: comparable replay evidence with no major caveats.
- `sensitive_to_fixture`: conclusion depends on injected tool output.
- `model_nondeterministic`: repeated runs varied under same policy.
- `diverged_but_comparable`: traces diverged but still support comparison.
- `non_comparable`: branch drift broke meaningful comparison.
- `unsupported`: evidence is incomplete or not replay-backed.

## Interpretation Rule

Validity labels travel with every conclusion. If an effect is fixture-sensitive and low-N, phrase it as: "Under this fixture and this small trial set, the intervention changed X; more fixture sensitivity trials are needed before treating it as robust."
