/** Inicio del día en UTC (para comparar fechas de torneo sin hora). */
export function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function parseDateOnlyInput(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Fecha inválida");
  }
  return startOfUtcDay(d);
}
