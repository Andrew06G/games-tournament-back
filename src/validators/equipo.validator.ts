import { z } from "zod";

export const addJugadorBodySchema = z
  .object({
    idUsuario: z.number().int().positive().optional(),
    nickname: z.string().min(1).max(50),
    esCapitan: z.boolean().optional(),
    contactoPreferido: z.string().max(100).optional(),
    /** Si es true: participante invitado (sin cuenta), solo nickname; no enviar idUsuario. */
    esInvitado: z.boolean().optional(),
  })
  .refine((d) => !d.esInvitado || d.idUsuario === undefined, {
    message: "No envíe idUsuario cuando esInvitado es true",
    path: ["idUsuario"],
  });

export type AddJugadorBody = z.infer<typeof addJugadorBodySchema>;

export const updateEquipoBodySchema = z
  .object({
    nombreEquipo: z.string().min(1).max(100).optional(),
    logoUrl: z.string().max(255).nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe enviar al menos un campo a actualizar",
  });

export type UpdateEquipoBody = z.infer<typeof updateEquipoBodySchema>;
