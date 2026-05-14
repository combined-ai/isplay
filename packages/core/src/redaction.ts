import type { CapturePolicy, JsonValue, RedactionReport } from "./schemas.js";

const DEFAULT_SECRET_KEY = /api[-_]?key|authorization|password|secret|token|cookie|session|private[-_]?key/i;
const DEFAULT_PATTERNS: Array<[string, RegExp]> = [
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["phone", /\+?\d[\d\s().-]{7,}\d/g],
  ["api_key", /\b(?:sk|pk|rk|ak|api|key|token)_[A-Za-z0-9_\-]{16,}\b/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g],
  ["credit_card", /\b(?:\d[ -]*?){13,19}\b/g]
];

export function applyCapturePolicy(
  value: JsonValue,
  policy: CapturePolicy = { defaultAction: "capture", rules: [] }
): { value: JsonValue; report: RedactionReport } {
  const report: RedactionReport = {
    fieldsDropped: 0,
    fieldsMasked: 0,
    fieldsHashed: 0,
    patternsMatched: {}
  };
  return { value: visit(value, [], policy, report), report };
}

function visit(value: JsonValue, path: string[], policy: CapturePolicy, report: RedactionReport): JsonValue {
  const action = actionForPath(path, policy);
  if (action === "drop") {
    report.fieldsDropped += 1;
    return null;
  }
  if (action === "mask" || action === "metadata_only" || action === "artifact_only" || action === "encrypt") {
    report.fieldsMasked += 1;
    return "[REDACTED]";
  }
  if (action === "hash") {
    report.fieldsHashed += 1;
    return "[HASHED]";
  }

  if (typeof value === "string") return redactString(value, report);
  if (Array.isArray(value)) return value.map((item, index) => visit(item, [...path, String(index)], policy, report));
  if (value && typeof value === "object") {
    const output: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = DEFAULT_SECRET_KEY.test(key) ? maskSecret(report) : visit(item, [...path, key], policy, report);
    }
    return output;
  }
  return value;
}

function actionForPath(path: string[], policy: CapturePolicy): CapturePolicy["defaultAction"] {
  const joined = path.join(".");
  const match = policy.rules?.find((rule) => rule.path === joined || joined.startsWith(`${rule.path}.`));
  return match?.action ?? policy.defaultAction;
}

function maskSecret(report: RedactionReport): JsonValue {
  report.fieldsMasked += 1;
  return "[REDACTED]";
}

function redactString(input: string, report: RedactionReport): string {
  return DEFAULT_PATTERNS.reduce((text, [name, regex]) => {
    return text.replace(regex, () => {
      report.patternsMatched[name] = (report.patternsMatched[name] ?? 0) + 1;
      return "[REDACTED]";
    });
  }, input);
}
