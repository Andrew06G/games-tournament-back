import type { NextFunction, Request, Response } from "express";
import { getPrisma } from "../config/database";

/**
 * El usuario debe tener al menos uno de los roles **globales**
 * (`USUARIO_ROL.id_torneo` = NULL).
 */
export function requireGlobalRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const tieneAlguno = allowedRoles.some((r) =>
      req.auth!.globalRoles.includes(r),
    );
    if (!tieneAlguno) {
      res.status(403).json({ error: "No tienes permiso para esta acción" });
      return;
    }
    next();
  };
}

/**
 * Permite gestionar un torneo si:
 * - tiene rol global `organizador`, o
 * - tiene `organizador` asociado a ese `id_torneo`, o
 * - es el `id_organizador` del torneo.
 */
export function requireTorneoOrganizerAccess(paramKey = "id") {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const raw = req.params[paramKey];
    const torneoId = Number(raw);
    if (!Number.isInteger(torneoId)) {
      res.status(400).json({ error: "Identificador de torneo inválido" });
      return;
    }

    const userId = req.auth.userId;

    if (req.auth.globalRoles.includes("organizador")) {
      next();
      return;
    }

    const prisma = getPrisma();
    const [rolTorneo, torneo] = await Promise.all([
      prisma.usuarioRol.findFirst({
        where: {
          idUsuario: userId,
          idTorneo: torneoId,
          rol: { nombreRol: "organizador" },
        },
      }),
      prisma.torneo.findUnique({
        where: { idTorneo: torneoId },
        select: { idOrganizador: true },
      }),
    ]);

    if (rolTorneo) {
      next();
      return;
    }

    if (torneo?.idOrganizador === userId) {
      next();
      return;
    }

    res.status(403).json({
      error: "Solo el organizador del torneo puede realizar esta acción",
    });
  };
}
