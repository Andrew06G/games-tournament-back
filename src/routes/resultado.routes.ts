import { Router } from "express";
import * as resultadoController from "../controllers/resultado.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.put(
  "/:id/validar",
  authMiddleware,
  resultadoController.validarResultado,
);

export default router;
