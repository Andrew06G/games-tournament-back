import { z } from "zod";

/** Creación de partida por el organizador (evita depender solo de Prisma Studio). */
export const crearEnfrentamientoBodySchema = z.object({
  fase: z.string().min(1).max(50),
  numeroRonda: z.number().int().optional(),
  idEquipo1: z.number().int().positive().optional(),
  idEquipo2: z.number().int().positive().optional(),
  /** ISO 8601 o fecha reconocible por `Date` en JS. */
  fechaProgramada: z.string().optional(),
  ubicacion: z.string().max(100).optional(),
  posicionBracket: z.string().max(20).optional(),
});

export type CrearEnfrentamientoBody = z.infer<typeof crearEnfrentamientoBodySchema>;
