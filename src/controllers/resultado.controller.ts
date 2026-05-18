import type { Request, Response } from "express";
import * as resultadoService from "../services/resultado.service";
import { parseIdParam, sendError } from "../utils/controllerHelpers";

export async function listResultadosRecientes(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const page = Math.max(0, Number(req.query.page) || 0);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const data = await resultadoService.listResultadosRecientes(page, limit);
    res.json(data);
  } catch (e) {
    sendError(res, e);
  }
}

export async function validarResultado(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const id = parseIdParam(req.params.id, "id de resultado");
    const resultado = await resultadoService.validarResultado(id, req.auth.userId);
    res.json({ resultado });
  } catch (e) {
    sendError(res, e);
  }
}
