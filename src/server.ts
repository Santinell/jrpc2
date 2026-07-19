import { isRpcError, RpcError } from "./errors.js";
import { collectFromClass } from "./module.js";
import { getRegisteredModules, onModuleRegistered, type RpcModuleEntry } from "./decorators.js";
import { onMethodRegistered, registeredMethods } from "./method.js";
import { mapPositional, validateParams } from "./schema.js";
import { MethodRegistry } from "./registry.js";
import type { ErrorHook, JsonRpcId, JsonRpcRequest, JsonRpcResponse, MethodDef, RequestHook, RpcContext } from "./types.js";

export interface ServerOptions {
  context?: Record<string, unknown>;
  positionalParams?: "map" | "reject";
  exposeErrors?: boolean;
  trustProxy?: boolean | ((remoteAddress: string) => boolean);
  onRequest?: RequestHook | RequestHook[];
  onError?: ErrorHook;
  batch?: { maxSize?: number; concurrency?: number };
  maxConcurrency?: number;
}

class Semaphore {
  #active = 0;
  #waiters: Array<() => void> = [];
  constructor(private readonly limit: number) {}
  async use<T>(fn: () => Promise<T>): Promise<T> {
    if (this.limit !== Infinity) await new Promise<void>((resolve) => {
      if (this.#active < this.limit) resolve(); else this.#waiters.push(resolve);
    });
    this.#active++;
    try { return await fn(); } finally {
      this.#active--;
      this.#waiters.shift()?.();
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validId(value: unknown): value is JsonRpcId {
  return value === null || typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function serializable(response: JsonRpcResponse): JsonRpcResponse {
  try {
    JSON.stringify(response);
    return response;
  } catch {
    return RpcError.internalError().toResponse(response.id);
  }
}

export class Server {
  readonly registry = new MethodRegistry();
  readonly context: Record<string, unknown>;
  readonly options: Required<Pick<ServerOptions, "positionalParams" | "exposeErrors" | "trustProxy">> & ServerOptions;
  #hooks: RequestHook[];
  #calls: Semaphore;
  #unsubscribeModules?: () => void;
  #unsubscribeMethods?: () => void;

  constructor(options: ServerOptions = {}) {
    this.context = { ...options.context };
    this.options = { ...options, positionalParams: options.positionalParams ?? "map", exposeErrors: options.exposeErrors ?? false, trustProxy: options.trustProxy ?? false };
    this.#hooks = options.onRequest ? (Array.isArray(options.onRequest) ? options.onRequest : [options.onRequest]) : [];
    this.#calls = new Semaphore(options.maxConcurrency ?? Infinity);
    for (const module of getRegisteredModules()) this.addCatalogModule(module);
    this.#unsubscribeModules = onModuleRegistered((module) => this.addCatalogModule(module));
    for (const [name, method] of registeredMethods()) this.addCatalogMethod(name, method);
    this.#unsubscribeMethods = onMethodRegistered((name, method) => this.addCatalogMethod(name, method));
  }

  /** Stops observing subsequent additions to the global module catalog. */
  dispose(): void {
    this.#unsubscribeModules?.();
    this.#unsubscribeModules = undefined;
    this.#unsubscribeMethods?.();
    this.#unsubscribeMethods = undefined;
  }

  async handle(input: string | object, transportContext: Partial<RpcContext> = {}): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
    let call: unknown = input;
    if (typeof input === "string") {
      try { call = JSON.parse(input); } catch { return RpcError.parseError().toResponse(null); }
    }
    if (Array.isArray(call)) {
      if (!call.length) return RpcError.invalidRequest().toResponse(null);
      if (call.length > (this.options.batch?.maxSize ?? Infinity)) return RpcError.invalidRequest("Batch exceeds maximum size").toResponse(null);
      const batch = new Semaphore(this.options.batch?.concurrency ?? Infinity);
      const responses = await Promise.all(call.map((entry) => batch.use(() => this.handleSingle(entry, transportContext))));
      const present = responses.filter((response): response is JsonRpcResponse => response !== null);
      return present.length ? present : null;
    }
    return this.handleSingle(call, transportContext);
  }

  async invoke(name: string, params: unknown, context: Partial<RpcContext> = {}): Promise<unknown> {
    const response = await this.handle({ jsonrpc: "2.0", id: 0, method: name, params: params as never }, context);
    if (!response || Array.isArray(response)) throw new Error("Unexpected invoke response");
    if ("error" in response) throw new RpcError(response.error.message, response.error.code, response.error.data);
    return response.result;
  }

  private async handleSingle(raw: unknown, transportContext: Partial<RpcContext>): Promise<JsonRpcResponse | null> {
    if (!isRecord(raw)) return RpcError.invalidRequest().toResponse(null);
    const hasId = Object.hasOwn(raw, "id");
    const id = hasId && validId(raw.id) ? raw.id : null;
    if ((hasId && !validId(raw.id)) || raw.jsonrpc !== "2.0" || typeof raw.method !== "string") return RpcError.invalidRequest().toResponse(id);
    if (Object.hasOwn(raw, "params") && !isRecord(raw.params) && !Array.isArray(raw.params)) return RpcError.invalidRequest().toResponse(id);
    const call = raw as unknown as JsonRpcRequest;
    const method = this.registry.get(call.method);
    if (!method) return hasId ? RpcError.methodNotFound().toResponse(id) : null;
    const context = this.makeContext(transportContext);
    try {
      const result = await this.#calls.use(async () => {
        for (const hook of this.#hooks) await hook(call, context);
        let params: unknown = call.params;
        if (Array.isArray(params) && method.params) {
          if (this.options.positionalParams === "reject") throw RpcError.invalidParams("positional params are disabled");
          params = mapPositional(params, method.params, method.argNames);
        }
        if (params === undefined && method.params) params = {};
        if (method.params) params = await validateParams(method.params, params);
        return method.handler(params, context);
      });
      return hasId ? serializable({ jsonrpc: "2.0", id, result: result ?? null }) : null;
    } catch (error) {
      if (!hasId) return null;
      const mapped = isRpcError(error) ? error : this.options.onError?.(error, call, context);
      const rpcError = mapped ?? (this.options.exposeErrors && error instanceof Error ? RpcError.internalError({ message: error.message, stack: error.stack }) : RpcError.internalError());
      return serializable(rpcError.toResponse(id));
    }
  }

  private makeContext(transportContext: Partial<RpcContext>): RpcContext {
    const context = { ...this.context, ...transportContext, server: this, state: {} } as RpcContext;
    const request = context.request as { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string }; connection?: { remoteAddress?: string }; remoteAddress?: string } | undefined;
    const remoteAddress = request?.socket?.remoteAddress ?? request?.connection?.remoteAddress ?? request?.remoteAddress;
    const trusted = typeof this.options.trustProxy === "function" ? !!remoteAddress && this.options.trustProxy(remoteAddress) : this.options.trustProxy;
    const forwarded = request?.headers?.["x-forwarded-for"];
    if (trusted && forwarded) context.clientIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
    else if (remoteAddress) context.clientIp = remoteAddress.replace(/^::ffff:/, "");
    return context;
  }

  private addCatalogModule(module: RpcModuleEntry): void {
    try {
      for (const method of collectFromClass(module as object | (new (...args: never[]) => object))) this.registry.add(method.name, method);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("RPC method already registered:")) throw error;
    }
  }

  private addCatalogMethod(name: string, method: MethodDef): void {
    try { this.registry.add(name, { ...method, name }); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("RPC method already registered:")) throw error;
    }
  }
}
