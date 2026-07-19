import type { Server } from "./server.js";

export type JsonRpcId = string | number | null;
export type JsonObject = Record<string, unknown>;
export type JsonRpcParams = unknown[] | JsonObject;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: JsonRpcParams;
  id?: JsonRpcId;
}

export interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: JsonRpcErrorObject;
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

export interface RpcContext {
  server: Server;
  request?: unknown;
  clientIp?: string;
  transport?: "http" | "fetch" | "tcp" | "ws" | "custom";
  state: Record<string, unknown>;
  [key: string]: unknown;
}

/** The public subset of Standard Schema v1 required at runtime. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    validate(value: unknown): StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
  };
}

export type StandardSchemaV1Result<T> =
  | { value: T; issues?: undefined }
  | { value?: undefined; issues: readonly StandardSchemaV1Issue[] };

export interface StandardSchemaV1Issue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey>;
  readonly [key: string]: unknown;
}

export namespace StandardSchemaV1 {
  export type InferInput<S extends StandardSchemaV1> = S extends StandardSchemaV1<infer I, unknown> ? I : never;
  export type InferOutput<S extends StandardSchemaV1> = S extends StandardSchemaV1<unknown, infer O> ? O : never;
}

export type MethodHandler<P = any, R = unknown> = (params: P, ctx: RpcContext) => R | Promise<R>;

export interface MethodDef<S extends StandardSchemaV1 = StandardSchemaV1> {
  params?: S;
  /** Documentation metadata only in 2.0; it is not validated at runtime. */
  result?: StandardSchemaV1;
  argNames?: readonly string[];
  handler: MethodHandler<StandardSchemaV1.InferOutput<S>>;
}

export interface RegisteredMethod extends MethodDef {
  name: string;
}

export type RequestHook = (call: JsonRpcRequest, ctx: RpcContext) => void | Promise<void>;
export type ErrorHook = (error: unknown, call: JsonRpcRequest | undefined, ctx: RpcContext | undefined) => import("./errors.js").RpcError | void;

export interface ClientTransport {
  send(payload: unknown, options?: { signal?: AbortSignal }): Promise<string | null>;
  close?(): void | Promise<void>;
}
