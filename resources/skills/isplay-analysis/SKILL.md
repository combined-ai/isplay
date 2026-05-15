---
name: isplay-analysis
description: Use this skill when analyzing isplay captured agent runs, replay traces, context inventories, hypothesis batches, fixture requirements, experiment statistics, or ranked effects. It guides an analyst agent through discovering what entered context, forming and testing hypotheses, running controlled counterfactual experiments, handling fixtures, and producing evidence-bounded reports.
---

# isplay Analysis

## Purpose

Use this skill to investigate agent behavior with isplay. The job is to produce evidence-bounded understanding, not causal certainty: discover the trace, raise concrete hypotheses, run controlled replay experiments, handle fixture requirements, compare effects, and report validity labels and residual uncertainty.

## Load The Right Reference

- For the platform concepts, object model, replay policies, and CLI/API map, read `references/platform-map.md`.
- For a complete tutorial from run discovery to final report, read `references/tutorial.md`.
- For forming, prioritizing, and testing hypotheses, read `references/hypothesis-playbook.md`.
- For reading a specific trace deeply, interpreting divergence, fixtures, and effects, read `references/trace-reading.md`.
- For copyable JSON inputs and CLI/API recipes, read `references/recipes.md`.
- For the final analyst report format, read `references/report-template.md`.

Load only the references needed for the current task. If the user asks for a full investigation, load all references except `recipes.md` only when you need exact command or JSON shapes.

## Default Workflow

1. Establish scope:
   - Identify `ISPLAY_API_URL`, `projectId`, and one or more `runId`s.
   - If a required identifier is missing and cannot be inferred from the workspace or latest artifacts, ask one concise question.
   - Prefer JSON CLI/API outputs over prose logs.

2. Discover the run:
   - Call `isplay discover run <runId>` or `GET /v1/runs/:id/catalog`.
   - Fetch context inventory for the run or relevant model call.
   - List checkpoints, model calls, tools, tool schemas, tool arguments, tool outputs, memory/retrieval items, state fields, and existing fixture coverage.

3. Build an evidence map:
   - Separate observed facts from inferred explanations.
   - Note first-order decision points: prompts/messages, model settings, retrieved chunks, memory, tool availability, tool descriptions, tool arguments, tool outputs, checkpoints, final output.
   - Identify side-effecting tools and avoid live execution unless the user explicitly asks and policy allows it.

4. Generate hypotheses:
   - Convert possible causes into testable intervention statements.
   - Prefer narrow hypotheses with one primary intervention.
   - Include expected effect, metric, direction, validity gates, and fixture plan.

5. Run experiments:
   - Use one batch call when testing many ideas.
   - Use repeated trials when nondeterminism or fixture sensitivity matters.
   - Use `recorded-only` model policy and `pause-for-fixture` tool policy by default.
   - Never claim live tool/model evidence if replay used analyst, AI, or simulator fixtures.

6. Resolve requirements:
   - Inspect open fixture requirements.
   - Ask the user for real outputs only when needed; otherwise create clearly labeled analyst fixtures if the task allows simulation.
   - Prefer branch-scoped fixtures for repeated trials with the same branch and args matcher.

7. Analyze results:
   - Read experiment results, trial matrix, statistics, effects, diffs, and replay attempts.
   - Rank effects by effect size, comparability, fixture dependency, and repeated-trial support.
   - Treat low-N, non-comparable, nondeterministic, and fixture-sensitive results as bounded evidence.

8. Report:
   - Use `references/report-template.md`.
   - Include what was observed, what changed under intervention, what remains uncertain, and the next experiment that would reduce uncertainty fastest.

## Guardrails

- Do not present isplay output as proof of causality.
- Do not run live models or tools unless the policy is explicit and the user requested it.
- Do not mutate prompts, tool outputs, or state without target refs and expected base hashes when available.
- Do not hide fixture dependence. Label it in every conclusion.
- If context inventory is sparse, say exactly what evidence is missing and avoid overfitting to final outputs.
