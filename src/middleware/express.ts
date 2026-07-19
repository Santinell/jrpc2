import type { RequestHandler } from "express";
import { createHttpHandler } from "../transports/http.js";
import type { Server } from "../server.js";

export function expressMiddleware(server: Server): RequestHandler {
  const handler = createHttpHandler(server);
  return (request, response, next) => request.method === "POST" ? handler(request, response) : next();
}
