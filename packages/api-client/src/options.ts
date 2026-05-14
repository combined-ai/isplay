export type ApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
};
