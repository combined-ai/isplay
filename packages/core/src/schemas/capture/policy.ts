import { z } from "zod";

export const CaptureActionSchema = z.enum(["capture", "drop", "hash", "mask", "encrypt", "artifact_only", "metadata_only"]);
export type CaptureAction = z.infer<typeof CaptureActionSchema>;

export const CapturePolicySchema = z.object({
  defaultAction: CaptureActionSchema.default("capture"),
  rules: z
    .array(
      z.object({
        path: z.string(),
        action: CaptureActionSchema,
        reason: z.string().optional()
      })
    )
    .default([])
});
export type CapturePolicy = z.infer<typeof CapturePolicySchema>;

export const RedactionReportSchema = z.object({
  fieldsDropped: z.number().int().nonnegative(),
  fieldsMasked: z.number().int().nonnegative(),
  fieldsHashed: z.number().int().nonnegative(),
  patternsMatched: z.record(z.string(), z.number().int().nonnegative())
});
export type RedactionReport = z.infer<typeof RedactionReportSchema>;
