import { getPrisma } from "../config/database";
import { getSocketIO } from "../config/socket";
import { HttpError } from "../utils/httpError";
import { userCanManageTorneo } from "../utils/torneoAcl";
import {
  propagarGanadorAlSiguiente,
  resolverIdGanadorValidado,
} from "./bracketAdvance.service";
import {
  notificarEnfrentamientoProgramado,
  notificarJugadoresEquipo,
} from "./notificacion.service";

export async function validarResultado(idResultado: number, userId: number) {
  const prisma = getPrisma();

  const resultado = await prisma.resultado.findUnique({
    where: { idResultado },
    include: {
      enfrentamiento: {
        select: {
          idEnfrentamiento: true,
          idTorneo: true,
          idEquipo1: true,
          idEquipo2: true,
          idEnfrentamientoSiguiente: true,
          fase: true,
        },
      },
    },
  });

  if (!resultado) {
    throw new HttpError(404, "Resultado no encontrado");
  }

  if (resultado.validado === true) {
    throw new HttpError(400, "Este resultado ya fue validado");
  }

  const enf = resultado.enfrentamiento;
  const e1 = enf.idEquipo1;
  const e2 = enf.idEquipo2;
  if (e1 === null || e2 === null) {
    throw new HttpError(400, "Enfrentamiento sin equipos completos");
  }

  const equiposIds = [e1, e2];
  const esOrganizador = await userCanManageTorneo(userId, enf.idTorneo);

  let puedeValidar = esOrganizador;

  if (!puedeValidar) {
    const equipoRegistrador = await prisma.jugador.findFirst({
      where: {
        idUsuario: resultado.idUsuarioRegistro,
        idTorneo: enf.idTorneo,
        idEquipo: { in: equiposIds },
        estadoJugador: "activo",
      },
      select: { idEquipo: true },
    });

    if (equipoRegistrador) {
      const equiposRival = equiposIds.filter(
        (id) => id !== equipoRegistrador.idEquipo,
      );
      const esRival = await prisma.jugador.findFirst({
        where: {
          idUsuario: userId,
          idTorneo: enf.idTorneo,
          idEquipo: { in: equiposRival },
          estadoJugador: "activo",
        },
      });
      puedeValidar = esRival !== null;
    } else {
      puedeValidar = false;
    }
  }

  if (!puedeValidar) {
    throw new HttpError(
      403,
      "Solo el organizador del torneo o un jugador del equipo rival puede validar el resultado",
    );
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const r = await tx.resultado.update({
      where: { idResultado },
      data: {
        validado: true,
        idUsuarioValida: userId,
        fechaValidacion: new Date(),
      },
    });
    await tx.enfrentamiento.update({
      where: { idEnfrentamiento: enf.idEnfrentamiento },
      data: {
        estado: "finalizado",
        fechaJugada: new Date(),
      },
    });

    const idGanador = await resolverIdGanadorValidado(
      tx,
      enf.idEnfrentamiento,
    );
    if (idGanador != null) {
      await propagarGanadorAlSiguiente(tx, enf.idEnfrentamiento, idGanador);
    }

    const esFinal = enf.idEnfrentamientoSiguiente == null;
    if (esFinal) {
      await tx.torneo.update({
        where: { idTorneo: enf.idTorneo },
        data: {
          estado: "finalizado",
          fechaFin: new Date(),
        },
      });
    }

    return { resultado: r, esFinal, idGanador };
  });

  const torneoRow = await prisma.torneo.findUnique({
    where: { idTorneo: enf.idTorneo },
    select: { nombre: true },
  });

  if (actualizado.esFinal && actualizado.idGanador != null) {
    const equipoCampeon = await prisma.equipo.findUnique({
      where: { idEquipo: actualizado.idGanador },
      select: { nombreEquipo: true },
    });
    void notificarJugadoresEquipo(actualizado.idGanador, {
      tipo: "campeon_torneo",
      titulo: "¡Campeones del torneo!",
      mensaje: `¡Felicitaciones a ${equipoCampeon?.nombreEquipo ?? "su equipo"}! Han sido campeones de "${torneoRow?.nombre ?? "el torneo"}".`,
      idTorneo: enf.idTorneo,
      idEnfrentamiento: enf.idEnfrentamiento,
    });
  } else if (enf.idEnfrentamientoSiguiente != null) {
    void notificarEnfrentamientoProgramado(enf.idEnfrentamientoSiguiente);
  }

  const io = getSocketIO();
  if (io) {
    io.emit("resultado:validado", {
      enfrentamientoId: enf.idEnfrentamiento,
      resultadoId: idResultado,
      torneoId: enf.idTorneo,
      torneoFinalizado: actualizado.esFinal,
    });
    io.emit("bracket:updated", { torneoId: enf.idTorneo });
    if (actualizado.esFinal) {
      io.emit("torneo:finalizado", { torneoId: enf.idTorneo });
    }
  }

  return actualizado.resultado;
}

export type EquipoDestacadoRol = "campeon" | "subcampeon" | null;

export async function listResultadosRecientes(page = 0, limit = 10) {
  const prisma = getPrisma();
  const safeLimit = Math.min(50, Math.max(1, limit));
  const safePage = Math.max(0, page);
  const skip = safePage * safeLimit;

  const where = { validado: true as const };

  const [rows, total] = await Promise.all([
    prisma.resultado.findMany({
      where,
      orderBy: [{ fechaValidacion: "desc" }, { fechaRegistro: "desc" }],
      skip,
      take: safeLimit,
      include: {
        enfrentamiento: {
          select: {
            idEnfrentamiento: true,
            idEnfrentamientoSiguiente: true,
            fase: true,
            idEquipo1: true,
            idEquipo2: true,
            equipo1: { select: { idEquipo: true, nombreEquipo: true } },
            equipo2: { select: { idEquipo: true, nombreEquipo: true } },
            torneo: {
              select: { idTorneo: true, nombre: true, estado: true },
            },
          },
        },
        equipoGanador: { select: { idEquipo: true, nombreEquipo: true } },
      },
    }),
    prisma.resultado.count({ where }),
  ]);

  const resultados = rows.map((r) => {
    const enf = r.enfrentamiento;
    const esFinal = enf.idEnfrentamientoSiguiente == null;
    const p1 = r.puntosEquipo1;
    const p2 = r.puntosEquipo2;

    let idGanador = r.idEquipoGanador;
    if (idGanador == null && p1 != null && p2 != null && p1 !== p2) {
      idGanador =
        p1 > p2 ? enf.idEquipo1 : p2 > p1 ? enf.idEquipo2 : null;
    }

    let rolEquipo1: EquipoDestacadoRol = null;
    let rolEquipo2: EquipoDestacadoRol = null;
    if (esFinal && idGanador != null) {
      if (idGanador === enf.idEquipo1) {
        rolEquipo1 = "campeon";
        rolEquipo2 = "subcampeon";
      } else if (idGanador === enf.idEquipo2) {
        rolEquipo2 = "campeon";
        rolEquipo1 = "subcampeon";
      }
    }

    return {
      idResultado: r.idResultado,
      puntosEquipo1: p1,
      puntosEquipo2: p2,
      fechaValidacion: r.fechaValidacion,
      rolEquipo1,
      rolEquipo2,
      torneo: enf.torneo,
      enfrentamiento: {
        idEnfrentamiento: enf.idEnfrentamiento,
        fase: enf.fase,
        esFinal,
      },
      equipo1: enf.equipo1,
      equipo2: enf.equipo2,
      equipoGanador: r.equipoGanador,
      idEquipoGanador: idGanador,
    };
  });

  return {
    resultados,
    paginacion: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}
