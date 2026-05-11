import type { Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "./httpError";

export function sendError(res: Response, e: unknown): void {
  if (e instanceof HttpError) {
    res.status(e.statusCode).json({ error: e.message });
    return;
  }
  if (e instanceof ZodError) {
    res.status(400).json({ error: "Datos inválidos", details: e.flatten() });
    return;
  }
  console.error(e);
  res.status(500).json({ error: "Error interno del servidor" });
}

export function parseIdParam(
  raw: string | string[] | undefined,
  label = "id",
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1) {
    throw new HttpError(400, `${label} inválido`);
  }
  return n;
}
