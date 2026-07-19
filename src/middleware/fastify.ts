import type { FastifyReply, FastifyRequest } from "fastify";
import type { Server } from "../server.js";

/**
 * Fastify route handler for JSON-RPC requests.
 *
 * Register it with `fastify.post("/rpc", fastifyMiddleware(server))`.
 * Fastify parses JSON bodies before the handler runs, so no body reader is needed.
 */
export function fastifyMiddleware(server: Server) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const response = await server.handle(request.body as object, {
      request,
      transport: "http",
    });

    if (response === null) {
      await reply.code(204).send();
      return;
    }

    await reply.type("application/json").send(response);
  };
}
