import type { Client, CallOptions } from "./client.js";

type PublicMethods<T> = { [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K] };
type RpcMethod<F> = F extends (params: infer P, ...rest: any[]) => infer R ? (params: P, options?: CallOptions) => Promise<Awaited<R>> : never;

export type InferApi<Modules extends Record<string, abstract new (...args: any[]) => any>> = {
  [Module in keyof Modules]: { [Method in keyof PublicMethods<InstanceType<Modules[Module]>>]: RpcMethod<PublicMethods<InstanceType<Modules[Module]>>[Method]> }
};

export function createTypedClient<Api>(client: Client): Api {
  const createProxy = (path: readonly string[]): Api => {
    const label = `[TypedRpcClient${path.length ? ` ${path.join(".")}` : ""}]`;
    const target = () => undefined;
    return new Proxy(target, {
      get(_target, property) {
        if (typeof property === "symbol") {
          if (property === Symbol.toStringTag) return "TypedRpcClient";
          if (property === Symbol.toPrimitive) return () => label;
          return undefined;
        }
        if (property === "then" || property === "toJSON" || property === "constructor") return undefined;
        if (property === "toString" || property === "toLocaleString" || property === "valueOf" || property === "inspect") {
          return () => label;
        }
        return createProxy([...path, property]);
      },
      apply(_target, _thisArg, args) {
        return client.call(path.join("."), args[0], args[1]);
      },
    }) as Api;
  };
  return createProxy([]);
}
