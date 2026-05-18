import { z } from "zod";

/** Par de equipos → siguiente cupo libre del bracket (fase la define el esqueleto). */
export const crearEnfrentamientoBodySchema = z.object({
  idEquipo1: z.number().int().positive().optional(),
  idEquipo2: z.number().int().positive().optional(),
  fechaProgramada: z.string().optional(),
  ubicacion: z.string().max(100).optional(),
});

export type CrearEnfrentamientoBody = z.infer<typeof crearEnfrentamientoBodySchema>;

export const asignarEquipoSlotBodySchema = z.object({
  lado: z.union([z.literal(1), z.literal(2)]),
  idEquipo: z.number().int().positive(),
});

export type AsignarEquipoSlotBody = z.infer<typeof asignarEquipoSlotBodySchema>;
