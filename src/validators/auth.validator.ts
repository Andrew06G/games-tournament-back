import { z } from "zod";

export const registerBodySchema = z.object({
  nombre: z.string().min(1).max(100),
  email: z.string().email().max(150),
  contrasena: z.string().min(8).max(72),
  telefono: z.string().max(20).optional(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.string().email(),
  contrasena: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshBody = z.infer<typeof refreshBodySchema>;
