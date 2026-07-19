import "./polyfill.js";
import { METHODS_META, MODULE_META, type DecoratedMethod } from "./decorators.js";
import type { MethodDef, RegisteredMethod } from "./types.js";

type Constructor = new (...args: never[]) => object;

function isConstructor(value: unknown): value is Constructor {
  return typeof value === "function" && value.prototype && value.prototype.constructor === value;
}

function moduleName(value: object | Constructor, explicit?: string): string {
  if (explicit) return explicit;
  const ctor = isConstructor(value) ? value : value.constructor as Constructor;
  const meta = (ctor as unknown as { [Symbol.metadata]?: Record<PropertyKey, unknown> })[Symbol.metadata]?.[MODULE_META] as { name?: string } | undefined;
  if (meta?.name) return meta.name;
  const name = ctor.name.replace(/Module$/, "");
  return name ? name[0]!.toLowerCase() + name.slice(1) : "module";
}

export function collectFromClass(value: object | Constructor, explicitName?: string): RegisteredMethod[] {
  const instance = isConstructor(value) ? new value() : value;
  const ctor = instance.constructor as Constructor;
  const metadata = (ctor as unknown as { [Symbol.metadata]?: Record<PropertyKey, unknown> })[Symbol.metadata];
  const decorated = metadata?.[METHODS_META] as Record<string, DecoratedMethod> | undefined;
  const methods: Array<[string, MethodDef]> = [];
  if (decorated) {
    for (const entry of Object.values(decorated)) {
      const fn = (instance as Record<string, unknown>)[entry.property];
      if (typeof fn === "function") methods.push([entry.name ?? entry.property, { ...entry, handler: fn.bind(instance) }]);
    }
  } else {
    for (const property of Object.getOwnPropertyNames(ctor.prototype)) {
      if (property === "constructor") continue;
      const fn = (instance as Record<string, unknown>)[property];
      if (typeof fn === "function") methods.push([property, { handler: fn.bind(instance) }]);
    }
  }
  const prefix = moduleName(value, explicitName);
  return methods.map(([name, definition]) => ({ ...definition, name: `${prefix}.${name}` }));
}
