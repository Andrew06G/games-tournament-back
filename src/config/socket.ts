import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

let io: Server | null = null;

/**
 * Inicializa Socket.io sobre el servidor HTTP de Express.
 * Los eventos (`bracket:updated`, etc.) se añadirán en fases posteriores.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? true,
      credentials: true,
    },
  });
  return io;
}

export function getSocketIO(): Server | null {
  return io;
}
