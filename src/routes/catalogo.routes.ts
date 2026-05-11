import { Router } from "express";
import { getPrisma } from "../config/database";

const router = Router();

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
