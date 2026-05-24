/**
 * Origen permitido para CORS y Socket.io.
 * - Quita espacios y barras finales (evita fallo si FRONTEND_URL termina en `/`).
 * - Varios dominios separados por coma (ej. Netlify production + branch deploy).
 */
export function getCorsOrigin(): boolean | string | string[] {
  const raw = process.env.FRONTEND_URL?.trim();
  if (!raw) return true;
  const parts = raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter((s) => s.length > 0);
  if (parts.length === 0) return true;
  if (parts.length === 1) return parts[0]!;
  return parts;
}
