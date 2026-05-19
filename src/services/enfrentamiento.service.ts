import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import {
  userCanManageTorneo,
  userCanRegistrarResultadosTorneo,
} from "../utils/torneoAcl";
import {
  countEmptySlots,
  findNextEmptyPairSlot,
  generarBracketSkeleton,
  intentarEmparejarUltimosDosEquipos,
} from "./bracketGenerator.service";
import { ganadorYaAsignadoEnSiguiente } from "./bracketAdvance.service";
import { notificarEnfrentamientoProgramado } from "./notificacion.service";
import type { AsignarEquipoSlotBody } from "../validators/enfrentamiento.validator";
import type { CrearEnfrentamientoBody } from "../validators/enfrentamiento.validator";
import type { RegistrarResultadoBody } from "../validators/resultado.validator";

const ESTADO_ESPERANDO_VALIDACION = "esperando_validacion";
const ESTADOS_BLOQUEAN_REGISTRO = new Set(["finalizado", "cancelado"]);
const ESTADOS_TORNEO_BLOQUEAN_PARTIDAS = new Set(["finalizado", "cancelado"]);

async function assertEquiposPertenecenATorneo(
  idTorneo: number,
  idEquipo1: number | null | undefined,
  idEquipo2: number | null | undefined,
): Promise<void> {
  const prisma = getPrisma();
  const ids = [idEquipo1, idEquipo2].filter(
    (x): x is number => typeof x === "number",
  );
  if (ids.length === 0) return;
  const unicos = [...new Set(ids)];
  if (unicos.length !== ids.length) {
    throw new HttpError(400, "No puede enfrentar un equipo contra sí mismo");
  }
  const count = await prisma.equipo.count({
    where: { idTorneo, idEquipo: { in: unicos } },
  });
  if (count !== unicos.length) {
    throw new HttpError(400, "Los equipos deben pertenecer al mismo torneo");
  }
}

const enfInclude = {
  equipo1: { select: { idEquipo: true, nombreEquipo: true, logoUrl: true } },
  equipo2: { select: { idEquipo: true, nombreEquipo: true, logoUrl: true } },
} as const;

async function asegurarSkeleton(idTorneo: number): Promise<void> {
  const prisma = getPrisma();
  const n = await prisma.enfrentamiento.count({ where: { idTorneo } });
  if (n === 0) {
    await generarBracketSkeleton(idTorneo);
  }
}

async function assertEquipoLibreEnBracket(
  idTorneo: number,
  idEquipo: number,
  exceptoIdEnfrentamiento?: number,
): Promise<void> {
  const prisma = getPrisma();
  const ocupado = await prisma.enfrentamiento.findFirst({
    where: {
      idTorneo,
      ...(exceptoIdEnfrentamiento != null
        ? { idEnfrentamiento: { not: exceptoIdEnfrentamiento } }
        : {}),
      OR: [{ idEquipo1: idEquipo }, { idEquipo2: idEquipo }],
    },
  });
  if (ocupado) {
    throw new HttpError(
      409,
      "Ese equipo ya está asignado a otro enfrentamiento del bracket",
    );
  }
}

function parseFechaProgramada(raw: string | undefined): Date | null {
  if (raw === undefined || raw.trim() === "") return null;
  const fp = new Date(raw);
  if (Number.isNaN(fp.getTime())) {
    throw new HttpError(400, "fechaProgramada no es una fecha válida");
  }
  return fp;
}

/** Asigna un equipo a un cupo (1 o 2) de un enfrentamiento del bracket. */
export async function asignarEquipoASlot(
  idEnfrentamiento: number,
  actorUserId: number,
  body: AsignarEquipoSlotBody,
) {
  const prisma = getPrisma();
  const enf = await prisma.enfrentamiento.findUnique({
    where: { idEnfrentamiento },
    include: {
      torneo: { select: { nombre: true, estado: true, idFaseInicial: true } },
    },
  });
  if (!enf) throw new HttpError(404, "Enfrentamiento no encontrado");

  const puede = await userCanManageTorneo(actorUserId, enf.idTorneo);
  if (!puede) {
    throw new HttpError(403, "Solo el organizador puede asignar equipos al bracket");
  }

  if (enf.torneo.estado && ESTADOS_TORNEO_BLOQUEAN_PARTIDAS.has(enf.torneo.estado)) {
    throw new HttpError(400, "No se puede modificar el bracket en este estado");
  }

  if (
    enf.idFase != null &&
    enf.torneo.idFaseInicial != null &&
    enf.idFase !== enf.torneo.idFaseInicial
  ) {
    throw new HttpError(
      400,
      "Solo puede asignar equipos manualmente en la fase inicial del bracket",
    );
  }

  const slotOcupado =
    body.lado === 1 ? enf.idEquipo1 !== null : enf.idEquipo2 !== null;
  if (slotOcupado) {
    throw new HttpError(409, "Ese cupo del enfrentamiento ya tiene un equipo");
  }

  const otroEquipo = body.lado === 1 ? enf.idEquipo2 : enf.idEquipo1;
  if (otroEquipo != null && otroEquipo === body.idEquipo) {
    throw new HttpError(
      400,
      "Un equipo no puede enfrentarse a sí mismo en la misma partida",
    );
  }

  await assertEquiposPertenecenATorneo(enf.idTorneo, body.idEquipo, undefined);
  await assertEquipoLibreEnBracket(enf.idTorneo, body.idEquipo, idEnfrentamiento);

  const data =
    body.lado === 1
      ? { idEquipo1: body.idEquipo }
      : { idEquipo2: body.idEquipo };

  const actualizado = await prisma.enfrentamiento.update({
    where: { idEnfrentamiento },
    data,
    include: enfInclude,
  });

  if (actualizado.idEquipo1 != null && actualizado.idEquipo2 != null) {
    void notificarEnfrentamientoProgramado(idEnfrentamiento);
  }

  return actualizado;
}

/**
 * Coloca un par de equipos en el siguiente enfrentamiento vacío del bracket
 * (orden: fases iniciales → final, partida por partida).
 */
export async function crearEnfrentamientoEnTorneo(
  idTorneo: number,
  actorUserId: number,
  body: CrearEnfrentamientoBody,
) {
  const puede = await userCanManageTorneo(actorUserId, idTorneo);
  if (!puede) {
    throw new HttpError(403, "Solo el organizador puede crear enfrentamientos");
  }

  const prisma = getPrisma();
  const torneo = await prisma.torneo.findUnique({
    where: { idTorneo },
    select: { estado: true, nombre: true },
  });
  if (!torneo) {
    throw new HttpError(404, "Torneo no encontrado");
  }
  if (torneo.estado && ESTADOS_TORNEO_BLOQUEAN_PARTIDAS.has(torneo.estado)) {
    throw new HttpError(400, "No se pueden crear partidas en este estado del torneo");
  }

  await asegurarSkeleton(idTorneo);

  const e1 = body.idEquipo1;
  const e2 = body.idEquipo2;

  if (e1 == null && e2 == null) {
    throw new HttpError(
      400,
      "Seleccione dos equipos para ubicarlos en el bracket, o use asignación manual por cupo",
    );
  }

  if (e1 != null && e2 != null) {
    if (e1 === e2) {
      throw new HttpError(
        400,
        "Debe elegir dos equipos distintos para el enfrentamiento",
      );
    }
    await assertEquiposPertenecenATorneo(idTorneo, e1, e2);
    await assertEquipoLibreEnBracket(idTorneo, e1);
    await assertEquipoLibreEnBracket(idTorneo, e2);

    const vacios = await countEmptySlots(idTorneo);
    if (vacios < 2) {
      throw new HttpError(
        400,
        vacios === 1
          ? "Solo queda un cupo libre: use «Asignar equipo manualmente» en el bracket"
          : "No hay cupos libres en el bracket",
      );
    }

    const slot = await findNextEmptyPairSlot(idTorneo);
    if (!slot) {
      throw new HttpError(
        400,
        "No hay un enfrentamiento con ambos cupos libres. Use asignación manual en el bracket",
      );
    }

    const fechaProgramada = parseFechaProgramada(body.fechaProgramada);
    const ubicacion = body.ubicacion?.trim();
    const actualizado = await prisma.enfrentamiento.update({
      where: { idEnfrentamiento: slot.idEnfrentamiento },
      data: {
        idEquipo1: e1,
        idEquipo2: e2,
        ...(fechaProgramada != null ? { fechaProgramada } : {}),
        ...(ubicacion ? { ubicacion } : {}),
      },
      include: enfInclude,
    });

    void notificarEnfrentamientoProgramado(slot.idEnfrentamiento);

    const autoPar = await intentarEmparejarUltimosDosEquipos(idTorneo);
    if (autoPar) {
      void notificarEnfrentamientoProgramado(autoPar.idEnfrentamiento);
      const auto = await prisma.enfrentamiento.findUnique({
        where: { idEnfrentamiento: autoPar.idEnfrentamiento },
        include: enfInclude,
      });
      if (auto) return auto;
    }

    return actualizado;
  }

  throw new HttpError(
    400,
    "Debe indicar los dos equipos del enfrentamiento o asignar uno por cupo en el bracket",
  );
}

/** Quita equipos de un enfrentamiento de la fase inicial (sin resultado validado). */
export async function limpiarAsignacionEnfrentamiento(
  idEnfrentamiento: number,
  actorUserId: number,
) {
  const prisma = getPrisma();
  const enf = await prisma.enfrentamiento.findUnique({
    where: { idEnfrentamiento },
    include: {
      torneo: { select: { idFaseInicial: true, estado: true, nombre: true } },
      resultados: { select: { idResultado: true, validado: true } },
    },
  });
  if (!enf) throw new HttpError(404, "Enfrentamiento no encontrado");

  const puede = await userCanManageTorneo(actorUserId, enf.idTorneo);
  if (!puede) {
    throw new HttpError(403, "Solo el organizador puede modificar el bracket");
  }

  if (enf.torneo.estado && ESTADOS_TORNEO_BLOQUEAN_PARTIDAS.has(enf.torneo.estado)) {
    throw new HttpError(400, "No se puede modificar el bracket en este estado");
  }

  if (
    enf.idFase != null &&
    enf.torneo.idFaseInicial != null &&
    enf.idFase !== enf.torneo.idFaseInicial
  ) {
    throw new HttpError(
      400,
      "Solo puede deshacer asignaciones en la fase inicial del torneo",
    );
  }

  const resValidado = enf.resultados.find((r) => r.validado === true);
  if (resValidado) {
    throw new HttpError(
      400,
      "No se puede deshacer: el resultado ya fue validado",
    );
  }

  await prisma.$transaction(async (tx) => {
    const pendiente = enf.resultados[0];
    if (pendiente) {
      await tx.resultado.delete({ where: { idResultado: pendiente.idResultado } });
    }
    await tx.enfrentamiento.update({
      where: { idEnfrentamiento },
      data: {
        idEquipo1: null,
        idEquipo2: null,
        estado: "pendiente",
        fechaJugada: null,
      },
    });
  });

  return prisma.enfrentamiento.findUnique({
    where: { idEnfrentamiento },
    include: enfInclude,
  });
}

function inferGanador(
  idEquipo1: number,
  idEquipo2: number,
  p1: number,
  p2: number,
): number | null {
  if (p1 > p2) return idEquipo1;
  if (p2 > p1) return idEquipo2;
  return null;
}

export async function registrarResultado(
  idEnfrentamiento: number,
  userId: number,
  body: RegistrarResultadoBody,
) {
  const prisma = getPrisma();

  const enf = await prisma.enfrentamiento.findUnique({
    where: { idEnfrentamiento },
    select: {
      idEnfrentamiento: true,
      idTorneo: true,
      idEquipo1: true,
      idEquipo2: true,
      estado: true,
    },
  });

  if (!enf) {
    throw new HttpError(404, "Enfrentamiento no encontrado");
  }

  const e1 = enf.idEquipo1;
  const e2 = enf.idEquipo2;
  if (e1 === null || e2 === null) {
    throw new HttpError(
      400,
      "El enfrentamiento debe tener ambos equipos asignados para registrar resultado",
    );
  }

  if (enf.estado && ESTADOS_BLOQUEAN_REGISTRO.has(enf.estado)) {
    throw new HttpError(400, "No se puede registrar resultado en este estado");
  }

  const puedeAmpliado = await userCanRegistrarResultadosTorneo(
    userId,
    enf.idTorneo,
  );
  if (!puedeAmpliado) {
    const pertenece = await prisma.jugador.findFirst({
      where: {
        idUsuario: userId,
        idTorneo: enf.idTorneo,
        idEquipo: { in: [e1, e2] },
        estadoJugador: "activo",
      },
    });
    if (!pertenece) {
      throw new HttpError(
        403,
        "No tiene permiso para registrar el resultado de este enfrentamiento",
      );
    }
  }

  const existente = await prisma.resultado.findUnique({
    where: { idEnfrentamiento },
  });

  if (existente?.validado === true) {
    throw new HttpError(409, "El resultado ya fue validado y no puede modificarse");
  }

  let idGanador =
    body.idEquipoGanador === undefined ? undefined : body.idEquipoGanador;
  if (idGanador === undefined) {
    idGanador = inferGanador(e1, e2, body.puntosEquipo1, body.puntosEquipo2);
  } else if (idGanador !== null && idGanador !== e1 && idGanador !== e2) {
    throw new HttpError(400, "idEquipoGanador debe ser uno de los equipos del enfrentamiento");
  }

  const dataResultado = {
    puntosEquipo1: body.puntosEquipo1,
    puntosEquipo2: body.puntosEquipo2,
    idEquipoGanador: idGanador,
    comentarios: body.comentarios?.trim() || null,
    evidenciaUrl: body.evidenciaUrl?.trim() || null,
    validado: false,
    idUsuarioValida: null,
    fechaValidacion: null,
  };

  const resultado = await prisma.$transaction(async (tx) => {
    if (
      existente &&
      (await ganadorYaAsignadoEnSiguiente(tx, idEnfrentamiento))
    ) {
      throw new HttpError(
        400,
        "No se puede modificar el resultado: el ganador ya avanzó a la siguiente fase",
      );
    }

    let r;
    if (existente) {
      r = await tx.resultado.update({
        where: { idResultado: existente.idResultado },
        data: dataResultado,
      });
    } else {
      r = await tx.resultado.create({
        data: {
          idEnfrentamiento,
          idUsuarioRegistro: userId,
          ...dataResultado,
        },
      });
    }

    await tx.enfrentamiento.update({
      where: { idEnfrentamiento },
      data: { estado: ESTADO_ESPERANDO_VALIDACION },
    });

    return r;
  });

  return resultado;
}
