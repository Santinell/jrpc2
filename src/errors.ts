import type { JsonRpcErrorObject, JsonRpcFailure, JsonRpcId } from "./types.js";

export class RpcError extends Error {
  constructor(message: string, public readonly code = -32000, public readonly data?: unknown) {
    super(message);
    this.name = "RpcError";
  }

  toJSON(): JsonRpcErrorObject {
    return this.data === undefined ? { code: this.code, message: this.message } : { code: this.code, message: this.message, data: this.data };
  }

  toResponse(id: JsonRpcId): JsonRpcFailure {
    return { jsonrpc: "2.0", id, error: this.toJSON() };
  }

  static parseError(data?: unknown): RpcError { return new RpcError("Parse error", -32700, data); }
  static invalidRequest(data?: unknown): RpcError { return new RpcError("Invalid Request", -32600, data); }
  static methodNotFound(data?: unknown): RpcError { return new RpcError("Method not found", -32601, data); }
  static invalidParams(data?: unknown): RpcError { return new RpcError("Invalid params", -32602, data); }
  static internalError(data?: unknown): RpcError { return new RpcError("Internal error", -32603, data); }
}

export const isRpcError = (value: unknown): value is RpcError => value instanceof RpcError;
