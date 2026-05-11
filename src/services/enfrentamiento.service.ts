import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import { userCanManageTorneo } from "../utils/torneoAcl";
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
    select: { estado: true },
  });
  if (!torneo) {
    throw new HttpError(404, "Torneo no encontrado");
  }
  if (torneo.estado && ESTADOS_TORNEO_BLOQUEAN_PARTIDAS.has(torneo.estado)) {
    throw new HttpError(400, "No se pueden crear partidas en este estado del torneo");
  }

  await assertEquiposPertenecenATorneo(
    idTorneo,
    body.idEquipo1,
    body.idEquipo2,
  );

  let fechaProgramada: Date | null = null;
  if (body.fechaProgramada !== undefined && body.fechaProgramada.trim() !== "") {
    const fp = new Date(body.fechaProgramada);
    if (Number.isNaN(fp.getTime())) {
      throw new HttpError(400, "fechaProgramada no es una fecha válida");
    }
    fechaProgramada = fp;
  }

  return prisma.enfrentamiento.create({
    data: {
      idTorneo,
      fase: body.fase.trim(),
      numeroRonda: body.numeroRonda ?? null,
      idEquipo1: body.idEquipo1 ?? null,
      idEquipo2: body.idEquipo2 ?? null,
      fechaProgramada,
      ubicacion: body.ubicacion?.trim() || null,
      posicionBracket: body.posicionBracket?.trim() || null,
      estado: "pendiente",
    },
    include: {
      equipo1: { select: { idEquipo: true, nombreEquipo: true, logoUrl: true } },
      equipo2: { select: { idEquipo: true, nombreEquipo: true, logoUrl: true } },
    },
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
      "Solo un jugador de uno de los equipos del enfrentamiento puede registrar el resultado",
    );
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
