import { createServer as createHttpServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { Server } from "../server.js";

export interface HttpHandlerOptions { maxBodySize?: number }

export function createHttpHandler(server: Server, options: HttpHandlerOptions = {}) {
  const maxBodySize = options.maxBodySize ?? 1024 * 1024;
  return (request: IncomingMessage, response: ServerResponse): void => {
    if (request.method !== "POST") { response.statusCode = 405; response.end(); return; }
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const fail = (status: number) => { if (!done) { done = true; response.statusCode = status; response.end(); request.destroy(); } };
    request.on("aborted", () => fail(400));
    request.on("error", () => fail(400));
    request.on("data", (chunk: Buffer) => { size += chunk.length; if (size > maxBodySize) fail(413); else chunks.push(chunk); });
    request.on("end", async () => {
      if (done) return;
      done = true;
      const answer = await server.handle(Buffer.concat(chunks).toString("utf8"), { request, transport: "http" });
      if (answer === null) { response.statusCode = 204; response.end(); return; }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(answer));
    });
  };
}

export interface HttpTransportOptions extends HttpHandlerOptions { port: number; host?: string; ssl?: { key: string | Buffer; cert: string | Buffer } }
export class HttpTransport {
  #server?: HttpServer;
  constructor(readonly options: HttpTransportOptions) { if (!options) throw new Error("emptyParams"); }
  listen(server: Server): Promise<void> {
    this.#server = this.options.ssl ? createHttpsServer(this.options.ssl, createHttpHandler(server, this.options)) : createHttpServer(createHttpHandler(server, this.options));
    return new Promise((resolve, reject) => { this.#server!.once("error", reject); this.#server!.listen(this.options.port, this.options.host, () => resolve()); });
  }
  close(): Promise<void> { return new Promise((resolve, reject) => this.#server ? this.#server.close((error) => error ? reject(error) : resolve()) : resolve()); }
}
