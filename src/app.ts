import http from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getPrisma } from "./config/database";
import { initSocket } from "./config/socket";
import apiRoutes from "./routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? true }));
app.use(express.json());

app.use("/api", apiRoutes);

async function start(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$connect();
  console.log("Database connected successfully");

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

void start().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
