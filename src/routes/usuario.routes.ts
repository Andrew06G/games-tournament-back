import { Router } from "express";
import * as usuarioController from "../controllers/usuario.controller";

const router = Router();

router.put(
  "/preferencias-notificacion",
  usuarioController.updatePreferenciasNotificacion,
);

export default router;
