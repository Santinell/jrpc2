import { afterEach, describe, expect, it } from "vitest";
import { Client, RpcError, RpcMethod, RpcModule, Server, clearRegistry, createTypedClient, defineMethod, registerMethod, registerModule } from "../src/index.js";

describe("JSON-RPC core", () => {
  afterEach(() => clearRegistry());

  it("automatically registers imported @RpcModule classes", async () => {
    @RpcModule("decorated", { register: true })
    class DecoratedModule {
      @RpcMethod()
      ping() { return "pong"; }
    }
    const server = new Server();
    await expect(server.handle({ jsonrpc: "2.0", id: 1, method: "decorated.ping" })).resolves.toMatchObject({ result: "pong" });
  });

  it("does not auto-register modules explicitly marked for DI", async () => {
    @RpcModule("needs-di", { register: false })
    class NeedsDiModule {
      @RpcMethod()
      ping() { return "pong"; }
    }
    const server = new Server();
    await expect(server.handle({ jsonrpc: "2.0", id: 1, method: "needs-di.ping" })).resolves.toMatchObject({ error: { code: -32601 } });
    registerModule(new NeedsDiModule());
    await expect(server.handle({ jsonrpc: "2.0", id: 1, method: "needs-di.ping" })).resolves.toMatchObject({ result: "pong" });
  });

  it("handles calls, ids and notifications", async () => {
    const server = new Server();
    registerMethod("math.sum", ({ a, b }: { a: number; b: number }) => a + b);
    await expect(server.handle({ jsonrpc: "2.0", id: 0, method: "math.sum", params: { a: 2, b: 3 } })).resolves.toEqual({ jsonrpc: "2.0", id: 0, result: 5 });
    await expect(server.handle({ jsonrpc: "2.0", method: "math.sum", params: { a: 2, b: 3 } })).resolves.toBeNull();
  });

  it("uses protocol errors for malformed envelopes", async () => {
    const server = new Server();
    await expect(server.handle('{oops')).resolves.toMatchObject({ id: null, error: { code: -32700 } });
    await expect(server.handle({ jsonrpc: "2.0", id: false, method: "x" } as never)).resolves.toMatchObject({ id: null, error: { code: -32600 } });
    await expect(server.handle({ jsonrpc: "2.0", id: 1, method: "x", params: null } as never)).resolves.toMatchObject({ id: 1, error: { code: -32600 } });
  });

  it("maps schemas and turns validation failures into invalid params", async () => {
    const schema = {
      "~standard": { version: 1 as const, vendor: "test", validate(value: unknown) {
        if (typeof value === "object" && value !== null && "a" in value) return { value: value as { a: number } };
        return { issues: [{ message: "a is required" }] };
      } },
      shape: { a: true },
    };
    const server = new Server();
    registerMethod("inc", defineMethod(schema, (params: any) => params.a + 1));
    await expect(server.handle({ jsonrpc: "2.0", id: 1, method: "inc", params: [2] })).resolves.toMatchObject({ result: 3 });
    await expect(server.handle({ jsonrpc: "2.0", id: 1, method: "inc", params: {} })).resolves.toMatchObject({ error: { code: -32602 } });
  });

  it("matches batch client responses by id", async () => {
    const transport = { async send() { return JSON.stringify([{ jsonrpc: "2.0", id: 2, result: "b" }, { jsonrpc: "2.0", id: 1, result: "a" }]); } };
    const client = new Client(transport);
    await expect(client.batch([{ method: "a" }, { method: "b" }])).resolves.toEqual(["a", "b"]);
  });

  it("does not turn proxy inspection into an RPC call", async () => {
    const calls: string[] = [];
    const typed = createTypedClient<any>({
      call(method: string) { calls.push(method); return Promise.resolve("ok"); },
    } as Client);
    const math = typed.math;
    expect(await math).toBe(math);
    expect(String(math)).toBe("[TypedRpcClient math]");
    expect(math.toJSON).toBeUndefined();
    expect(math.inspect()).toBe("[TypedRpcClient math]");
    expect(calls).toEqual([]);
    await typed.math.sum({ a: 1, b: 2 });
    expect(calls).toEqual(["math.sum"]);
  });

  it("serializes unsafe values as an internal error", async () => {
    const server = new Server();
    registerMethod("big", () => 1n);
    await expect(server.handle({ jsonrpc: "2.0", id: 1, method: "big" })).resolves.toMatchObject({ error: { code: -32603 } });
  });
});
