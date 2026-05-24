import type { CorsOptions } from "cors";

/** Compara orígenes ignorando barra final y mayúsculas en el host. */
function normalizeOrigin(o: string): string {
  return o.trim().replace(/\/+$/, "").toLowerCase();
}

function parseAllowedOrigins(): Set<string> {
  const raw = process.env.FRONTEND_URL?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => normalizeOrigin(s))
      .filter((s) => s.length > 0),
  );
}

/** Log útil en Render para verificar que FRONTEND_URL coincide con Netlify/Vercel. */
export function logCorsConfig(): void {
  const raw = process.env.FRONTEND_URL?.trim();
  if (!raw) {
    console.warn(
      "[CORS] FRONTEND_URL no definida: se acepta cualquier origen (no recomendado en producción).",
    );
    return;
  }
  console.info(
    "[CORS] Orígenes permitidos (normalizados, sin / final):",
    [...parseAllowedOrigins()].join(" | "),
  );
}

/**
 * Origen para `cors` y Socket.io.
 * - Sin FRONTEND_URL: permite cualquier origen (solo para desarrollo / diagnóstico).
 * - Con FRONTEND_URL: función que compara el header `Origin` con la lista (coma = varios dominios).
 */
export function getCorsOrigin(): CorsOptions["origin"] {
  const allowed = parseAllowedOrigins();
  if (allowed.size === 0) return true;

  return (
    requestOrigin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!requestOrigin) {
      callback(null, true);
      return;
    }
    callback(null, allowed.has(normalizeOrigin(requestOrigin)));
  };
}
