import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";

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

  const bracket = await prisma.bracket.findUnique({
    where: { idTorneo },
  });

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
