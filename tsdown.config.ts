import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/transports/http.ts", "src/transports/http-client.ts", "src/transports/fetch.ts", "src/transports/tcp.ts", "src/transports/tcp-client.ts", "src/middleware/express.ts", "src/middleware/fastify.ts", "src/middleware/socketio.ts"],
  format: ["esm"],
  dts: true,
  unbundle: true,
  clean: true,
  sourcemap: true,
});
