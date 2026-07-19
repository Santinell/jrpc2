import type { MethodDef, MethodHandler, StandardSchemaV1 } from "./types.js";

const NAME = /^[A-Za-z0-9_$][A-Za-z0-9_$.-]*$/;
const methodCatalog = new Map<string, MethodDef>();
const methodListeners = new Set<(name: string, method: MethodDef) => void>();

export function defineMethod<S extends StandardSchemaV1>(definition: MethodDef<S>): MethodDef<S>;
export function defineMethod<S extends StandardSchemaV1>(params: S, handler: MethodHandler<StandardSchemaV1.InferOutput<S>>): MethodDef<S>;
export function defineMethod<S extends StandardSchemaV1>(
  definitionOrParams: MethodDef<S> | S,
  handler?: MethodHandler<StandardSchemaV1.InferOutput<S>>,
): MethodDef<S> {
  return handler ? { params: definitionOrParams as S, handler } : definitionOrParams as MethodDef<S>;
}

/** Adds a standalone RPC method to the process-wide method catalog. */
export function registerMethod(name: string, handler: MethodHandler): void;
export function registerMethod<S extends StandardSchemaV1>(name: string, definition: MethodDef<S>): void;
export function registerMethod(name: string, handlerOrDefinition: MethodHandler | MethodDef): void {
  if (!NAME.test(name) || name.startsWith("rpc.")) throw new TypeError(`Invalid RPC method name: ${name}`);
  if (methodCatalog.has(name)) throw new Error(`RPC method already registered: ${name}`);
  const definition = typeof handlerOrDefinition === "function" ? defineMethod({ handler: handlerOrDefinition }) : handlerOrDefinition;
  methodCatalog.set(name, definition);
  for (const listener of methodListeners) listener(name, definition);
}

export function registeredMethods(): ReadonlyMap<string, MethodDef> { return methodCatalog; }

export function onMethodRegistered(listener: (name: string, method: MethodDef) => void): () => void {
  methodListeners.add(listener);
  return () => methodListeners.delete(listener);
}

/** Clears the catalog and subscriptions. Intended for test isolation only. */
export function clearMethodRegistry(): void {
  methodCatalog.clear();
  methodListeners.clear();
}
