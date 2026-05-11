import { getPrisma } from "../config/database";
import { getSocketIO } from "../config/socket";
import { HttpError } from "../utils/httpError";
import { userCanManageTorneo } from "../utils/torneoAcl";

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
    return r;
  });

  const io = getSocketIO();
  if (io) {
    io.emit("resultado:validado", {
      enfrentamientoId: enf.idEnfrentamiento,
      resultadoId: idResultado,
      torneoId: enf.idTorneo,
    });
    io.emit("bracket:updated", { torneoId: enf.idTorneo });
  }

  return actualizado;
}
