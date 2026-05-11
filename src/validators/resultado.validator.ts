import { z } from "zod";

export const registrarResultadoBodySchema = z.object({
  puntosEquipo1: z.number().int().min(0),
  puntosEquipo2: z.number().int().min(0),
  idEquipoGanador: z.number().int().positive().nullable().optional(),
  comentarios: z.string().optional(),
  evidenciaUrl: z.string().max(255).optional(),
});

export type RegistrarResultadoBody = z.infer<typeof registrarResultadoBodySchema>;
