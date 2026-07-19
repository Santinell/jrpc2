import type { Server } from "../server.js";

export function createFetchHandler(server: Server) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    const answer = await server.handle(await request.text(), { request, transport: "fetch" });
    return answer === null ? new Response(null, { status: 204 }) : Response.json(answer);
  };
}
