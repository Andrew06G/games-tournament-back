import { Router } from "express";
import * as jugadorController from "../controllers/jugador.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.put("/:id", authMiddleware, jugadorController.updateJugador);

export default router;
