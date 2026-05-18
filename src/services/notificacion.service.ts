import { getPrisma } from "../config/database";
import { z } from "zod";

export const preferenciasBodySchema = z.object({
  notifNuevoEnfrentamiento: z.boolean().optional(),
  notifResultadoValidado: z.boolean().optional(),
  notifCambioFase: z.boolean().optional(),
  notifRecordatorio: z.boolean().optional(),
  canalPreferido: z.enum(["app", "email", "ambos"]).optional(),
});

export type PreferenciasBody = z.infer<typeof preferenciasBodySchema>;

async function enviarEmailNotificacion(
  email: string,
  titulo: string,
  mensaje: string,
): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.info(
      `[ArenaManager email simulado] Para: ${email} | ${titulo} — ${mensaje}`,
    );
    return;
  }
  console.info(
    `[ArenaManager email] SMTP configurado; envío pendiente de integración completa a ${email}`,
  );
}

export type TipoNotificacion =
  | "enfrentamiento_asignado"
  | "resultado_publicado"
  | "torneo_inicio"
  | "torneo_fin";

export async function crearNotificacion(params: {
  idUsuarioDestino: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  idTorneo?: number;
  idEnfrentamiento?: number;
}): Promise<void> {
  const prisma = getPrisma();
  const pref = await prisma.preferenciaNotificacion.findUnique({
    where: { idUsuario: params.idUsuarioDestino },
  });
  if (pref) {
    if (
      params.tipo === "enfrentamiento_asignado" &&
      pref.notifNuevoEnfrentamiento === false
    ) {
      return;
    }
    if (
      params.tipo === "resultado_publicado" &&
      pref.notifResultadoValidado === false
    ) {
      return;
    }
    if (
      (params.tipo === "torneo_inicio" || params.tipo === "torneo_fin") &&
      pref.notifCambioFase === false
    ) {
      return;
    }
  }

  const canal =
    pref?.canalPreferido === "email"
      ? "email"
      : pref?.canalPreferido === "ambos"
        ? "app"
        : "app";

  await prisma.notificacion.create({
    data: {
      idUsuarioDestino: params.idUsuarioDestino,
      tipoNotificacion: params.tipo,
      titulo: params.titulo,
      mensaje: params.mensaje,
      idTorneo: params.idTorneo ?? null,
      idEnfrentamiento: params.idEnfrentamiento ?? null,
      leida: false,
      canal,
    },
  });

  const quiereEmail =
    pref?.canalPreferido === "email" || pref?.canalPreferido === "ambos";
  if (quiereEmail) {
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: params.idUsuarioDestino },
      select: { email: true },
    });
    if (usuario?.email) {
      void enviarEmailNotificacion(
        usuario.email,
        params.titulo,
        params.mensaje,
      );
    }
  }
}

export async function getPreferenciasUsuario(idUsuario: number) {
  const prisma = getPrisma();
  let pref = await prisma.preferenciaNotificacion.findUnique({
    where: { idUsuario },
  });
  if (!pref) {
    pref = await prisma.preferenciaNotificacion.create({
      data: { idUsuario },
    });
  }
  return pref;
}

export async function updatePreferenciasUsuario(
  idUsuario: number,
  body: PreferenciasBody,
) {
  const prisma = getPrisma();
  return prisma.preferenciaNotificacion.upsert({
    where: { idUsuario },
    create: {
      idUsuario,
      notifNuevoEnfrentamiento: body.notifNuevoEnfrentamiento ?? true,
      notifResultadoValidado: body.notifResultadoValidado ?? true,
      notifCambioFase: body.notifCambioFase ?? true,
      notifRecordatorio: body.notifRecordatorio ?? true,
      canalPreferido: body.canalPreferido ?? "app",
    },
    update: {
      ...(body.notifNuevoEnfrentamiento !== undefined
        ? { notifNuevoEnfrentamiento: body.notifNuevoEnfrentamiento }
        : {}),
      ...(body.notifResultadoValidado !== undefined
        ? { notifResultadoValidado: body.notifResultadoValidado }
        : {}),
      ...(body.notifCambioFase !== undefined
        ? { notifCambioFase: body.notifCambioFase }
        : {}),
      ...(body.notifRecordatorio !== undefined
        ? { notifRecordatorio: body.notifRecordatorio }
        : {}),
      ...(body.canalPreferido !== undefined
        ? { canalPreferido: body.canalPreferido }
        : {}),
    },
  });
}

export async function notificarJugadoresEquipo(
  idEquipo: number,
  payload: Omit<Parameters<typeof crearNotificacion>[0], "idUsuarioDestino">,
): Promise<void> {
  const prisma = getPrisma();
  const jugadores = await prisma.jugador.findMany({
    where: {
      idEquipo,
      estadoJugador: "activo",
      idUsuario: { not: null },
    },
    select: { idUsuario: true },
  });
  const ids = [
    ...new Set(
      jugadores
        .map((j) => j.idUsuario)
        .filter((id): id is number => id != null),
    ),
  ];
  await Promise.all(
    ids.map((idUsuarioDestino) =>
      crearNotificacion({ ...payload, idUsuarioDestino }),
    ),
  );
}

export async function notificarParticipantesTorneo(
  idTorneo: number,
  payload: Omit<Parameters<typeof crearNotificacion>[0], "idUsuarioDestino">,
): Promise<void> {
  const prisma = getPrisma();
  const jugadores = await prisma.jugador.findMany({
    where: {
      idTorneo,
      estadoJugador: "activo",
      idUsuario: { not: null },
    },
    select: { idUsuario: true },
  });
  const ids = [
    ...new Set(
      jugadores
        .map((j) => j.idUsuario)
        .filter((id): id is number => id != null),
    ),
  ];
  await Promise.all(
    ids.map((idUsuarioDestino) =>
      crearNotificacion({ ...payload, idUsuarioDestino }),
    ),
  );
}

export async function listNotificacionesUsuario(idUsuario: number) {
  const prisma = getPrisma();
  return prisma.notificacion.findMany({
    where: { idUsuarioDestino: idUsuario },
    orderBy: { fechaEnvio: "desc" },
    take: 100,
    select: {
      idNotificacion: true,
      tipoNotificacion: true,
      titulo: true,
      mensaje: true,
      idTorneo: true,
      idEnfrentamiento: true,
      fechaEnvio: true,
      leida: true,
    },
  });
}

export async function marcarNotificacionLeida(
  idNotificacion: number,
  idUsuario: number,
): Promise<boolean> {
  const prisma = getPrisma();
  const n = await prisma.notificacion.findFirst({
    where: { idNotificacion, idUsuarioDestino: idUsuario },
  });
  if (!n) return false;
  await prisma.notificacion.update({
    where: { idNotificacion },
    data: { leida: true, fechaLectura: new Date() },
  });
  return true;
}
