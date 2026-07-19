import type { RegisteredMethod } from "./types.js";

const NAME = /^[A-Za-z0-9_$][A-Za-z0-9_$.-]*$/;

export class MethodRegistry {
  #methods = new Map<string, RegisteredMethod>();

  add(name: string, definition: RegisteredMethod, options: { override?: boolean } = {}): void {
    if (!NAME.test(name) || name.startsWith("rpc.")) throw new TypeError(`Invalid RPC method name: ${name}`);
    if (this.#methods.has(name) && !options.override) throw new Error(`RPC method already registered: ${name}`);
    this.#methods.set(name, { ...definition, name });
  }

  get(name: string): RegisteredMethod | undefined { return this.#methods.get(name); }
  has(name: string): boolean { return this.#methods.has(name); }
  names(): string[] { return [...this.#methods.keys()]; }
}
