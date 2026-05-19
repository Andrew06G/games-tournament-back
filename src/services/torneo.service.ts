import { Prisma } from "../../generated/prisma/client";
import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import { userCanManageTorneo } from "../utils/torneoAcl";
import { parseDateOnlyInput, startOfUtcDay } from "../utils/dates";
import {
  codigoFaseInicialPorCupo,
  esCupoBracketValido,
} from "../utils/fasesTorneo";
import { generarBracketSkeleton } from "./bracketGenerator.service";
import { registrarCambio } from "./historial.service";
import type {
  CreateTorneoBody,
  InscribirEquipoBody,
  UpdateTorneoBody,
} from "../validators/torneo.validator";

const ESTADOS_NO_EDITAR = new Set(["finalizado", "cancelado"]);
const ESTADO_INSCRIPCIONES = "inscripciones_abiertas";

function assertTorneoEditable(estado: string | null | undefined): void {
  if (estado && ESTADOS_NO_EDITAR.has(estado)) {
    throw new HttpError(
      400,
      "No se puede modificar un torneo finalizado o cancelado",
    );
  }
}

function assertFechaInicioNoPasada(fechaInicio: Date): void {
  const hoy = startOfUtcDay(new Date());
  const inicio = startOfUtcDay(fechaInicio);
  if (inicio < hoy) {
    throw new HttpError(400, "La fecha de inicio no puede ser en el pasado");
  }
}

async function syncNumInscritos(idTorneo: number): Promise<void> {
  const prisma = getPrisma();
  const count = await prisma.equipo.count({
    where: { idTorneo, estadoEquipo: "activo" },
  });
  await prisma.torneo.update({
    where: { idTorneo },
    data: { numInscritos: count },
  });
}

const torneoListInclude = {
  tipoVideojuego: { select: { idTipo: true, nombre: true } },
  formato: { select: { idFormato: true, nombre: true } },
  organizador: {
    select: { idUsuario: true, nombre: true, email: true },
  },
  faseInicial: {
    select: { idFase: true, codigo: true, nombre: true, numEquipos: true },
  },
  _count: { select: { equipos: true, enfrentamientos: true } },
} satisfies Prisma.TorneoInclude;

export async function listTorneos(estado?: string) {
  const prisma = getPrisma();
  const where =
    estado !== undefined && estado.length > 0
      ? { estado }
      : ({} as Prisma.TorneoWhereInput);

  return prisma.torneo.findMany({
    where,
    include: torneoListInclude,
    orderBy: { fechaInicio: "desc" },
  });
}

export async function getTorneoById(idTorneo: number) {
  const prisma = getPrisma();
  const torneo = await prisma.torneo.findUnique({
    where: { idTorneo },
    include: {
      ...torneoListInclude,
      equipos: {
        where: { estadoEquipo: "activo" },
        select: {
          idEquipo: true,
          nombreEquipo: true,
          logoUrl: true,
          fechaInscripcion: true,
          estadoEquipo: true,
          jugadores: {
            where: { estadoJugador: "activo" },
            select: {
              idJugador: true,
              idUsuario: true,
              nickname: true,
              esCapitan: true,
              contactoPreferido: true,
              usuario: { select: { email: true } },
            },
          },
          _count: { select: { jugadores: true } },
        },
      },
      enfrentamientos: {
        orderBy: [{ fase: "asc" }, { idEnfrentamiento: "asc" }],
        include: {
          equipo1: {
            select: { idEquipo: true, nombreEquipo: true, logoUrl: true },
          },
          equipo2: {
            select: { idEquipo: true, nombreEquipo: true, logoUrl: true },
          },
          resultados: {
            select: {
              idResultado: true,
              validado: true,
              puntosEquipo1: true,
              puntosEquipo2: true,
              idEquipoGanador: true,
            },
          },
        },
      },
    },
  });
  if (!torneo) {
    throw new HttpError(404, "Torneo no encontrado");
  }
  return torneo;
}

export async function createTorneo(
  organizadorId: number,
  body: CreateTorneoBody,
) {
  const prisma = getPrisma();
  const fechaInicio = parseDateOnlyInput(body.fechaInicio);
  assertFechaInicioNoPasada(fechaInicio);

  const fechaFin =
    body.fechaFin !== undefined && body.fechaFin !== null && body.fechaFin !== ""
      ? parseDateOnlyInput(body.fechaFin)
      : null;
  if (fechaFin && fechaFin < fechaInicio) {
    throw new HttpError(400, "La fecha de fin no puede ser anterior al inicio");
  }

  if (!esCupoBracketValido(body.numMaxParticipantes)) {
    throw new HttpError(
      400,
      "El cupo de equipos debe ser 2, 4, 8, 16 o 32 para bracket de eliminación",
    );
  }

  const codigoFase = codigoFaseInicialPorCupo(body.numMaxParticipantes);
  const faseInicial = await prisma.faseTorneo.findUnique({
    where: { codigo: codigoFase },
  });
  if (!faseInicial) {
    throw new HttpError(
      500,
      "Catálogo de fases incompleto. Ejecute las migraciones y el seed.",
    );
  }

  const torneo = await prisma.torneo.create({
    data: {
      nombre: body.nombre.trim(),
      descripcion: body.descripcion?.trim() ?? null,
      idTipoVideojuego: body.idTipoVideojuego,
      idFormato: body.idFormato,
      idOrganizador: organizadorId,
      fechaInicio,
      fechaFin,
      numMaxParticipantes: body.numMaxParticipantes,
      idFaseInicial: faseInicial.idFase,
      numInscritos: 0,
      premioDescripcion: body.premioDescripcion?.trim() ?? null,
      reglas: body.reglas?.trim() ?? null,
      estado: ESTADO_INSCRIPCIONES,
    },
    include: {
      ...torneoListInclude,
      faseInicial: {
        select: { idFase: true, codigo: true, nombre: true, numEquipos: true },
      },
    },
  });

  await generarBracketSkeleton(torneo.idTorneo);

  return torneo;
}

export async function updateTorneo(
  idTorneo: number,
  body: UpdateTorneoBody,
) {
  const prisma = getPrisma();
  const actual = await prisma.torneo.findUnique({ where: { idTorneo } });
  if (!actual) {
    throw new HttpError(404, "Torneo no encontrado");
  }
  assertTorneoEditable(actual.estado);

  const data: Prisma.TorneoUpdateInput = {};

  if (body.nombre !== undefined) data.nombre = body.nombre.trim();
  if (body.descripcion !== undefined) {
    data.descripcion =
      body.descripcion === null ? null : body.descripcion.trim();
  }
  if (body.idTipoVideojuego !== undefined) {
    data.tipoVideojuego = { connect: { idTipo: body.idTipoVideojuego } };
  }
  if (body.idFormato !== undefined) {
    data.formato = { connect: { idFormato: body.idFormato } };
  }
  if (body.premioDescripcion !== undefined) {
    data.premioDescripcion =
      body.premioDescripcion === null ? null : body.premioDescripcion.trim();
  }
  if (body.reglas !== undefined) {
    data.reglas = body.reglas === null ? null : body.reglas.trim();
  }
  if (body.estado !== undefined) {
    data.estado = body.estado;
  }

  if (body.fechaInicio !== undefined) {
    const fi = parseDateOnlyInput(body.fechaInicio);
    assertFechaInicioNoPasada(fi);
    data.fechaInicio = fi;
  }
  if (body.fechaFin !== undefined) {
    data.fechaFin =
      body.fechaFin === null || body.fechaFin === ""
        ? null
        : parseDateOnlyInput(body.fechaFin);
  }
  if (body.numMaxParticipantes !== undefined) {
    const activos = await prisma.equipo.count({
      where: { idTorneo, estadoEquipo: "activo" },
    });
    if (body.numMaxParticipantes < activos) {
      throw new HttpError(
        400,
        "numMaxParticipantes no puede ser menor que equipos activos inscritos",
      );
    }
    data.numMaxParticipantes = body.numMaxParticipantes;
  }

  const nuevaFechaInicio =
    body.fechaInicio !== undefined
      ? parseDateOnlyInput(body.fechaInicio)
      : actual.fechaInicio;
  const nuevaFechaFin =
    body.fechaFin !== undefined
      ? body.fechaFin === null || body.fechaFin === ""
        ? null
        : parseDateOnlyInput(body.fechaFin)
      : actual.fechaFin;
  if (nuevaFechaFin && nuevaFechaFin < nuevaFechaInicio) {
    throw new HttpError(400, "La fecha de fin no puede ser anterior al inicio");
  }

  return prisma.torneo.update({
    where: { idTorneo },
    data,
    include: torneoListInclude,
  });
}

export async function deleteTorneo(idTorneo: number): Promise<void> {
  const prisma = getPrisma();
  const actual = await prisma.torneo.findUnique({ where: { idTorneo } });
  if (!actual) {
    throw new HttpError(404, "Torneo no encontrado");
  }
  assertTorneoEditable(actual.estado);
  await prisma.torneo.delete({ where: { idTorneo } });
}

export async function inscribirEquipo(
  idTorneo: number,
  userId: number,
  body: InscribirEquipoBody,
) {
  const prisma = getPrisma();
  const torneo = await prisma.torneo.findUnique({
    where: { idTorneo },
    select: {
      estado: true,
      numMaxParticipantes: true,
    },
  });
  if (!torneo) {
    throw new HttpError(404, "Torneo no encontrado");
  }
  const esOrganizador = await userCanManageTorneo(userId, idTorneo);

  if (!esOrganizador && torneo.estado !== ESTADO_INSCRIPCIONES) {
    throw new HttpError(
      400,
      "Solo se pueden inscribir equipos cuando el torneo tiene inscripciones abiertas",
    );
  }
  if (esOrganizador && torneo.estado && ESTADOS_NO_EDITAR.has(torneo.estado)) {
    throw new HttpError(
      400,
      "No se pueden inscribir equipos en un torneo finalizado o cancelado",
    );
  }

  const activos = await prisma.equipo.count({
    where: { idTorneo, estadoEquipo: "activo" },
  });
  if (activos >= torneo.numMaxParticipantes) {
    throw new HttpError(400, "Capacidad máxima de participantes alcanzada");
  }

  if (!esOrganizador) {
    const yaInscrito = await prisma.jugador.findFirst({
      where: { idTorneo, idUsuario: userId },
    });
    if (yaInscrito) {
      throw new HttpError(
        409,
        "Ya participas en este torneo con otro equipo o registro",
      );
    }
  }

  let nicknameCapitan = body.nickname?.trim() ?? "";
  if (!esOrganizador && nicknameCapitan.length < 1) {
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: userId },
      select: { nickname: true },
    });
    nicknameCapitan = usuario?.nickname?.trim() ?? "";
  }
  if (!esOrganizador && nicknameCapitan.length < 1) {
    nicknameCapitan = body.nombreEquipo.trim().slice(0, 50);
  }
  if (esOrganizador && nicknameCapitan.length < 1) {
    throw new HttpError(
      400,
      "Indique el nickname del capitán o representante del equipo",
    );
  }
  const dupNick = await prisma.jugador.findFirst({
    where: { idTorneo, nickname: nicknameCapitan },
  });
  if (dupNick) {
    throw new HttpError(
      409,
      "Ese nickname ya está en uso en este torneo",
    );
  }

  try {
    const equipo = await prisma.equipo.create({
      data: {
        idTorneo,
        nombreEquipo: body.nombreEquipo.trim(),
        logoUrl: body.logoUrl?.trim() || null,
        estadoEquipo: "activo",
      },
    });
    await syncNumInscritos(idTorneo);

    const capitan = await prisma.jugador.create({
      data: {
        idUsuario: esOrganizador ? null : userId,
        idEquipo: equipo.idEquipo,
        idTorneo,
        nickname: nicknameCapitan,
        esCapitan: true,
        estadoJugador: "activo",
        contactoPreferido: body.contactoPreferido?.trim() || null,
      },
    });

    void registrarCambio({
      tablaAfectada: "EQUIPO",
      idRegistro: equipo.idEquipo,
      campoModificado: "inscripcion",
      valorAnterior: null,
      valorNuevo: equipo.nombreEquipo,
      tipoOperacion: "insert",
      idUsuarioModifica: userId,
    });

    return { equipo, jugadorCapitan: capitan };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(
        409,
        "Ya existe un equipo con ese nombre en este torneo",
      );
    }
    throw e;
  }
}

export { syncNumInscritos };
