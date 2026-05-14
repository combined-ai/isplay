import {
  applyCapturePolicy,
  toJsonValue,
  type CapturePolicy,
  type JsonValue,
  type RedactionReport
} from "@isplay/core";

export type CapturedValue = {
  value: JsonValue;
  report: RedactionReport;
};

export function captureValue(value: unknown, policy: CapturePolicy | undefined): CapturedValue {
  const json = toJsonValue(value);
  return applyCapturePolicy(json, policy);
}

export function captureMetadata(report: RedactionReport): Record<string, JsonValue> {
  return {
    redactionReport: {
      fieldsDropped: report.fieldsDropped,
      fieldsMasked: report.fieldsMasked,
      fieldsHashed: report.fieldsHashed,
      patternsMatched: report.patternsMatched
    }
  };
}
