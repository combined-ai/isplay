import createClient from "openapi-fetch";
import { apiErrorOptions, IsplayApiError, summarizeError } from "./errors.js";
import type { ApiClientOptions } from "./options.js";
import type { IsplayPaths } from "./paths.js";

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

export class ApiTransport {
  readonly baseUrl: string;
  readonly client: ReturnType<typeof createClient<IsplayPaths>>;
  private readonly fetchImpl: (request: Request) => Promise<Response>;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.ISPLAY_API_URL ?? "http://127.0.0.1:7373";
    this.fetchImpl = options.fetch ? (request) => options.fetch?.(request) ?? fetch(request) : (request) => fetch(request);
    this.client = createClient<IsplayPaths>({
      baseUrl: this.baseUrl,
      headers: options.headers,
      fetch: this.fetchImpl
    });
  }

  unwrap<T>(result: ApiResult<T>, method: string, path: string): T {
    if (result.error !== undefined) {
      throw new IsplayApiError(
        `isplay API ${method} ${path} failed with ${result.response.status}: ${summarizeError(result.error)}`,
        apiErrorOptions(result.response, result.error, method, path)
      );
    }
    return result.data as T;
  }

  async text(path: string): Promise<string> {
    const response = await this.fetchImpl(new Request(`${this.baseUrl}${path}`));
    const payload = await response.text();
    if (!response.ok) throw new IsplayApiError(`isplay API GET ${path} failed with ${response.status}: ${payload.slice(0, 300)}`, apiErrorOptions(response, payload, "GET", path));
    return payload;
  }
}
