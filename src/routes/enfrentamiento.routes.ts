import { Router } from "express";
import * as enfrentamientoController from "../controllers/enfrentamiento.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/:id/resultado",
  authMiddleware,
  enfrentamientoController.registrarResultado,
);

router.patch(
  "/:id/slot",
  authMiddleware,
  enfrentamientoController.asignarEquipoSlot,
);

router.delete(
  "/:id/asignacion",
  authMiddleware,
  enfrentamientoController.limpiarAsignacion,
);

export default router;
