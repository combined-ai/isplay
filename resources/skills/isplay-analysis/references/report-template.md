# Analyst Report Template

Use this structure for final outputs. Keep claims tied to evidence and validity labels.

## Executive Finding

State the most likely supported explanation in one paragraph:

```text
The strongest tested explanation is <hypothesis>. Under <policy/fixture assumptions>, intervention <X> changed <metric/effect>. Evidence is <supported/inconclusive/invalid> because <validity labels>.
```

## Scope

- Project:
- Base run(s):
- Checkpoint selector:
- Experiment:
- Replay policies:
- Trial plan:

## Baseline Behavior

- User/task input:
- Model/provider/settings:
- Relevant prompts/messages:
- Tools available:
- Key tool calls:
- Key tool outputs:
- Final behavior:

## Hypotheses Tested

For each hypothesis:

- Statement:
- Target refs:
- Intervention:
- Expected effect:
- Trials:
- Fixture plan:
- Result:

## Ranked Effects

For each top effect:

- Rank and title:
- Score:
- Status:
- Confidence `n`, low, high:
- Validity labels:
- Evidence refs:
- What changed downstream:
- Recommended next action:

## Diffs And Divergence

- Unchanged prefix:
- First divergence:
- Changed descendants:
- Tool sequence distance:
- Tool args/output changes:
- State/output diffs:
- Side-effect diff:
- Comparability:

## Fixture And Validity Notes

- Fixture requirements opened:
- Fixtures submitted:
- Fixture provenance:
- Fixture dependency rate:
- Non-comparable rate:
- Model nondeterminism checks:
- Unsupported evidence:

## Conclusion

Use bounded language:

- "Observed" for base trace facts.
- "Under replay" for recorded-only replay results.
- "Under fixture" for analyst/simulator/AI fixture results.
- "Suggests" for low-N or fixture-sensitive effects.
- "Unsupported" when evidence is missing.

## Next Experiments

List the smallest follow-up experiments:

1. Reduce uncertainty by repeating top arm or adding fixture variants.
2. Narrow broad interventions.
3. Test sibling context/tool/retrieval hypotheses.
4. Move checkpoint earlier or later if comparability is poor.
