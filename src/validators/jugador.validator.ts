import { z } from "zod";

export const updateJugadorBodySchema = z
  .object({
    nickname: z.string().min(1).max(50).optional(),
    contactoPreferido: z.string().max(100).nullable().optional(),
    esCapitan: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe enviar al menos un campo a actualizar",
  });

export type UpdateJugadorBody = z.infer<typeof updateJugadorBodySchema>;
