import { RpcError } from "./errors.js";
import type { ClientTransport, JsonRpcFailure, JsonRpcResponse } from "./types.js";

export class RpcRemoteError extends Error {
  constructor(message: string, public readonly code: number, public readonly data: unknown, public readonly id: string | number | null) {
    super(message);
    this.name = "RpcRemoteError";
  }
}

export interface CallOptions { signal?: AbortSignal; timeout?: number }
export interface BatchCall { method: string; params?: unknown }

function signalFor(options: CallOptions = {}): AbortSignal | undefined {
  if (!options.timeout) return options.signal;
  const timer = AbortSignal.timeout(options.timeout);
  return options.signal ? AbortSignal.any([options.signal, timer]) : timer;
}

export class Client {
  #id = 0;
  constructor(readonly transport: ClientTransport) {
    if (!transport) throw new Error("emptyTransport");
  }

  request(method: string, params?: unknown, setId = true): Record<string, unknown> {
    const request: Record<string, unknown> = { jsonrpc: "2.0", method };
    if (params !== undefined) request.params = params;
    if (setId) request.id = ++this.#id;
    return request;
  }

  async call<T = unknown>(method: string, params?: unknown, options?: CallOptions): Promise<T> {
    const request = this.request(method, params);
    const raw = await this.transport.send(request, { signal: signalFor(options) });
    if (!raw) throw new RpcRemoteError("Missing JSON-RPC response", -32603, undefined, request.id as number);
    const response = this.parse(raw);
    if (Array.isArray(response) || response.id !== request.id) throw new RpcRemoteError("Unexpected JSON-RPC response id", -32603, undefined, request.id as number);
    return this.unwrap<T>(response);
  }

  async notify(method: string, params?: unknown, options?: CallOptions): Promise<void> {
    await this.transport.send(this.request(method, params, false), { signal: signalFor(options) });
  }

  async batch<T = unknown>(calls: readonly BatchCall[], options?: CallOptions): Promise<T[]> {
    const requests = calls.map((call) => this.request(call.method, call.params));
    if (!requests.length) return [];
    const raw = await this.transport.send(requests, { signal: signalFor(options) });
    if (!raw) throw new RpcRemoteError("Missing JSON-RPC batch response", -32603, undefined, null);
    const response = this.parse(raw);
    if (!Array.isArray(response)) throw new RpcRemoteError("Expected JSON-RPC batch response", -32603, undefined, null);
    const byId = new Map(response.map((item) => [item.id, item]));
    return requests.map((request) => {
      const item = byId.get(request.id as number);
      if (!item) throw new RpcRemoteError("Unexpected JSON-RPC response id", -32603, undefined, request.id as number);
      return this.unwrap<T>(item);
    });
  }

  private parse(raw: string): JsonRpcResponse | JsonRpcResponse[] {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const valid = (value: unknown): value is JsonRpcResponse => typeof value === "object" && value !== null && (value as { jsonrpc?: unknown }).jsonrpc === "2.0" && "id" in value && ("result" in value || "error" in value);
      if (Array.isArray(parsed) ? !parsed.every(valid) : !valid(parsed)) throw new Error("Invalid JSON-RPC response");
      return parsed as JsonRpcResponse | JsonRpcResponse[];
    } catch (error) {
      throw new RpcRemoteError(error instanceof Error ? error.message : "Invalid JSON-RPC response", -32603, undefined, null);
    }
  }

  private unwrap<T>(response: JsonRpcResponse): T {
    if ("error" in response) {
      const failure = response as JsonRpcFailure;
      throw new RpcRemoteError(failure.error.message, failure.error.code, failure.error.data, failure.id);
    }
    return response.result as T;
  }
}
