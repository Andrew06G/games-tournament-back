import type { Request, Response } from "express";
import * as bracketService from "../services/bracket.service";
import * as enfrentamientoService from "../services/enfrentamiento.service";
import * as torneoService from "../services/torneo.service";
import { parseIdParam, sendError } from "../utils/controllerHelpers";
import { crearEnfrentamientoBodySchema } from "../validators/enfrentamiento.validator";
import {
  createTorneoBodySchema,
  inscribirEquipoBodySchema,
  updateTorneoBodySchema,
} from "../validators/torneo.validator";

export async function listTorneos(req: Request, res: Response): Promise<void> {
  try {
    const estado =
      typeof req.query.estado === "string" ? req.query.estado : undefined;
    const data = await torneoService.listTorneos(estado);
    res.json({ torneos: data });
  } catch (e) {
    sendError(res, e);
  }
}

export async function getTorneoById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseIdParam(req.params.id);
    const torneo = await torneoService.getTorneoById(id);
    res.json({ torneo });
  } catch (e) {
    sendError(res, e);
  }
}

export async function createTorneo(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const body = createTorneoBodySchema.parse(req.body);
    const torneo = await torneoService.createTorneo(req.auth.userId, body);
    res.status(201).json({ torneo });
  } catch (e) {
    sendError(res, e);
  }
}

export async function updateTorneo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseIdParam(req.params.id);
    const body = updateTorneoBodySchema.parse(req.body);
    const torneo = await torneoService.updateTorneo(id, body);
    res.json({ torneo });
  } catch (e) {
    sendError(res, e);
  }
}

export async function deleteTorneo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseIdParam(req.params.id);
    await torneoService.deleteTorneo(id);
    res.status(204).send();
  } catch (e) {
    sendError(res, e);
  }
}

export async function getBracket(req: Request, res: Response): Promise<void> {
  try {
    const id = parseIdParam(req.params.id);
    const data = await bracketService.getBracketByTorneoId(id);
    res.json(data);
  } catch (e) {
    sendError(res, e);
  }
}

export async function inscribirEquipo(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const id = parseIdParam(req.params.id);
    const body = inscribirEquipoBodySchema.parse(req.body);
    const data = await torneoService.inscribirEquipo(id, req.auth.userId, body);
    res.status(201).json(data);
  } catch (e) {
    sendError(res, e);
  }
}

export async function crearEnfrentamiento(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const id = parseIdParam(req.params.id);
    const body = crearEnfrentamientoBodySchema.parse(req.body);
    const enfrentamiento = await enfrentamientoService.crearEnfrentamientoEnTorneo(
      id,
      req.auth.userId,
      body,
    );
    res.status(201).json({ enfrentamiento });
  } catch (e) {
    sendError(res, e);
  }
}
