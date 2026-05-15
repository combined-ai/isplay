# Hypothesis Playbook

## Hypothesis Shape

Use this structure:

```text
Because <evidence ref> entered context at <point>, the agent chose <behavior>.
If we <intervention>, then <metric/effect> should <direction>, assuming <fixture/model policy>.
```

Every hypothesis needs:

- A target ref: event, model call, artifact, checkpoint, tool name, or context item.
- A narrow intervention.
- An expected effect.
- A metric or observable.
- A validity gate.

## Good Intervention Targets

- `message_patch`: system, developer, user, or assistant message content.
- `prompt_clause_mask`: one instruction or clause, not the whole prompt.
- `tool_args_patch`: tool arguments from a proposal or execution.
- `tool_schema_patch`: tool description, schema, or availability.
- `retrieval_substitution`: one retrieved chunk or source.
- `state_patch`: one state field at checkpoint.
- `model_config_patch`: temperature, max steps, model name, or provider config.

Use expected base hashes when patching observed context. They prevent stale experiments.

## Prioritization

Rank ideas by:

1. Proximity to first divergence.
2. Directness of downstream path.
3. Ability to isolate one change.
4. Low fixture burden.
5. Actionability if supported.
6. Low safety risk.

High-value hypotheses often target tool outputs, retrieval chunks, system instructions, and tool descriptions because they are concrete and replayable.

## Trial Planning

- Use `repetitions: 1` for quick triage.
- Use `repetitions: 2` or `3` for a fast confidence signal.
- Use more repetitions when model policy is live or nondeterministic.
- Set `maxReplays` to cap runaway experiments.
- Use `minimum_trials` gates when making comparative claims.

## Fixture Planning

Before running, predict which tools may diverge:

- Read-only lookup tools usually accept analyst or simulator fixtures.
- Side-effecting tools should be blocked or simulated.
- External mutation tools need explicit provenance and audit labels.
- If the tool output is the suspected cause, run at least two fixture variants.

Never blend fixture-dependent and observed outcomes without labeling them separately.

## Common Pitfalls

- Patching too much at once: split into separate hypotheses.
- Starting after the cause: choose an earlier checkpoint.
- Treating final-answer diff as root cause: inspect trace and tool diffs.
- Ignoring tool schema changes: the model may choose tools based on descriptions.
- Ignoring missing context: if inventory lacks retrieval or memory, say so.
- Over-reading low-N results: mark inconclusive and recommend repeats.

## Next Experiment Heuristics

- If top effect is fixture-sensitive: run alternate fixtures.
- If top effect is early divergence: patch a narrower upstream input.
- If result is non-comparable: restart from a later checkpoint or reduce intervention size.
- If no effect: test a sibling hypothesis near the same decision point.
- If repeated trials disagree: run determinism probe or increase repetitions.
