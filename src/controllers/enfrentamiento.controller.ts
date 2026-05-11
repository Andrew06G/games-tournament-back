import type { Request, Response } from "express";
import * as enfrentamientoService from "../services/enfrentamiento.service";
import { parseIdParam, sendError } from "../utils/controllerHelpers";
import { registrarResultadoBodySchema } from "../validators/resultado.validator";

export async function registrarResultado(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const id = parseIdParam(req.params.id);
    const body = registrarResultadoBodySchema.parse(req.body);
    const resultado = await enfrentamientoService.registrarResultado(
      id,
      req.auth.userId,
      body,
    );
    res.json({ resultado });
  } catch (e) {
    sendError(res, e);
  }
}
