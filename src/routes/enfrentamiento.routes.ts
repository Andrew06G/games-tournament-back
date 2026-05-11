import { Router } from "express";
import * as enfrentamientoController from "../controllers/enfrentamiento.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/:id/resultado",
  authMiddleware,
  enfrentamientoController.registrarResultado,
);

export default router;
