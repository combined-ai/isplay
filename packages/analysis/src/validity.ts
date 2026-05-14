import type { DiffRecord, Metric, ValidityLabel } from "@isplay/core";

export function validityLabelsFor(diffs: DiffRecord[], metrics: Metric[]): ValidityLabel[] {
  const labels = new Set<ValidityLabel>();
  if (diffs.some((diff) => diff.comparability === "non_comparable")) labels.add("non_comparable");
  if (diffs.some((diff) => diff.comparability === "diverged_but_comparable")) labels.add("diverged_but_comparable");
  if (metrics.some((metric) => metric.name.includes("fixture") && metric.value > 0)) labels.add("sensitive_to_fixture");
  if (metrics.some((metric) => metric.name.includes("variance") && metric.value > 0)) labels.add("model_nondeterministic");
  if (!labels.size && metrics.length) labels.add("confirmed_by_replay");
  if (!labels.size) labels.add("unsupported");
  return Array.from(labels);
}
