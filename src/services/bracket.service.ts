import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import { generarBracketSkeleton } from "./bracketGenerator.service";

export async function getBracketByTorneoId(idTorneo: number) {
  const prisma = getPrisma();
  const torneo = await prisma.torneo.findUnique({
    where: { idTorneo },
    select: {
      idTorneo: true,
      nombre: true,
      estado: true,
    },
  });
  if (!torneo) {
    throw new HttpError(404, "Torneo no encontrado");
  }

  let bracket = await prisma.bracket.findUnique({
    where: { idTorneo },
  });

  const numEnf = await prisma.enfrentamiento.count({ where: { idTorneo } });
  if (numEnf === 0) {
    const torneoFull = await prisma.torneo.findUnique({
      where: { idTorneo },
      select: { idFaseInicial: true },
    });
    if (torneoFull?.idFaseInicial) {
      await generarBracketSkeleton(idTorneo);
      bracket = await prisma.bracket.findUnique({ where: { idTorneo } });
    }
  }

  return {
    torneo,
    bracket: bracket
      ? {
          idBracket: bracket.idBracket,
          idTorneo: bracket.idTorneo,
          estructuraJson: bracket.estructuraJson,
          fechaGeneracion: bracket.fechaGeneracion,
          fechaActualizacion: bracket.fechaActualizacion,
        }
      : null,
  };
}
