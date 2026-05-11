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
