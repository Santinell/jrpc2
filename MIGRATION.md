# Migrating from jrpc2 1.x

Version 2 is a complete ESM/TypeScript rewrite and contains breaking API changes.

- Node.js 20.19+ and ESM imports are required. CommonJS `require()` is not supported.
- `Server#expose` and `exposeModule` become `registerMethod` and `registerModule`.
- Handlers receive `(params, ctx)` instead of positional arguments. Class module methods retain a bound `this` for DI.
- `handleCall(json, req, callback)` becomes `await server.handle(json, ctx)`.
- Authentication customization becomes `onRequest` hooks that throw `RpcError`.
- `loadModules(dir, callback)` удалён. Импортируйте декорированные модули обычными ESM-импортами; DI-инстансы добавляйте через глобальный `registerModule(instance)`.
- Clients use `call`, `notify`, and `batch` Promises. `notify` returns `Promise<void>`; `batch` takes `[{ method, params }]`.
- HTTP clients take a `url`, not a Node `http.request` option object.
- A parse error is correctly reported as `-32700`; unknown errors are `-32603` by default.
- Notifications over HTTP receive `204`; batch calls are parallel while response order remains request order.
- Koa and ZeroMQ are no longer bundled. Use an external adapter or the fetch handler.
- `trustProxy` is now off by default.

The CoffeeScript 1.x sources, tests, examples, and documentation are preserved under `legacy/` for reference and are not published.
