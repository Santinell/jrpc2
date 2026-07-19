import type { ClientTransport } from "../types.js";

export interface HttpClientTransportOptions { url: string; headers?: Record<string, string> | Headers; fetch?: typeof globalThis.fetch }
export class HttpClientTransport implements ClientTransport {
  #headers: Headers;
  #fetch: typeof globalThis.fetch;
  constructor(private readonly options: HttpClientTransportOptions) { this.#headers = new Headers(options.headers); this.#fetch = options.fetch ?? globalThis.fetch; }
  setHeader(name: string, value: string): void { this.#headers.set(name, value); }
  removeHeader(name: string): void { this.#headers.delete(name); }
  async send(payload: unknown, options: { signal?: AbortSignal } = {}): Promise<string | null> {
    const response = await this.#fetch(this.options.url, { method: "POST", headers: this.#headers, body: JSON.stringify(payload), signal: options.signal });
    return response.status === 204 ? null : await response.text();
  }
}
