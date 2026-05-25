import { describe, expect, it } from "vitest";
import {
  CUPOS_BRACKET,
  codigoFaseInicialPorCupo,
  esCupoBracketValido,
  fasesDesdeInicial,
  type FaseCatalogo,
} from "../../src/utils/fasesTorneo";

describe("CUPOS_BRACKET", () => {
  it("contains exactly powers of 2 from 2 to 32", () => {
    expect(CUPOS_BRACKET).toEqual([2, 4, 8, 16, 32]);
  });
});

describe("esCupoBracketValido", () => {
  it.each([2, 4, 8, 16, 32])("returns true for valid cupo %i", (n) => {
    expect(esCupoBracketValido(n)).toBe(true);
  });

  it.each([0, 1, 3, 5, 64, 100])("returns false for invalid cupo %i", (n) => {
    expect(esCupoBracketValido(n)).toBe(false);
  });
});

describe("codigoFaseInicialPorCupo", () => {
  it.each([
    [32, "dieciseisavos"],
    [16, "octavos"],
    [8, "cuartos"],
    [4, "semifinal"],
    [2, "final"],
  ] as const)("maps cupo %i to phase code %s", (cupo, codigo) => {
    expect(codigoFaseInicialPorCupo(cupo)).toBe(codigo);
  });

  it("throws for invalid cupo", () => {
    expect(() => codigoFaseInicialPorCupo(6)).toThrow(
      "Cupo de bracket no válido: 6",
    );
  });
});

describe("fasesDesdeInicial", () => {
  const catalog: FaseCatalogo[] = [
    { idFase: 1, codigo: "dieciseisavos", nombre: "Dieciseisavos", orden: 1, numEquipos: 32 },
    { idFase: 2, codigo: "octavos", nombre: "Octavos", orden: 2, numEquipos: 16 },
    { idFase: 3, codigo: "cuartos", nombre: "Cuartos", orden: 3, numEquipos: 8 },
    { idFase: 4, codigo: "semifinal", nombre: "Semifinal", orden: 4, numEquipos: 4 },
    { idFase: 5, codigo: "final", nombre: "Final", orden: 5, numEquipos: 2 },
  ];

  it("returns empty array when initial phase id is not found", () => {
    expect(fasesDesdeInicial(catalog, 999)).toEqual([]);
  });

  it("returns phases from initial through final sorted by orden", () => {
    const result = fasesDesdeInicial(catalog, 3);
    expect(result.map((f) => f.codigo)).toEqual([
      "cuartos",
      "semifinal",
      "final",
    ]);
  });

  it("includes only the final when starting at final phase", () => {
    const result = fasesDesdeInicial(catalog, 5);
    expect(result).toHaveLength(1);
    expect(result[0]?.codigo).toBe("final");
  });
});
