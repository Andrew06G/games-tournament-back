import { Router } from "express";
import { getPrisma } from "../config/database";

const router = Router();

/** Roles que un usuario nuevo puede elegir al registrarse (orden de la lista). */
const ROLES_REGISTRO = ["organizador", "jugador", "lider_equipo"] as const;

router.get("/tipos-videojuego", async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    const tipos = await prisma.tipoVideojuego.findMany({
      orderBy: { idTipo: "asc" },
      select: {
        idTipo: true,
        nombre: true,
        descripcion: true,
        numJugadoresMinimo: true,
        numJugadoresMaximo: true,
      },
    });
    res.json({ tipos });
  } catch (e) {
    next(e);
  }
});

router.get("/roles-registro", async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    const todos = await prisma.rol.findMany({
      where: { nombreRol: { in: [...ROLES_REGISTRO] } },
      select: {
        idRol: true,
        nombreRol: true,
        descripcion: true,
      },
    });
    const ordenIdx: Record<string, number> = Object.fromEntries(
      ROLES_REGISTRO.map((n, i) => [n, i]),
    );
    const roles = [...todos].sort(
      (a, b) =>
        (ordenIdx[a.nombreRol] ?? 99) - (ordenIdx[b.nombreRol] ?? 99),
    );
    res.json({ roles });
  } catch (e) {
    next(e);
  }
});

router.get("/fases-torneo", async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    const fases = await prisma.faseTorneo.findMany({
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
    res.json({ fases });
  } catch (e) {
    next(e);
  }
});

/** Fase inicial automática según cupo (2, 4, 8, 16, 32). */
router.get("/fase-inicial-por-cupo/:cupo", async (req, res, next) => {
  try {
    const cupo = Number(req.params.cupo);
    const prisma = getPrisma();
    const { codigoFaseInicialPorCupo, esCupoBracketValido } = await import(
      "../utils/fasesTorneo"
    );
    if (!esCupoBracketValido(cupo)) {
      res.status(400).json({
        error: "Cupo inválido. Use 2, 4, 8, 16 o 32 equipos.",
      });
      return;
    }
    const codigo = codigoFaseInicialPorCupo(cupo);
    const fase = await prisma.faseTorneo.findUnique({ where: { codigo } });
    if (!fase) {
      res.status(404).json({ error: "Fase no encontrada en catálogo" });
      return;
    }
    res.json({ cupo, fase });
  } catch (e) {
    next(e);
  }
});

router.get("/formatos-torneo", async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    const formatos = await prisma.formatoTorneo.findMany({
      orderBy: { idFormato: "asc" },
      select: {
        idFormato: true,
        nombre: true,
        descripcion: true,
        requiereFaseGrupos: true,
      },
    });
    res.json({ formatos });
  } catch (e) {
    next(e);
  }
});

export default router;
