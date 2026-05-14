import type { ApiTransport } from "../transport.js";

export class BaseResource {
  constructor(protected readonly transport: ApiTransport) {}
}
