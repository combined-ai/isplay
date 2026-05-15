# Trace Reading Guide

## Inventory First

Do not start with the final answer. Fetch catalog and context inventory, then scan:

- `system_message`, `developer_message`, `user_message`
- `model_setting`
- `tool_schema`
- `tool_argument`
- `tool_result`
- `retrieval_chunk`
- `memory_item`
- `state_field`

For each item, capture the path, content hash, artifact/ref ID, and whether it was model-visible, tool-visible, or state-only.

## Timeline Reading

Read the trace as a sequence:

1. Run started.
2. Checkpoint created.
3. Model call started with request artifact.
4. Tool proposals emitted by the model.
5. Tool executions started and finished.
6. Checkpoints after important state changes.
7. Final model response or run completion.

Separate model proposals from executed tools. A proposal shows model intent; an execution shows orchestration/runtime behavior.

## First Divergence

For replays, first divergence is the earliest step where base and branch signatures differ. Interpret it with context:

- Before intervention: experiment setup may be wrong.
- At intervention: expected.
- After intervention but before tool result: model/tool selection changed.
- At fixture injection: conclusion depends on fixture validity.
- After fixture: downstream behavior changed under assumed output.

Always inspect changed descendants, not only first divergence.

## Comparability

- `exact`: event sequence matched.
- `aligned`: replay differs only in expected replay artifacts or alignment.
- `diverged_but_comparable`: traces differ but can still be compared.
- `non_comparable`: drift is too large for meaningful comparison.

If non-comparable, narrow the intervention or choose a later checkpoint.

## Tool Responses

Tool responses can be observed, recorded fixtures, analyst fixtures, AI fixtures, simulator outputs, or live outputs. In reports:

- Observed tool output supports baseline claims.
- Fixture output supports conditional counterfactual claims.
- Simulator output supports claims only as far as the simulator is valid.
- AI-generated fixture output is weak unless validated by domain checks.

For divergent tool calls, compare args, schema version, side-effect class, auth scope, and fixture provenance.

## Statistical Reading

Read experiment statistics before drawing conclusions:

- `success_rate`
- `tool_argument_changed_rate`
- `fixtureDependencyRate`
- `nonComparableRate`
- first divergence distribution or mean
- low-N marker

Confidence intervals at low N are wide. Prefer "suggests" and "under tested conditions" unless repeated trials are robust.

## Evidence Strength

Stronger evidence:

- Repeated comparable trials.
- Low fixture dependency.
- Narrow interventions.
- First divergence at expected site.
- Direct downstream metric movement.

Weaker evidence:

- Single trial.
- Broad prompt rewrite.
- AI fixture.
- Non-comparable branch.
- Final-answer-only change with no trace-level support.
