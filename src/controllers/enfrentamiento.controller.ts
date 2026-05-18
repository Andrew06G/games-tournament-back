import type { Request, Response } from "express";
import * as enfrentamientoService from "../services/enfrentamiento.service";
import { parseIdParam, sendError } from "../utils/controllerHelpers";
import { asignarEquipoSlotBodySchema } from "../validators/enfrentamiento.validator";
import { registrarResultadoBodySchema } from "../validators/resultado.validator";

export async function asignarEquipoSlot(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const id = parseIdParam(req.params.id);
    const body = asignarEquipoSlotBodySchema.parse(req.body);
    const enfrentamiento = await enfrentamientoService.asignarEquipoASlot(
      id,
      req.auth.userId,
      body,
    );
    res.json({ enfrentamiento });
  } catch (e) {
    sendError(res, e);
  }
}

export async function limpiarAsignacion(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const id = parseIdParam(req.params.id);
    const enfrentamiento =
      await enfrentamientoService.limpiarAsignacionEnfrentamiento(
        id,
        req.auth.userId,
      );
    res.json({ enfrentamiento });
  } catch (e) {
    sendError(res, e);
  }
}

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
