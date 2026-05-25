import { describe, expect, it } from "vitest";
import { registrarResultadoBodySchema } from "../../src/validators/resultado.validator";

describe("registrarResultadoBodySchema", () => {
  const valid = {
    puntosEquipo1: 2,
    puntosEquipo2: 1,
  };

  it("accepts valid scores", () => {
    expect(registrarResultadoBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional winner and metadata", () => {
    expect(
      registrarResultadoBodySchema.safeParse({
        ...valid,
        idEquipoGanador: 10,
        comentarios: "GG",
        evidenciaUrl: "https://proof.example/match",
      }).success,
    ).toBe(true);
  });

  it("accepts null explicit winner", () => {
    expect(
      registrarResultadoBodySchema.safeParse({
        ...valid,
        idEquipoGanador: null,
      }).success,
    ).toBe(true);
  });

  it.each([
    ["negative points", { puntosEquipo1: -1, puntosEquipo2: 0 }],
    ["non-integer points", { puntosEquipo1: 1.5, puntosEquipo2: 0 }],
    ["invalid winner id", { ...valid, idEquipoGanador: 0 }],
  ])("rejects %s", (_label, body) => {
    expect(registrarResultadoBodySchema.safeParse(body).success).toBe(false);
  });
});
