import type { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../utils/httpError";

type Tx = Prisma.TransactionClient;

function inferGanador(
  idEquipo1: number,
  idEquipo2: number,
  p1: number | null,
  p2: number | null,
  idEquipoGanador: number | null,
): number | null {
  if (idEquipoGanador != null) {
    if (idEquipoGanador !== idEquipo1 && idEquipoGanador !== idEquipo2) {
      throw new HttpError(400, "Ganador inválido para este enfrentamiento");
    }
    return idEquipoGanador;
  }
  if (p1 == null || p2 == null) return null;
  if (p1 > p2) return idEquipo1;
  if (p2 > p1) return idEquipo2;
  return null;
}

/**
 * Coloca al ganador en el cupo correspondiente del enfrentamiento siguiente
 * (primer alimentador → lado 1, segundo → lado 2).
 */
export async function propagarGanadorAlSiguiente(
  tx: Tx,
  idEnfrentamiento: number,
  idGanador: number,
): Promise<void> {
  const actual = await tx.enfrentamiento.findUnique({
    where: { idEnfrentamiento },
    select: { idEnfrentamientoSiguiente: true },
  });
  const nextId = actual?.idEnfrentamientoSiguiente;
  if (nextId == null) return;

  const alimentadores = await tx.enfrentamiento.findMany({
    where: { idEnfrentamientoSiguiente: nextId },
    orderBy: [{ posicionBracket: "asc" }, { idEnfrentamiento: "asc" }],
    select: { idEnfrentamiento: true },
  });

  const idx = alimentadores.findIndex(
    (e) => e.idEnfrentamiento === idEnfrentamiento,
  );
  if (idx < 0) return;

  const lado: 1 | 2 = idx === 0 ? 1 : 2;
  const siguiente = await tx.enfrentamiento.findUnique({
    where: { idEnfrentamiento: nextId },
    select: { idEquipo1: true, idEquipo2: true },
  });
  if (!siguiente) return;

  const ocupado = lado === 1 ? siguiente.idEquipo1 : siguiente.idEquipo2;
  if (ocupado != null && ocupado !== idGanador) {
    throw new HttpError(
      409,
      "El cupo en la siguiente fase ya tiene otro equipo asignado",
    );
  }
  if (ocupado === idGanador) return;

  await tx.enfrentamiento.update({
    where: { idEnfrentamiento: nextId },
    data: lado === 1 ? { idEquipo1: idGanador } : { idEquipo2: idGanador },
  });
}

/** True si el ganador validado ya ocupa un cupo en la siguiente ronda. */
export async function ganadorYaAsignadoEnSiguiente(
  tx: Tx,
  idEnfrentamiento: number,
): Promise<boolean> {
  const enf = await tx.enfrentamiento.findUnique({
    where: { idEnfrentamiento },
    select: {
      idEnfrentamientoSiguiente: true,
    },
  });
  if (enf?.idEnfrentamientoSiguiente == null) return false;

  const resultado = await tx.resultado.findUnique({
    where: { idEnfrentamiento },
    select: { validado: true },
  });
  if (resultado?.validado !== true) return false;

  const idGanador = await resolverIdGanadorValidado(tx, idEnfrentamiento);
  if (idGanador == null) return false;

  const siguiente = await tx.enfrentamiento.findUnique({
    where: { idEnfrentamiento: enf.idEnfrentamientoSiguiente },
    select: { idEquipo1: true, idEquipo2: true },
  });
  if (!siguiente) return false;
  return (
    siguiente.idEquipo1 === idGanador || siguiente.idEquipo2 === idGanador
  );
}

export async function resolverIdGanadorValidado(
  tx: Tx,
  idEnfrentamiento: number,
): Promise<number | null> {
  const enf = await tx.enfrentamiento.findUnique({
    where: { idEnfrentamiento },
    select: { idEquipo1: true, idEquipo2: true },
  });
  if (!enf?.idEquipo1 || !enf.idEquipo2) return null;

  const resultado = await tx.resultado.findUnique({
    where: { idEnfrentamiento },
    select: {
      puntosEquipo1: true,
      puntosEquipo2: true,
      idEquipoGanador: true,
    },
  });
  if (!resultado) return null;

  return inferGanador(
    enf.idEquipo1,
    enf.idEquipo2,
    resultado.puntosEquipo1,
    resultado.puntosEquipo2,
    resultado.idEquipoGanador,
  );
}
