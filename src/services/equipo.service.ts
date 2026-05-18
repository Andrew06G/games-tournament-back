import { Prisma } from "../../generated/prisma/client";
import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import { userCanManageTorneo } from "../utils/torneoAcl";
import { registrarCambio } from "./historial.service";
import { syncNumInscritos } from "./torneo.service";
import type {
  AddJugadorBody,
  UpdateEquipoBody,
} from "../validators/equipo.validator";

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

/** Rol global lider_equipo y miembro activo del equipo. */
async function userIsLiderEquipoEnEquipo(
  userId: number,
  idEquipo: number,
): Promise<boolean> {
  const prisma = getPrisma();
  const [rolLider, miembro] = await Promise.all([
    prisma.usuarioRol.findFirst({
      where: {
        idUsuario: userId,
        idTorneo: null,
        rol: { nombreRol: "lider_equipo" },
      },
    }),
    prisma.jugador.findFirst({
      where: {
        idEquipo,
        idUsuario: userId,
        estadoJugador: "activo",
      },
    }),
  ]);
  return rolLider !== null && miembro !== null;
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
  const canLider = await userIsLiderEquipoEnEquipo(actorUserId, idEquipo);

  const puedeInvitados = canOrg || canCap || canLider;
  const puedeUsuarioRegistrado = canOrg || canCap;

  const inscripcionesAbiertas =
    equipo.torneo.estado === "inscripciones_abiertas";
  if (!inscripcionesAbiertas && !canOrg) {
    throw new HttpError(
      400,
      "Solo el organizador puede agregar jugadores cuando las inscripciones no están abiertas",
    );
  }

  const esInvitado = body.esInvitado === true;

  if (esInvitado) {
    if (!puedeInvitados) {
      throw new HttpError(
        403,
        "Solo el organizador, el capitán o un líder de equipo del plantel pueden registrar participantes invitados",
      );
    }

    let esCapitan = body.esCapitan ?? false;
    if (esCapitan && !canOrg) {
      esCapitan = false;
    }

    try {
      const jugador = await prisma.jugador.create({
        data: {
          idUsuario: null,
          idEquipo,
          idTorneo: torneoId,
          nickname: body.nickname.trim(),
          esCapitan,
          contactoPreferido: body.contactoPreferido?.trim() || null,
          estadoJugador: "activo",
        },
      });
      return jugador;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new HttpError(
          409,
          "El nickname ya está en uso en este torneo",
        );
      }
      throw e;
    }
  }

  if (!puedeUsuarioRegistrado) {
    throw new HttpError(
      403,
      "Solo el organizador o el capitán pueden agregar usuarios con cuenta al equipo",
    );
  }

  const targetUserId = body.idUsuario ?? actorUserId;
  if (!canOrg && targetUserId !== actorUserId) {
    throw new HttpError(
      403,
      "Como capitán solo puede agregarse a sí mismo con cuenta",
    );
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
      equipo: {
        include: { torneo: { select: { idTorneo: true, estado: true } } },
      },
    },
  });
  if (!jugador) {
    throw new HttpError(404, "Jugador no encontrado en este equipo");
  }

  const torneoId = jugador.equipo.torneo.idTorneo;
  const canOrg = await userCanManageTorneo(actorUserId, torneoId);
  const canCap = await userIsCapitanDeEquipo(actorUserId, idEquipo);
  const canLider = await userIsLiderEquipoEnEquipo(actorUserId, idEquipo);
  if (!canOrg && !canCap && !canLider) {
    throw new HttpError(
      403,
      "Solo el organizador, el capitán o un líder de equipo pueden quitar jugadores",
    );
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

  void registrarCambio({
    tablaAfectada: "JUGADOR",
    idRegistro: idJugador,
    campoModificado: "estado",
    valorAnterior: "activo",
    valorNuevo: "eliminado",
    tipoOperacion: "delete",
    idUsuarioModifica: actorUserId,
    razonCambio: `Baja de jugador en equipo ${idEquipo}`,
  });
}

export async function deleteEquipo(
  idEquipo: number,
  actorUserId: number,
): Promise<void> {
  const prisma = getPrisma();
  const equipo = await prisma.equipo.findUnique({
    where: { idEquipo },
    include: {
      torneo: {
        select: { idTorneo: true, estado: true, nombre: true },
      },
    },
  });
  if (!equipo || equipo.estadoEquipo !== "activo") {
    throw new HttpError(404, "Equipo no encontrado");
  }

  const torneoId = equipo.torneo.idTorneo;
  const canOrg = await userCanManageTorneo(actorUserId, torneoId);
  const canCap = await userIsCapitanDeEquipo(actorUserId, idEquipo);
  if (!canOrg && !canCap) {
    throw new HttpError(
      403,
      "Solo el organizador o el capitán pueden eliminar la inscripción del equipo",
    );
  }

  if (
    equipo.torneo.estado === "finalizado" ||
    equipo.torneo.estado === "cancelado"
  ) {
    throw new HttpError(
      400,
      "No se puede eliminar equipos de un torneo finalizado o cancelado",
    );
  }

  const enfrentamientos = await prisma.enfrentamiento.findMany({
    where: {
      idTorneo: torneoId,
      OR: [{ idEquipo1: idEquipo }, { idEquipo2: idEquipo }],
    },
    include: {
      resultados: { select: { validado: true } },
    },
  });

  for (const enf of enfrentamientos) {
    const tieneValidado = enf.resultados.some((r) => r.validado === true);
    if (tieneValidado) {
      throw new HttpError(
        400,
        "No se puede eliminar un equipo que ya tiene resultados validados en el bracket",
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const enf of enfrentamientos) {
      if (enf.idEquipo1 === idEquipo || enf.idEquipo2 === idEquipo) {
        await tx.enfrentamiento.update({
          where: { idEnfrentamiento: enf.idEnfrentamiento },
          data: {
            ...(enf.idEquipo1 === idEquipo ? { idEquipo1: null } : {}),
            ...(enf.idEquipo2 === idEquipo ? { idEquipo2: null } : {}),
          },
        });
      }
      const pendiente = await tx.resultado.findFirst({
        where: { idEnfrentamiento: enf.idEnfrentamiento, validado: false },
      });
      if (pendiente) {
        await tx.resultado.delete({ where: { idResultado: pendiente.idResultado } });
        await tx.enfrentamiento.update({
          where: { idEnfrentamiento: enf.idEnfrentamiento },
          data: { estado: "pendiente" },
        });
      }
    }

    await tx.equipo.delete({ where: { idEquipo } });
  });

  await syncNumInscritos(torneoId);

  void registrarCambio({
    tablaAfectada: "EQUIPO",
    idRegistro: idEquipo,
    campoModificado: "inscripcion",
    valorAnterior: equipo.nombreEquipo,
    valorNuevo: null,
    tipoOperacion: "delete",
    idUsuarioModifica: actorUserId,
    razonCambio: `Equipo dado de baja en torneo ${equipo.torneo.nombre}`,
  });
}

export async function updateEquipo(
  idEquipo: number,
  actorUserId: number,
  body: UpdateEquipoBody,
) {
  const prisma = getPrisma();
  const equipo = await prisma.equipo.findUnique({
    where: { idEquipo },
    include: { torneo: { select: { idTorneo: true, estado: true } } },
  });
  if (!equipo) {
    throw new HttpError(404, "Equipo no encontrado");
  }

  const canOrg = await userCanManageTorneo(actorUserId, equipo.torneo.idTorneo);
  const canCap = await userIsCapitanDeEquipo(actorUserId, idEquipo);
  if (!canOrg && !canCap) {
    throw new HttpError(
      403,
      "Solo el organizador o el capitán pueden editar el equipo",
    );
  }

  if (
    equipo.torneo.estado === "finalizado" ||
    equipo.torneo.estado === "cancelado"
  ) {
    throw new HttpError(400, "No se puede editar equipos en este estado del torneo");
  }

  const nombreAnterior = equipo.nombreEquipo;

  try {
    const actualizado = await prisma.equipo.update({
      where: { idEquipo },
      data: {
        ...(body.nombreEquipo !== undefined
          ? { nombreEquipo: body.nombreEquipo.trim() }
          : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
      },
    });

    if (
      body.nombreEquipo !== undefined &&
      body.nombreEquipo.trim() !== nombreAnterior
    ) {
      void registrarCambio({
        tablaAfectada: "EQUIPO",
        idRegistro: idEquipo,
        campoModificado: "nombreEquipo",
        valorAnterior: nombreAnterior,
        valorNuevo: body.nombreEquipo.trim(),
        tipoOperacion: "update",
        idUsuarioModifica: actorUserId,
      });
    }

    return actualizado;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Ya existe un equipo con ese nombre en el torneo");
    }
    throw e;
  }
}
