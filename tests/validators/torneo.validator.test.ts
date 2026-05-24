import { describe, expect, it } from "vitest";
import {
  createTorneoBodySchema,
  inscribirEquipoBodySchema,
  updateTorneoBodySchema,
} from "../../src/validators/torneo.validator";

const validCreate = {
  nombre: "Spring Cup",
  idTipoVideojuego: 1,
  idFormato: 1,
  fechaInicio: "2026-06-01",
  numMaxParticipantes: 8,
};

describe("createTorneoBodySchema", () => {
  it("accepts valid create body", () => {
    expect(createTorneoBodySchema.safeParse(validCreate).success).toBe(true);
  });

  it.each([2, 4, 8, 16, 32])("accepts bracket cupo %i", (n) => {
    expect(
      createTorneoBodySchema.safeParse({
        ...validCreate,
        numMaxParticipantes: n,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid bracket cupo", () => {
    const result = createTorneoBodySchema.safeParse({
      ...validCreate,
      numMaxParticipantes: 6,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty nombre", () => {
    expect(
      createTorneoBodySchema.safeParse({ ...validCreate, nombre: "" }).success,
    ).toBe(false);
  });
});

describe("updateTorneoBodySchema", () => {
  it("accepts partial update with at least one field", () => {
    expect(updateTorneoBodySchema.safeParse({ nombre: "New name" }).success).toBe(
      true,
    );
  });

  it("accepts nullable optional fields", () => {
    expect(
      updateTorneoBodySchema.safeParse({ descripcion: null }).success,
    ).toBe(true);
  });

  it("rejects empty object", () => {
    const result = updateTorneoBodySchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("al menos un campo");
    }
  });
});

describe("inscribirEquipoBodySchema", () => {
  it("accepts minimal inscription", () => {
    expect(
      inscribirEquipoBodySchema.safeParse({ nombreEquipo: "Team Alpha" })
        .success,
    ).toBe(true);
  });

  it("accepts full optional fields", () => {
    expect(
      inscribirEquipoBodySchema.safeParse({
        nombreEquipo: "Team Alpha",
        logoUrl: "https://cdn.example/logo.png",
        nickname: "alpha",
        contactoPreferido: "cap@example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects empty team name", () => {
    expect(
      inscribirEquipoBodySchema.safeParse({ nombreEquipo: "" }).success,
    ).toBe(false);
  });
});
