import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import {
  fasesDesdeInicial,
  type FaseCatalogo,
} from "../utils/fasesTorneo";

export type BracketSlotMeta = {
  key: string;
  idEnfrentamiento: number;
  lado: 1 | 2;
  faseCodigo: string;
  indicePartida: number;
};

export type BracketEstructura = {
  cupo: number;
  faseInicialCodigo: string;
  columnas: {
    idFase: number;
    codigo: string;
    nombre: string;
    partidas: {
      idEnfrentamiento: number;
      indice: number;
      posicionBracket: string;
    }[];
  }[];
  slots: BracketSlotMeta[];
};

/**
 * Crea enfrentamientos vacíos enlazados (ganador → siguiente) y JSON del bracket.
 * Si ya existe bracket con enfrentamientos, no duplica.
 */
export async function generarBracketSkeleton(idTorneo: number): Promise<BracketEstructura> {
  const prisma = getPrisma();

  const torneo = await prisma.torneo.findUnique({
    where: { idTorneo },
    select: {
      idTorneo: true,
      numMaxParticipantes: true,
      idFaseInicial: true,
      faseInicial: {
        select: { idFase: true, codigo: true, nombre: true, orden: true },
      },
    },
  });
  if (!torneo?.idFaseInicial) {
    throw new HttpError(400, "El torneo no tiene fase inicial configurada");
  }

  const existentes = await prisma.enfrentamiento.count({ where: { idTorneo } });
  if (existentes > 0) {
    const bracket = await prisma.bracket.findUnique({ where: { idTorneo } });
    if (bracket?.estructuraJson) {
      return bracket.estructuraJson as BracketEstructura;
    }
  }

  const todasFases = await prisma.faseTorneo.findMany({
    where: { estado: "activo" },
    orderBy: { orden: "asc" },
    select: {
      idFase: true,
      codigo: true,
      nombre: true,
      orden: true,
      numEquipos: true,
    },
  });

  const fases = fasesDesdeInicial(
    todasFases.map((f) => ({
      idFase: f.idFase,
      codigo: f.codigo,
      nombre: f.nombre,
      orden: f.orden,
      numEquipos: f.numEquipos,
    })),
    torneo.idFaseInicial,
  );

  if (fases.length === 0) {
    throw new HttpError(400, "No hay fases configuradas para este torneo");
  }

  const columnas: BracketEstructura["columnas"] = [];
  const slots: BracketSlotMeta[] = [];
  let prevIds: number[] = [];

  await prisma.$transaction(async (tx) => {
    for (const fase of fases) {
      const numPartidas = Math.max(1, fase.numEquipos / 2);
      const partidasCol: BracketEstructura["columnas"][0]["partidas"] = [];
      const currentIds: number[] = [];

      for (let i = 0; i < numPartidas; i++) {
        const posicionBracket = `${fase.codigo}-${i}`;
        const enf = await tx.enfrentamiento.create({
          data: {
            idTorneo,
            idFase: fase.idFase,
            fase: fase.nombre,
            numeroRonda: fase.orden,
            posicionBracket,
            estado: "pendiente",
          },
        });
        currentIds.push(enf.idEnfrentamiento);
        partidasCol.push({
          idEnfrentamiento: enf.idEnfrentamiento,
          indice: i,
          posicionBracket,
        });
        slots.push(
          {
            key: `${posicionBracket}-1`,
            idEnfrentamiento: enf.idEnfrentamiento,
            lado: 1,
            faseCodigo: fase.codigo,
            indicePartida: i,
          },
          {
            key: `${posicionBracket}-2`,
            idEnfrentamiento: enf.idEnfrentamiento,
            lado: 2,
            faseCodigo: fase.codigo,
            indicePartida: i,
          },
        );
      }

      if (prevIds.length > 0) {
        for (let j = 0; j < currentIds.length; j++) {
          const nextId = currentIds[j]!;
          const prevA = prevIds[j * 2];
          const prevB = prevIds[j * 2 + 1];
          if (prevA != null) {
            await tx.enfrentamiento.update({
              where: { idEnfrentamiento: prevA },
              data: { idEnfrentamientoSiguiente: nextId },
            });
          }
          if (prevB != null) {
            await tx.enfrentamiento.update({
              where: { idEnfrentamiento: prevB },
              data: { idEnfrentamientoSiguiente: nextId },
            });
          }
        }
      }

      columnas.push({
        idFase: fase.idFase,
        codigo: fase.codigo,
        nombre: fase.nombre,
        partidas: partidasCol,
      });
      prevIds = currentIds;
    }

    const estructura: BracketEstructura = {
      cupo: torneo.numMaxParticipantes,
      faseInicialCodigo: torneo.faseInicial?.codigo ?? fases[0]!.codigo,
      columnas,
      slots,
    };

    await tx.bracket.upsert({
      where: { idTorneo },
      create: { idTorneo, estructuraJson: estructura as object },
      update: { estructuraJson: estructura as object },
    });
  });

  const bracket = await prisma.bracket.findUnique({ where: { idTorneo } });
  return bracket!.estructuraJson as BracketEstructura;
}

/** Orden de llenado: fase inicial → final, partida 0..n, lado 1 luego 2. */
export async function findNextEmptyPairSlot(idTorneo: number) {
  const prisma = getPrisma();
  const enfs = await prisma.enfrentamiento.findMany({
    where: { idTorneo },
    orderBy: [
      { numeroRonda: "asc" },
      { posicionBracket: "asc" },
      { idEnfrentamiento: "asc" },
    ],
    select: {
      idEnfrentamiento: true,
      idEquipo1: true,
      idEquipo2: true,
      posicionBracket: true,
    },
  });

  for (const e of enfs) {
    if (e.idEquipo1 === null && e.idEquipo2 === null) {
      return e;
    }
  }
  return null;
}

/** Si quedan exactamente 2 equipos sin asignar y 1 cupo doble libre, los empareja. */
export async function intentarEmparejarUltimosDosEquipos(
  idTorneo: number,
): Promise<{ idEnfrentamiento: number } | null> {
  const prisma = getPrisma();
  const enfs = await prisma.enfrentamiento.findMany({
    where: { idTorneo },
    select: { idEquipo1: true, idEquipo2: true },
  });
  const asignados = new Set<number>();
  for (const e of enfs) {
    if (e.idEquipo1 != null) asignados.add(e.idEquipo1);
    if (e.idEquipo2 != null) asignados.add(e.idEquipo2);
  }
  const equipos = await prisma.equipo.findMany({
    where: { idTorneo, estadoEquipo: "activo" },
    select: { idEquipo: true },
  });
  const libres = equipos
    .map((e) => e.idEquipo)
    .filter((id) => !asignados.has(id));
  if (libres.length !== 2) return null;

  const slot = await findNextEmptyPairSlot(idTorneo);
  if (!slot) return null;

  const [a, b] = libres;
  if (a == null || b == null || a === b) return null;

  await prisma.enfrentamiento.update({
    where: { idEnfrentamiento: slot.idEnfrentamiento },
    data: { idEquipo1: a, idEquipo2: b },
  });
  return { idEnfrentamiento: slot.idEnfrentamiento };
}

export async function countEmptySlots(idTorneo: number): Promise<number> {
  const prisma = getPrisma();
  const enfs = await prisma.enfrentamiento.findMany({
    where: { idTorneo },
    select: { idEquipo1: true, idEquipo2: true },
  });
  let n = 0;
  for (const e of enfs) {
    if (e.idEquipo1 === null) n++;
    if (e.idEquipo2 === null) n++;
  }
  return n;
}
