import { z } from "zod";

export const addJugadorBodySchema = z.object({
  idUsuario: z.number().int().positive().optional(),
  nickname: z.string().min(1).max(50),
  esCapitan: z.boolean().optional(),
  contactoPreferido: z.string().max(100).optional(),
});

export type AddJugadorBody = z.infer<typeof addJugadorBodySchema>;
