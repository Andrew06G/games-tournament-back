import { z } from "zod";
import { CUPOS_BRACKET } from "../utils/fasesTorneo";

/**
 * Esquemas Zod para crear/actualizar torneos.
 * Ajustar campos según `prisma/schema.prisma` y reglas de negocio.
 */
export const createTorneoBodySchema = z.object({
  nombre: z.string().min(1).max(200),
  descripcion: z.string().optional(),
  idTipoVideojuego: z.number().int().positive(),
  idFormato: z.number().int().positive(),
  fechaInicio: z.string(),
  fechaFin: z.string().optional(),
  numMaxParticipantes: z
    .number()
    .int()
    .refine(
      (n) => (CUPOS_BRACKET as readonly number[]).includes(n),
      "El cupo debe ser 2, 4, 8, 16 o 32 equipos (eliminatoria)",
    ),
  premioDescripcion: z.string().optional(),
  reglas: z.string().optional(),
});

export type CreateTorneoBody = z.infer<typeof createTorneoBodySchema>;

export const updateTorneoBodySchema = z
  .object({
    nombre: z.string().min(1).max(200).optional(),
    descripcion: z.string().nullable().optional(),
    idTipoVideojuego: z.number().int().positive().optional(),
    idFormato: z.number().int().positive().optional(),
    fechaInicio: z.string().optional(),
    fechaFin: z.string().nullable().optional(),
    numMaxParticipantes: z.number().int().positive().optional(),
    premioDescripcion: z.string().nullable().optional(),
    reglas: z.string().nullable().optional(),
    estado: z.string().max(30).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe enviar al menos un campo a actualizar",
  });

export type UpdateTorneoBody = z.infer<typeof updateTorneoBodySchema>;

export const inscribirEquipoBodySchema = z.object({
  nombreEquipo: z.string().min(1).max(100),
  logoUrl: z.string().max(255).optional(),
  /** Único por torneo; si se omite se deriva del nombre del equipo. */
  nickname: z.string().min(1).max(50).optional(),
  /** Email u otro contacto del capitán (se guarda en `contactoPreferido`). */
  contactoPreferido: z.string().max(100).optional(),
});

export type InscribirEquipoBody = z.infer<typeof inscribirEquipoBodySchema>;
