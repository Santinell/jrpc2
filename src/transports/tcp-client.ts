import { connect } from "node:net";
import type { ClientTransport } from "../types.js";

export interface TcpClientTransportOptions { port?: number; host?: string; path?: string; timeout?: number }
export class TcpClientTransport implements ClientTransport {
  constructor(private readonly options: TcpClientTransportOptions) { if (!options || (options.port === undefined && !options.path)) throw new Error("emptyParams"); }
  send(payload: unknown, options: { signal?: AbortSignal } = {}): Promise<string | null> {
    const notification = !Array.isArray(payload) && typeof payload === "object" && payload !== null && !Object.hasOwn(payload, "id");
    return new Promise((resolve, reject) => {
      const socket = connect(this.options.path ? { path: this.options.path } : { port: this.options.port!, host: this.options.host });
      const abort = () => { socket.destroy(); reject(options.signal?.reason ?? new Error("Aborted")); };
      options.signal?.addEventListener("abort", abort, { once: true });
      socket.setTimeout(this.options.timeout ?? 0);
      socket.once("error", reject);
      socket.once("timeout", () => { socket.destroy(); reject(new Error("TimeoutError")); });
      socket.once("connect", () => {
        socket.write(`${JSON.stringify(payload)}\n`);
        if (notification) { socket.end(); resolve(null); }
      });
      let buffer = "";
      socket.on("data", (chunk: Buffer) => { buffer += chunk.toString("utf8"); const newline = buffer.indexOf("\n"); if (newline >= 0) { socket.end(); resolve(buffer.slice(0, newline)); } });
      socket.once("close", () => options.signal?.removeEventListener("abort", abort));
    });
  }
}
