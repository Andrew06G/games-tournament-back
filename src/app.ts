import http from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getCorsOrigin } from "./config/corsOrigin";
import { getPrisma } from "./config/database";
import { initSocket } from "./config/socket";
import apiRoutes from "./routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: getCorsOrigin(), credentials: true }));
app.use(express.json());

app.use("/api", apiRoutes);

async function start(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$connect();
  console.log("Database connected successfully");

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  /** Render/Docker requieren escuchar en todas las interfaces (IPv4); si no, el health check puede fallar. */
  const host = process.env.HOST ?? "0.0.0.0";
  httpServer.listen(PORT, host, () => {
    console.log(`Server running on http://${host}:${PORT}`);
  });
}

void start().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
