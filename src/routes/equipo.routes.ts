import { Router } from "express";
import * as equipoController from "../controllers/equipo.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/:id/jugadores",
  authMiddleware,
  equipoController.addJugador,
);
router.delete(
  "/:equipoId/jugadores/:jugadorId",
  authMiddleware,
  equipoController.removeJugador,
);

export default router;
