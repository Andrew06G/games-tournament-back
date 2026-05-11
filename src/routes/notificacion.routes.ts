import { Router } from "express";
import * as notificacionController from "../controllers/notificacion.controller";

const router = Router();

router.get("/", notificacionController.listNotificaciones);
router.put("/:id/leer", notificacionController.marcarLeida);

export default router;
