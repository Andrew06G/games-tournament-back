import { Router } from "express";
import * as notificacionController from "../controllers/notificacion.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, notificacionController.listNotificaciones);
router.get(
  "/preferencias",
  authMiddleware,
  notificacionController.getPreferencias,
);
router.put(
  "/preferencias",
  authMiddleware,
  notificacionController.updatePreferencias,
);
router.put("/:id/leer", authMiddleware, notificacionController.marcarLeida);

export default router;
