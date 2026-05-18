import "dotenv/config";
import bcrypt from "bcrypt";
import { getPool, getPrisma } from "../src/config/database";

const DEMO_PASSWORD = "Password123!";

async function main(): Promise<void> {
  const prisma = getPrisma();

  const roles = [
    {
      nombreRol: "organizador",
      descripcion: "Organizador: crea torneos, valida resultados y gestiona participantes",
      permisos: {
        crear_torneo: true,
        modificar_torneo: true,
        validar_resultados: true,
        gestionar_participantes: true,
      },
    },
    {
      nombreRol: "jugador",
      descripcion: "Participante: puede inscribirse en equipos y registrar resultados",
      permisos: {
        inscribirse: true,
        registrar_resultado: true,
        ver_bracket: true,
      },
    },
    {
      nombreRol: "lider_equipo",
      descripcion: "Líder de equipo: coordina la inscripción y la plantilla de su equipo",
      permisos: {
        inscribirse: true,
        registrar_resultado: true,
        ver_bracket: true,
        liderar_equipo: true,
      },
    },
    {
      nombreRol: "espectador",
      descripcion: "Solo puede visualizar información pública",
      permisos: { ver_bracket: true, ver_resultados: true },
    },
  ] as const;

  for (const r of roles) {
    await prisma.rol.upsert({
      where: { nombreRol: r.nombreRol },
      create: {
        nombreRol: r.nombreRol,
        descripcion: r.descripcion,
        permisos: r.permisos,
      },
      update: { descripcion: r.descripcion, permisos: r.permisos },
    });
  }

  const tipos = [
    {
      nombre: "MOBA",
      descripcion: "Multiplayer Online Battle Arena",
      numJugadoresMinimo: 3,
      numJugadoresMaximo: 10,
    },
    {
      nombre: "Shooter",
      descripcion: "First Person Shooter o Third Person Shooter",
      numJugadoresMinimo: 10,
      numJugadoresMaximo: 25,
    },
    {
      nombre: "Fighting",
      descripcion: "Juegos de pelea 1v1",
      numJugadoresMinimo: 2,
      numJugadoresMaximo: 4,
    },
    {
      nombre: "Otros",
      descripcion: "Otros tipos de videojuegos",
      numJugadoresMinimo: 1,
      numJugadoresMaximo: 4,
    },
    {
      nombre: "Battle Royale",
      descripcion: "Supervivencia en mapa cerrado (Fortnite, PUBG, Apex)",
      numJugadoresMinimo: 20,
      numJugadoresMaximo: 100,
    },
    {
      nombre: "Deportes",
      descripcion: "Simulación deportiva competitiva (FIFA, NBA 2K)",
      numJugadoresMinimo: 2,
      numJugadoresMaximo: 22,
    },
    {
      nombre: "Carreras",
      descripcion: "Racing arcade o simulación (Gran Turismo, Mario Kart)",
      numJugadoresMinimo: 2,
      numJugadoresMaximo: 16,
    },
    {
      nombre: "Juego de cartas",
      descripcion: "TCG / deck builders (Hearthstone, MTG Arena)",
      numJugadoresMinimo: 2,
      numJugadoresMaximo: 8,
    },
    {
      nombre: "RTS",
      descripcion: "Estrategia en tiempo real (StarCraft, Age of Empires)",
      numJugadoresMinimo: 2,
      numJugadoresMaximo: 8,
    },
    {
      nombre: "Extracción",
      descripcion: "Loot y extracción (Escape from Tarkov, Hunt: Showdown)",
      numJugadoresMinimo: 2,
      numJugadoresMaximo: 12,
    },
    {
      nombre: "MMORPG",
      descripcion: "Mundo persistente masivo (WoW PvP, FFXIV)",
      numJugadoresMinimo: 5,
      numJugadoresMaximo: 40,
    },
    {
      nombre: "Plataformas / Party",
      descripcion: "Party games y plataformas (Fall Guys, Smash estilo party)",
      numJugadoresMinimo: 2,
      numJugadoresMaximo: 16,
    },
    {
      nombre: "Ritmo",
      descripcion: "Competición por puntuación musical (osu!, Beat Saber)",
      numJugadoresMinimo: 1,
      numJugadoresMaximo: 8,
    },
    {
      nombre: "Sandbox / Creativo",
      descripcion: "Construcción y supervivencia (Minecraft PvP)",
      numJugadoresMinimo: 2,
      numJugadoresMaximo: 32,
    },
  ] as const;

  for (const t of tipos) {
    await prisma.tipoVideojuego.upsert({
      where: { nombre: t.nombre },
      create: {
        nombre: t.nombre,
        descripcion: t.descripcion,
        numJugadoresMinimo: t.numJugadoresMinimo,
        numJugadoresMaximo: t.numJugadoresMaximo,
      },
      update: {
        descripcion: t.descripcion,
        numJugadoresMinimo: t.numJugadoresMinimo,
        numJugadoresMaximo: t.numJugadoresMaximo,
      },
    });
  }

  const formatos = [
    {
      nombre: "Eliminación Directa",
      descripcion: "Torneo de eliminación simple - pierdes y quedas fuera",
      requiereFaseGrupos: false,
    },
    {
      nombre: "Doble Eliminación",
      descripcion: "Torneo con bracket de ganadores y perdedores",
      requiereFaseGrupos: false,
    },
    {
      nombre: "Fase de Grupos + Eliminación",
      descripcion: "Primero se juegan grupos, luego eliminación directa",
      requiereFaseGrupos: true,
    },
    {
      nombre: "Round Robin",
      descripcion: "Todos contra todos",
      requiereFaseGrupos: false,
    },
  ] as const;

  for (const f of formatos) {
    await prisma.formatoTorneo.upsert({
      where: { nombre: f.nombre },
      create: {
        nombre: f.nombre,
        descripcion: f.descripcion,
        requiereFaseGrupos: f.requiereFaseGrupos,
      },
      update: {
        descripcion: f.descripcion,
        requiereFaseGrupos: f.requiereFaseGrupos,
      },
    });
  }

  const configs = [
    {
      clave: "tiempo_max_respuesta_backend",
      valor: "800",
      tipoDato: "int",
      descripcion: "Tiempo máximo de respuesta del backend en ms",
    },
    {
      clave: "tiempo_max_respuesta_db",
      valor: "200",
      tipoDato: "int",
      descripcion: "Tiempo máximo de respuesta de la BD en ms",
    },
    {
      clave: "usuarios_max_simultaneos",
      valor: "50",
      tipoDato: "int",
      descripcion: "Número máximo de usuarios simultáneos esperados",
    },
  ] as const;

  for (const c of configs) {
    await prisma.configuracionSistema.upsert({
      where: { clave: c.clave },
      create: {
        clave: c.clave,
        valor: c.valor,
        tipoDato: c.tipoDato,
        descripcion: c.descripcion,
      },
      update: {
        valor: c.valor,
        tipoDato: c.tipoDato,
        descripcion: c.descripcion,
      },
    });
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const rolOrganizador = await prisma.rol.findUniqueOrThrow({
    where: { nombreRol: "organizador" },
  });
  const rolJugador = await prisma.rol.findUniqueOrThrow({
    where: { nombreRol: "jugador" },
  });

  const userOrg = await prisma.usuario.upsert({
    where: { email: "organizador.demo@local.test" },
    create: {
      nombre: "Organizador de prueba",
      email: "organizador.demo@local.test",
      contrasena: hash,
    },
    update: {
      nombre: "Organizador de prueba",
      contrasena: hash,
    },
  });

  const userJug = await prisma.usuario.upsert({
    where: { email: "jugador.demo@local.test" },
    create: {
      nombre: "Jugador de prueba",
      email: "jugador.demo@local.test",
      contrasena: hash,
    },
    update: {
      nombre: "Jugador de prueba",
      contrasena: hash,
    },
  });

  const existingOrgRol = await prisma.usuarioRol.findFirst({
    where: {
      idUsuario: userOrg.idUsuario,
      idRol: rolOrganizador.idRol,
      idTorneo: null,
    },
  });
  if (!existingOrgRol) {
    await prisma.usuarioRol.create({
      data: {
        idUsuario: userOrg.idUsuario,
        idRol: rolOrganizador.idRol,
        idTorneo: null,
      },
    });
  }

  const existingJugRol = await prisma.usuarioRol.findFirst({
    where: {
      idUsuario: userJug.idUsuario,
      idRol: rolJugador.idRol,
      idTorneo: null,
    },
  });
  if (!existingJugRol) {
    await prisma.usuarioRol.create({
      data: {
        idUsuario: userJug.idUsuario,
        idRol: rolJugador.idRol,
        idTorneo: null,
      },
    });
  }

  console.log("Seed completado.");
  console.log(
    `Usuarios demo (contraseña: ${DEMO_PASSWORD}): ${userOrg.email}, ${userJug.email}`,
  );
}

void main()
  .then(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
    await getPool().end();
  })
  .catch(async (e) => {
    console.error(e);
    const prisma = getPrisma();
    await prisma.$disconnect();
    await getPool().end();
    process.exit(1);
  });
