import type { Request, Response } from "express";

const PENDING = {
  message:
    "Estructura base lista. Notificaciones pendientes de implementación.",
} as const;

export function listNotificaciones(_req: Request, res: Response): void {
  res.status(501).json(PENDING);
}

export function marcarLeida(_req: Request, res: Response): void {
  res.status(501).json(PENDING);
}
