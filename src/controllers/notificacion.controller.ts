import type { Request, Response } from "express";
import * as notificacionService from "../services/notificacion.service";
import { preferenciasBodySchema } from "../services/notificacion.service";
import { parseIdParam, sendError } from "../utils/controllerHelpers";

export async function listNotificaciones(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const notificaciones = await notificacionService.listNotificacionesUsuario(
      req.auth.userId,
    );
    res.json({ notificaciones });
  } catch (e) {
    sendError(res, e);
  }
}

export async function getPreferencias(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const preferencias = await notificacionService.getPreferenciasUsuario(
      req.auth.userId,
    );
    res.json({ preferencias });
  } catch (e) {
    sendError(res, e);
  }
}

export async function updatePreferencias(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const body = preferenciasBodySchema.parse(req.body);
    const preferencias = await notificacionService.updatePreferenciasUsuario(
      req.auth.userId,
      body,
    );
    res.json({ preferencias });
  } catch (e) {
    sendError(res, e);
  }
}

export async function marcarLeida(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const id = parseIdParam(req.params.id);
    const ok = await notificacionService.marcarNotificacionLeida(
      id,
      req.auth.userId,
    );
    if (!ok) {
      res.status(404).json({ error: "Notificación no encontrada" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
}
