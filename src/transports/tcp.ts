import { createServer, type Server as NetServer, type Socket } from "node:net";
import type { Server } from "../server.js";

export interface TcpTransportOptions { port?: number; host?: string; path?: string; maxFrameSize?: number; frameTimeout?: number }
export class TcpTransport {
  #server?: NetServer;
  constructor(readonly options: TcpTransportOptions) { if (!options || (options.port === undefined && !options.path)) throw new Error("emptyParams"); }
  listen(server: Server): Promise<void> {
    const max = this.options.maxFrameSize ?? 10 * 1024 * 1024;
    this.#server = createServer((socket) => this.attach(socket, server, max));
    return new Promise((resolve, reject) => {
      this.#server!.once("error", reject);
      if (this.options.path) this.#server!.listen(this.options.path, resolve);
      else this.#server!.listen(this.options.port!, this.options.host, resolve);
    });
  }
  close(): Promise<void> { return new Promise((resolve, reject) => this.#server ? this.#server.close((error) => error ? reject(error) : resolve()) : resolve()); }
  private attach(socket: Socket, server: Server, max: number): void {
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("error", () => socket.destroy());
    socket.on("data", async (chunk: string) => {
      if (chunk.includes("\uFFFD")) { socket.destroy(); return; }
      buffer += chunk;
      if (Buffer.byteLength(buffer) > max) { socket.destroy(); return; }
      const frames = buffer.split("\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (!frame) { socket.destroy(); return; }
        const answer = await server.handle(frame, { request: socket, transport: "tcp" });
        if (answer !== null) socket.write(`${JSON.stringify(answer)}\n`);
      }
    });
  }
}
