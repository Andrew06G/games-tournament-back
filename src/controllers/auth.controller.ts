import type { Request, Response } from "express";
import { ZodError } from "zod";
import * as authService from "../services/auth.service";
import { HttpError } from "../utils/httpError";
import {
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from "../validators/auth.validator";

function handleError(res: Response, e: unknown): void {
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

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const body = registerBodySchema.parse(req.body);
    const result = await authService.register(body);
    res.status(201).json(result);
  } catch (e) {
    handleError(res, e);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body = loginBodySchema.parse(req.body);
    const result = await authService.login(body);
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const body = refreshBodySchema.parse(req.body);
    const result = await authService.refreshAccessToken(body);
    res.json(result);
  } catch (e) {
    handleError(res, e);
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const user = await authService.getProfile(req.auth.userId);
    res.json({ user });
  } catch (e) {
    handleError(res, e);
  }
}
