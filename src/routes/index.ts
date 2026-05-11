import { Router } from "express";
import catalogoRoutes from "./catalogo.routes";
import authRoutes from "./auth.routes";
import enfrentamientoRoutes from "./enfrentamiento.routes";
import equipoRoutes from "./equipo.routes";
import jugadorRoutes from "./jugador.routes";
import notificacionRoutes from "./notificacion.routes";
import resultadoRoutes from "./resultado.routes";
import torneoRoutes from "./torneo.routes";
import usuarioRoutes from "./usuario.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

router.use("/catalogos", catalogoRoutes);
router.use("/auth", authRoutes);
router.use("/torneos", torneoRoutes);
router.use("/equipos", equipoRoutes);
router.use("/jugadores", jugadorRoutes);
router.use("/enfrentamientos", enfrentamientoRoutes);
router.use("/resultados", resultadoRoutes);
router.use("/notificaciones", notificacionRoutes);
router.use("/usuarios", usuarioRoutes);

export default router;
