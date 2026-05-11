import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwtTokens";

/**
 * Lee `Authorization: Bearer <access_token>` y rellena `req.auth`.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token no proporcionado" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Token no proporcionado" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }
    req.auth = {
      userId,
      email: payload.email,
      globalRoles: payload.globalRoles,
    };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}
