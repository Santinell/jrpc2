import "./polyfill.js";
import type { MethodDef, MethodHandler, StandardSchemaV1 } from "./types.js";

export const MODULE_META = Symbol("jrpc2.module");
export const METHODS_META = Symbol("jrpc2.methods");

export type RpcModuleEntry = object | Function;

/** Modules available to every Server in this process. */
const moduleCatalog = new Map<RpcModuleEntry, boolean>();
const catalogListeners = new Set<(module: RpcModuleEntry) => void>();

/**
 * Adds a module class or a prepared DI instance to the process-wide catalog.
 * Servers created before this call are updated as well.
 */
export function registerModule(module: RpcModuleEntry, options: RpcModuleOptions = {}): void {
  if (moduleCatalog.has(module)) return;
  const register = options.register ?? true;
  moduleCatalog.set(module, register);
  if (register) for (const listener of catalogListeners) listener(module);
}

export function getModules(): readonly RpcModuleEntry[] {
  return [...moduleCatalog.keys()];
}

/** Modules configured to be attached to every Server automatically. */
export function getRegisteredModules(): readonly RpcModuleEntry[] {
  return [...moduleCatalog].filter(([, register]) => register).map(([module]) => module);
}

export function onModuleRegistered(listener: (module: RpcModuleEntry) => void): () => void {
  catalogListeners.add(listener);
  return () => catalogListeners.delete(listener);
}

/** Clears the catalog and subscriptions. Intended for test isolation only. */
export function clearModuleRegistry(): void {
  moduleCatalog.clear();
  catalogListeners.clear();
}

export interface RpcModuleOptions {
  register?: boolean;
}

export interface RpcMethodOptions<S extends StandardSchemaV1 = StandardSchemaV1> {
  params?: S;
  result?: StandardSchemaV1;
  name?: string;
  argNames?: readonly string[];
}

export interface DecoratedMethod extends MethodDef {
  property: string;
  name?: string;
}

type Method = (this: object, params: unknown, ctx: unknown) => unknown;

export function RpcMethod<S extends StandardSchemaV1>(schema: S): (value: MethodHandler<StandardSchemaV1.InferOutput<S>>, context: ClassMethodDecoratorContext) => void;
export function RpcMethod<S extends StandardSchemaV1 = StandardSchemaV1>(options?: RpcMethodOptions<S>): (value: Method, context: ClassMethodDecoratorContext) => void;
export function RpcMethod<S extends StandardSchemaV1>(schemaOrOptions?: S | RpcMethodOptions<S>) {
  return (value: Method, context: ClassMethodDecoratorContext): void => {
    if (context.kind !== "method" || context.private || context.static || typeof context.name !== "string") {
      throw new TypeError("@RpcMethod may decorate instance methods with string names only");
    }
    const looksLikeSchema = schemaOrOptions && typeof schemaOrOptions === "object" && "~standard" in schemaOrOptions;
    const options = (looksLikeSchema ? { params: schemaOrOptions } : schemaOrOptions ?? {}) as RpcMethodOptions;
    const metadata = context.metadata as Record<PropertyKey, unknown>;
    if (!Object.hasOwn(metadata, METHODS_META)) {
      metadata[METHODS_META] = Object.create((metadata[METHODS_META] as object | null | undefined) ?? null);
    }
    const methods = metadata[METHODS_META] as Record<string, DecoratedMethod>;
    methods[context.name] = { property: context.name, ...options, handler: value };
  };
}

export function RpcModule(name?: string, options?: RpcModuleOptions): (value: Function, context: ClassDecoratorContext) => void {
  return (value, context) => {
    (context.metadata as Record<PropertyKey, unknown>)[MODULE_META] = { name, register: options?.register ?? true };
    registerModule(value, options);
  };
}
