import { describe, expect, it } from "vitest";
import {
  asignarEquipoSlotBodySchema,
  crearEnfrentamientoBodySchema,
} from "../../src/validators/enfrentamiento.validator";

describe("crearEnfrentamientoBodySchema", () => {
  it("accepts empty body", () => {
    expect(crearEnfrentamientoBodySchema.safeParse({}).success).toBe(true);
  });

  it("accepts optional teams and schedule fields", () => {
    expect(
      crearEnfrentamientoBodySchema.safeParse({
        idEquipo1: 1,
        idEquipo2: 2,
        fechaProgramada: "2026-07-01T18:00:00Z",
        ubicacion: "Arena A",
      }).success,
    ).toBe(true);
  });

  it("rejects non-positive team ids", () => {
    expect(
      crearEnfrentamientoBodySchema.safeParse({ idEquipo1: 0 }).success,
    ).toBe(false);
  });
});

describe("asignarEquipoSlotBodySchema", () => {
  it.each([1, 2] as const)("accepts lado %i", (lado) => {
    expect(
      asignarEquipoSlotBodySchema.safeParse({ lado, idEquipo: 5 }).success,
    ).toBe(true);
  });

  it("rejects invalid lado", () => {
    expect(
      asignarEquipoSlotBodySchema.safeParse({ lado: 3, idEquipo: 5 }).success,
    ).toBe(false);
  });

  it("rejects invalid idEquipo", () => {
    expect(
      asignarEquipoSlotBodySchema.safeParse({ lado: 1, idEquipo: -1 })
        .success,
    ).toBe(false);
  });
});
