import { OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import type { IsplayStore } from "@isplay/postgres";

export type AppBindings = {
  Variables: {
    store: IsplayStore;
  };
};

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  message: z.string().optional(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
  retryable: z.boolean().optional(),
  recoverable: z.boolean().optional()
});

export function createApiApp(): OpenAPIHono<AppBindings> {
  const app = new OpenAPIHono<AppBindings>({
    defaultHook: (result, c) => {
      if (!result.success) return errorResponse(c, 400, "invalid_request", "Invalid request", result.error.flatten(), false, true);
    }
  });
  app.onError((error, c) => {
    if (error instanceof ZodError) return errorResponse(c, 400, "invalid_request", "Invalid request", error.flatten(), false, true);
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("not found")) return errorResponse(c, 404, "not_found", message, undefined, false, false);
    if (message.includes("differ") || message.includes("Unsafe") || message.includes("Stale")) return errorResponse(c, 400, "invalid_request", message, undefined, false, true);
    return errorResponse(c, 500, "internal_error", message, undefined, true, false);
  });
  return app;
}

export function jsonContent(schema: z.ZodType, description: string) {
  return {
    content: {
      "application/json": {
        schema
      }
    },
    description
  };
}

export function jsonBody(schema: z.ZodType) {
  return {
    content: {
      "application/json": {
        schema
      }
    }
  };
}

export function notFound(c: Context, resource: string): Response {
  return errorResponse(c, 404, "not_found", `${resource} not found`, undefined, false, false);
}

export function ensureSame(actual: string | undefined, expected: string, message: string): void {
  if (actual !== expected) throw new Error(message);
}

// Zod OpenAPI preserves route-specific handler types; this helper intentionally centralizes the narrow bridge.
export function registerRoute(app: OpenAPIHono<AppBindings>, route: unknown, handler: (c: any) => unknown): void {
  (app as any).openapi(route, handler);
}

function errorResponse(c: Context, status: 400 | 404 | 500, code: string, message: string, details: unknown, retryable: boolean, recoverable: boolean): Response {
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  return c.json({ error: message, code, message, details, requestId, retryable, recoverable }, status);
}
