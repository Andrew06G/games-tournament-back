/** Cupos válidos en eliminación directa (potencias de 2). */
export const CUPOS_BRACKET = [2, 4, 8, 16, 32] as const;

export type CupoBracket = (typeof CUPOS_BRACKET)[number];

export function esCupoBracketValido(n: number): n is CupoBracket {
  return (CUPOS_BRACKET as readonly number[]).includes(n);
}

/** Código de fase inicial según cupo del torneo. */
export function codigoFaseInicialPorCupo(cupo: number): string {
  switch (cupo) {
    case 32:
      return "dieciseisavos";
    case 16:
      return "octavos";
    case 8:
      return "cuartos";
    case 4:
      return "semifinal";
    case 2:
      return "final";
    default:
      throw new Error(`Cupo de bracket no válido: ${cupo}`);
  }
}

export type FaseCatalogo = {
  idFase: number;
  codigo: string;
  nombre: string;
  orden: number;
  numEquipos: number;
};

/** Fases desde la inicial hasta la final (orden ascendente del catálogo). */
export function fasesDesdeInicial(
  todas: FaseCatalogo[],
  idFaseInicial: number,
): FaseCatalogo[] {
  const ini = todas.find((f) => f.idFase === idFaseInicial);
  if (!ini) return [];
  return todas
    .filter((f) => f.orden >= ini.orden)
    .sort((a, b) => a.orden - b.orden);
}
