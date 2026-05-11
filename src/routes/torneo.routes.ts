import { Router } from "express";
import * as torneoController from "../controllers/torneo.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  requireGlobalRoles,
  requireTorneoOrganizerAccess,
} from "../middlewares/role.middleware";

const router = Router();

router.get("/", torneoController.listTorneos);
router.post(
  "/",
  authMiddleware,
  requireGlobalRoles("organizador"),
  torneoController.createTorneo,
);
router.get("/:id/bracket", torneoController.getBracket);
router.post(
  "/:id/equipos",
  authMiddleware,
  torneoController.inscribirEquipo,
);
router.post(
  "/:id/enfrentamientos",
  authMiddleware,
  requireTorneoOrganizerAccess("id"),
  torneoController.crearEnfrentamiento,
);
router.get("/:id", torneoController.getTorneoById);
router.put(
  "/:id",
  authMiddleware,
  requireTorneoOrganizerAccess("id"),
  torneoController.updateTorneo,
);
router.delete(
  "/:id",
  authMiddleware,
  requireTorneoOrganizerAccess("id"),
  torneoController.deleteTorneo,
);

export default router;
