import { IsplayApiError } from "@isplay/api-client";
import type { CommanderError } from "commander";

export function isCommanderExit(error: unknown): error is CommanderError {
  return Boolean(error && typeof error === "object" && "exitCode" in error && "code" in error);
}

export function printCliError(error: unknown, json: boolean): void {
  if (json) {
    console.error(JSON.stringify(toErrorObject(error), null, 2));
    return;
  }
  console.error(toErrorObject(error).message);
}

function toErrorObject(error: unknown): { code: string; message: string; details?: unknown } {
  if (error instanceof IsplayApiError) {
    return { code: "api_error", message: error.message, details: { status: error.status, body: error.body } };
  }
  if (error instanceof Error) return { code: "cli_error", message: error.message };
  return { code: "cli_error", message: String(error) };
}
