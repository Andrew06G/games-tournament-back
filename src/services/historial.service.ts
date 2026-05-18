import { getPrisma } from "../config/database";

export async function registrarCambio(params: {
  tablaAfectada: string;
  idRegistro: number;
  campoModificado: string;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
  tipoOperacion: "insert" | "update" | "delete";
  idUsuarioModifica?: number | null;
  razonCambio?: string | null;
}): Promise<void> {
  const prisma = getPrisma();
  await prisma.historialCambios.create({
    data: {
      tablaAfectada: params.tablaAfectada,
      idRegistro: params.idRegistro,
      campoModificado: params.campoModificado,
      valorAnterior: params.valorAnterior ?? null,
      valorNuevo: params.valorNuevo ?? null,
      tipoOperacion: params.tipoOperacion,
      idUsuarioModifica: params.idUsuarioModifica ?? null,
      razonCambio: params.razonCambio ?? null,
    },
  });
}

export async function listHistorialTorneo(idTorneo: number, idEquipo?: number) {
  const prisma = getPrisma();
  const equipos = await prisma.equipo.findMany({
    where: { idTorneo },
    select: { idEquipo: true },
  });
  const idsEquipo =
    idEquipo != null ? [idEquipo] : equipos.map((e) => e.idEquipo);
  if (idsEquipo.length === 0) return [];

  return prisma.historialCambios.findMany({
    where: {
      tablaAfectada: { in: ["EQUIPO", "JUGADOR"] },
      idRegistro: { in: idsEquipo },
    },
    orderBy: { fechaModificacion: "desc" },
    take: 200,
    include: {
      usuarioModifica: { select: { idUsuario: true, nombre: true } },
    },
  });
}
