import { Prisma } from "../../generated/prisma/client";
import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import { userCanManageTorneo } from "../utils/torneoAcl";
import type { AddJugadorBody } from "../validators/equipo.validator";
async function userIsCapitanDeEquipo(
  userId: number,
  idEquipo: number,
): Promise<boolean> {
  const prisma = getPrisma();
  const j = await prisma.jugador.findFirst({
    where: {
      idEquipo,
      idUsuario: userId,
      esCapitan: true,
      estadoJugador: "activo",
    },
  });
  return j !== null;
}

export async function addJugadorToEquipo(
  idEquipo: number,
  actorUserId: number,
  body: AddJugadorBody,
) {
  const prisma = getPrisma();
  const equipo = await prisma.equipo.findUnique({
    where: { idEquipo },
    include: { torneo: { select: { idTorneo: true, estado: true } } },
  });
  if (!equipo) {
    throw new HttpError(404, "Equipo no encontrado");
  }

  const torneoId = equipo.torneo.idTorneo;
  const canOrg = await userCanManageTorneo(actorUserId, torneoId);
  const canCap = await userIsCapitanDeEquipo(actorUserId, idEquipo);
  if (!canOrg && !canCap) {
    throw new HttpError(403, "Solo el organizador o el capitán pueden agregar jugadores");
  }

  if (equipo.torneo.estado !== "inscripciones_abiertas") {
    throw new HttpError(
      400,
      "Solo se pueden agregar jugadores con inscripciones abiertas",
    );
  }

  const targetUserId = body.idUsuario ?? actorUserId;
  if (!canOrg && targetUserId !== actorUserId) {
    throw new HttpError(403, "Como capitán solo puedes agregarte a ti mismo");
  }

  const ya = await prisma.jugador.findFirst({
    where: { idTorneo: torneoId, idUsuario: targetUserId },
  });
  if (ya) {
    throw new HttpError(409, "El usuario ya está inscrito en este torneo");
  }

  try {
    const jugador = await prisma.jugador.create({
      data: {
        idUsuario: targetUserId,
        idEquipo,
        idTorneo: torneoId,
        nickname: body.nickname.trim(),
        esCapitan: body.esCapitan ?? false,
        contactoPreferido: body.contactoPreferido?.trim() || null,
        estadoJugador: "activo",
      },
    });
    return jugador;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(
        409,
        "El nickname ya está en uso en este torneo",
      );
    }
    throw e;
  }
}

export async function removeJugadorFromEquipo(
  idEquipo: number,
  idJugador: number,
  actorUserId: number,
): Promise<void> {
  const prisma = getPrisma();
  const jugador = await prisma.jugador.findFirst({
    where: { idJugador, idEquipo },
    include: {
      equipo: { include: { torneo: { select: { idTorneo: true, estado: true } } } },
    },
  });
  if (!jugador) {
    throw new HttpError(404, "Jugador no encontrado en este equipo");
  }

  const torneoId = jugador.equipo.torneo.idTorneo;
  const canOrg = await userCanManageTorneo(actorUserId, torneoId);
  const canCap = await userIsCapitanDeEquipo(actorUserId, idEquipo);
  if (!canOrg && !canCap) {
    throw new HttpError(403, "Solo el organizador o el capitán pueden quitar jugadores");
  }

  if (jugador.equipo.torneo.estado !== "inscripciones_abiertas" && !canOrg) {
    throw new HttpError(
      400,
      "Solo el organizador puede quitar jugadores fuera del periodo de inscripciones",
    );
  }

  const capitanes = await prisma.jugador.count({
    where: { idEquipo, esCapitan: true, estadoJugador: "activo" },
  });
  if (jugador.esCapitan && capitanes <= 1) {
    throw new HttpError(
      400,
      "No se puede eliminar al único capitán del equipo; asigne otro capitán antes",
    );
  }

  await prisma.jugador.delete({ where: { idJugador } });
}
