import type { Request, Response } from "express";

const PENDING = {
  message:
    "Estructura base lista. Preferencias de notificación pendientes de implementación.",
} as const;

export function updatePreferenciasNotificacion(_req: Request, res: Response): void {
  res.status(501).json(PENDING);
}
