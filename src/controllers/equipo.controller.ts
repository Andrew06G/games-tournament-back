import type { Request, Response } from "express";
import * as equipoService from "../services/equipo.service";
import { parseIdParam, sendError } from "../utils/controllerHelpers";
import {
  addJugadorBodySchema,
  updateEquipoBodySchema,
} from "../validators/equipo.validator";

export async function addJugador(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const idEquipo = parseIdParam(req.params.id, "id de equipo");
    const body = addJugadorBodySchema.parse(req.body);
    const jugador = await equipoService.addJugadorToEquipo(
      idEquipo,
      req.auth.userId,
      body,
    );
    res.status(201).json({ jugador });
  } catch (e) {
    sendError(res, e);
  }
}

export async function updateEquipo(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const idEquipo = parseIdParam(req.params.id, "id de equipo");
    const body = updateEquipoBodySchema.parse(req.body);
    const equipo = await equipoService.updateEquipo(
      idEquipo,
      req.auth.userId,
      body,
    );
    res.json({ equipo });
  } catch (e) {
    sendError(res, e);
  }
}

export async function deleteEquipo(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const idEquipo = parseIdParam(req.params.id, "id de equipo");
    await equipoService.deleteEquipo(idEquipo, req.auth.userId);
    res.status(204).send();
  } catch (e) {
    sendError(res, e);
  }
}

export async function removeJugador(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const idEquipo = parseIdParam(req.params.equipoId, "id de equipo");
    const idJugador = parseIdParam(req.params.jugadorId, "id de jugador");
    await equipoService.removeJugadorFromEquipo(
      idEquipo,
      idJugador,
      req.auth.userId,
    );
    res.status(204).send();
  } catch (e) {
    sendError(res, e);
  }
}
