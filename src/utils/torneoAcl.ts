import { getPrisma } from "../config/database";

/** Organizador global, fila USUARIO_ROL(organizador, id_torneo), o id_organizador del torneo. */
export async function userCanManageTorneo(
  userId: number,
  torneoId: number,
): Promise<boolean> {
  const prisma = getPrisma();

  const [globalOrg, rolTorneo, torneo] = await Promise.all([
    prisma.usuarioRol.findFirst({
      where: {
        idUsuario: userId,
        idTorneo: null,
        rol: { nombreRol: "organizador" },
      },
    }),
    prisma.usuarioRol.findFirst({
      where: {
        idUsuario: userId,
        idTorneo: torneoId,
        rol: { nombreRol: "organizador" },
      },
    }),
    prisma.torneo.findUnique({
      where: { idTorneo: torneoId },
      select: { idOrganizador: true },
    }),
  ]);

  if (globalOrg) return true;
  if (rolTorneo) return true;
  if (torneo?.idOrganizador === userId) return true;
  return false;
}

/** Rol global lider_equipo con al menos un equipo activo en el torneo. */
export async function userIsLiderEquipoEnTorneo(
  userId: number,
  torneoId: number,
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
        idTorneo: torneoId,
        idUsuario: userId,
        estadoJugador: "activo",
      },
    }),
  ]);
  return rolLider !== null && miembro !== null;
}

/**
 * Organizador del torneo o líder de equipo inscrito: puede registrar/editar
 * resultados de cualquier enfrentamiento del torneo (modo académico).
 */
export async function userCanRegistrarResultadosTorneo(
  userId: number,
  torneoId: number,
): Promise<boolean> {
  if (await userCanManageTorneo(userId, torneoId)) return true;
  return userIsLiderEquipoEnTorneo(userId, torneoId);
}
