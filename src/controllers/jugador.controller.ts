import type { Request, Response } from "express";
import * as jugadorService from "../services/jugador.service";
import { parseIdParam, sendError } from "../utils/controllerHelpers";
import { updateJugadorBodySchema } from "../validators/jugador.validator";

export async function updateJugador(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const id = parseIdParam(req.params.id);
    const body = updateJugadorBodySchema.parse(req.body);
    const jugador = await jugadorService.updateJugador(id, req.auth.userId, body);
    res.json({ jugador });
  } catch (e) {
    sendError(res, e);
  }
}
