import { Prisma } from "../../generated/prisma/client";
import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import { userCanManageTorneo } from "../utils/torneoAcl";
import type { UpdateJugadorBody } from "../validators/jugador.validator";

export async function updateJugador(
  idJugador: number,
  actorUserId: number,
  body: UpdateJugadorBody,
) {
  const prisma = getPrisma();
  const jugador = await prisma.jugador.findUnique({
    where: { idJugador },
    include: {
      equipo: { include: { torneo: { select: { idTorneo: true } } } },
    },
  });
  if (!jugador) {
    throw new HttpError(404, "Jugador no encontrado");
  }

  const torneoId = jugador.equipo.torneo.idTorneo;
  const canOrg = await userCanManageTorneo(actorUserId, torneoId);
  const isSelf =
    jugador.idUsuario != null && jugador.idUsuario === actorUserId;
  if (!canOrg && !isSelf) {
    throw new HttpError(403, "No puedes modificar a otro jugador");
  }

  const data: Prisma.JugadorUpdateInput = {};
  if (body.nickname !== undefined) data.nickname = body.nickname.trim();
  if (body.contactoPreferido !== undefined) {
    data.contactoPreferido =
      body.contactoPreferido === null
        ? null
        : body.contactoPreferido.trim();
  }
  if (body.esCapitan !== undefined) data.esCapitan = body.esCapitan;

  try {
    return await prisma.jugador.update({
      where: { idJugador },
      data,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "El nickname ya está en uso en este torneo");
    }
    throw e;
  }
}
