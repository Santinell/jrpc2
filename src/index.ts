import "./polyfill.js";
import { clearModuleRegistry } from "./decorators.js";
import { clearMethodRegistry } from "./method.js";

/** Clears global module and method catalogs. Primarily useful in test teardown. */
export function clearRegistry(): void {
  clearModuleRegistry();
  clearMethodRegistry();
}

export { Server } from "./server.js";
export { Client, RpcRemoteError } from "./client.js";
export { createTypedClient, type InferApi } from "./typed.js";
export { RpcError, isRpcError } from "./errors.js";
export { clearMethodRegistry, defineMethod, onMethodRegistered, registerMethod, registeredMethods } from "./method.js";
export { clearModuleRegistry, RpcMethod, RpcModule, getModules, getRegisteredModules, onModuleRegistered, registerModule, type RpcModuleOptions } from "./decorators.js";
export type { ClientTransport, ErrorHook, JsonRpcErrorObject, JsonRpcFailure, JsonRpcId, JsonRpcParams, JsonRpcRequest, JsonRpcResponse, JsonRpcSuccess, MethodDef, MethodHandler, RegisteredMethod, RequestHook, RpcContext, StandardSchemaV1 } from "./types.js";
