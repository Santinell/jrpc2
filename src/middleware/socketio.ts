import type { Server as SocketIoServer } from "socket.io";
import type { Server } from "../server.js";

/** Installs a Socket.IO message listener and returns the io.use-compatible middleware. */
export function socketIoMiddleware(server: Server) {
  return (socket: Parameters<SocketIoServer["use"]>[0] extends (socket: infer S, next: any) => any ? S : never, next: (error?: Error) => void): void => {
    socket.on("message", async (payload: unknown) => {
      const answer = await server.handle(typeof payload === "string" ? payload : JSON.stringify(payload), { request: socket.request, transport: "ws" });
      if (answer !== null) socket.send(JSON.stringify(answer));
    });
    next();
  };
}
