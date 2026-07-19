# jrpc2

`jrpc2` is an ESM-only JSON-RPC 2.0 library for Node.js 20.19+. It separates the protocol core from transports: one `Server` can be attached to HTTP, Fastify, Express, TCP, Socket.IO, or the Fetch API.

## Features

- Strict JSON-RPC 2.0 handling: single and batch requests, notifications, named and positional parameters, and standard error codes.
- Promise APIs for both server and client; batches run concurrently while response order is preserved.
- Parameter validation through any Standard Schema v1-compatible validator, including Zod v4, Valibot, and ArkType.
- Standalone methods, class modules using modern decorators, and a process-wide registration catalog.
- `RpcError`, `onRequest` and `onError` hooks, request context, and safe default handling of internal errors.
- A typed Proxy client: parameter and result types are derived from module class method signatures.
- HTTP body/TCP frame, batch, and global-concurrency limits; `trustProxy` is disabled by default.

## Transports and integrations

| Purpose | Import | API |
| --- | --- | --- |
| Native Node HTTP/HTTPS server | `jrpc2/http` | `createHttpHandler`, `HttpTransport` |
| Fetch API: Node, Bun, Deno, edge | `jrpc2/fetch` | `createFetchHandler` |
| TCP / Unix socket with NDJSON framing | `jrpc2/tcp` | `TcpTransport` |
| HTTP client built on `fetch` | `jrpc2/http-client` | `HttpClientTransport` |
| TCP client | `jrpc2/tcp-client` | `TcpClientTransport` |
| Express / Connect | `jrpc2/express` | `expressMiddleware` |
| Fastify | `jrpc2/fastify` | `fastifyMiddleware` |
| Socket.IO | `jrpc2/socket.io` | `socketIoMiddleware` |

Express, Fastify, and Socket.IO are optional peer dependencies and are not pulled in by the core package. For Hono, Cloudflare Workers, and other Fetch-compatible environments, use `createFetchHandler`.

## Main pattern: a module with decorators

A module file does not create a `Server` and knows nothing about a transport. It contains only RPC logic, types, and its domain dependencies.

`modules/math.ts`:

```ts
import { RpcMethod, RpcModule, type RpcContext } from "jrpc2";
import { z } from "zod";

const SumInput = z.object({ a: z.number(), b: z.number() });
const PowInput = z.object({ a: z.number(), b: z.number() });

@RpcModule("math", { register: true })
export class MathModule {
  @RpcMethod(SumInput)
  sum({ a, b }: z.infer<typeof SumInput>, ctx: RpcContext) {
    return a + b;
  }

  @RpcMethod(PowInput)
  power({ a, b }: z.infer<typeof PowInput>, ctx: RpcContext) {
    return a ** b;
  }
}
```

`@RpcModule("math", { register: true })` sets the module name, stores its metadata, and adds the class to the global module catalog. Once the file is imported, every new `Server` instantiates this class and registers its methods.

Creating the server is the application's bootstrap responsibility, for example in `app.ts`:

```ts
import "./modules/math.js"; // runs the decorator and adds MathModule to the catalog
import { Server } from "jrpc2";

const rpc = new Server();
// rpc now exposes math.sum and math.power
```

This works for modules without constructor dependencies. For a module that needs DI, disable automatic registration and add the prepared instance to the global catalog once in the composition root:

```ts
@RpcModule("users", { register: false })
class UsersModule {
  constructor(private readonly db: Db) {}
}

import { registerModule } from "jrpc2";

registerModule(new UsersModule(db));
```

After the server is created, the methods are available as `math.sum` and `math.power`. `@RpcMethod` is explicit opt-in: when a class contains at least one decorated method, undecorated methods are not exposed through RPC.

Standalone methods use the same global registration model:

```ts
import { registerMethod } from "jrpc2";

registerMethod("health.check", () => ({ ok: true }));
```

## Attaching a transport

### Fastify

```ts
import Fastify from "fastify";
import { fastifyMiddleware } from "jrpc2/fastify";

const app = Fastify();
app.post("/rpc", fastifyMiddleware(rpc));
await app.listen({ port: 8080 });
```

### Native HTTP

```ts
import { createServer } from "node:http";
import { createHttpHandler } from "jrpc2/http";

createServer(createHttpHandler(rpc)).listen(8080);
```

### Fetch API

```ts
import { createFetchHandler } from "jrpc2/fetch";

const handler = createFetchHandler(rpc);
// export default { fetch: handler } // for an edge runtime, for example
```

## Client

```ts
import { Client } from "jrpc2";
import { HttpClientTransport } from "jrpc2/http-client";

const client = new Client(
  new HttpClientTransport({ url: "http://localhost:8080/rpc" }),
);

const total = await client.call<number>("math.sum", { a: 2, b: 3 });
await client.notify("audit.record", { action: "sum" });
```

`notify()` returns `Promise<void>` and does not receive a JSON-RPC response. HTTP notifications receive status `204`.

## Validation, errors, and security

A structurally invalid JSON-RPC request receives `-32600`; parameters of a structurally valid request that fail a method schema receive `-32602`. A handler may throw `new RpcError("Access denied", -32000)`.

For positional parameters, explicitly supplying `argNames` is recommended: introspection of third-party schema structure is best-effort. Set `positionalParams: "reject"` to accept named parameters only.

HTTP bodies default to a 1 MiB limit, TCP frames to 10 MiB, and `trustProxy` is disabled by default. When enabled, the first `X-Forwarded-For` value is used only for a trusted remote address.

For CoffeeScript 1.x migration details, see [MIGRATION.md](MIGRATION.md).
