import { describe, expect, it } from "vitest";
import {
  addJugadorBodySchema,
  updateEquipoBodySchema,
} from "../../src/validators/equipo.validator";

describe("addJugadorBodySchema", () => {
  it("accepts registered player with idUsuario", () => {
    expect(
      addJugadorBodySchema.safeParse({
        idUsuario: 5,
        nickname: "player_one",
      }).success,
    ).toBe(true);
  });

  it("accepts guest player without idUsuario", () => {
    expect(
      addJugadorBodySchema.safeParse({
        nickname: "guest",
        esInvitado: true,
      }).success,
    ).toBe(true);
  });

  it("rejects guest with idUsuario", () => {
    const result = addJugadorBodySchema.safeParse({
      nickname: "guest",
      esInvitado: true,
      idUsuario: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("esInvitado");
    }
  });

  it("rejects empty nickname", () => {
    expect(
      addJugadorBodySchema.safeParse({ nickname: "" }).success,
    ).toBe(false);
  });
});

describe("updateEquipoBodySchema", () => {
  it("accepts partial update", () => {
    expect(
      updateEquipoBodySchema.safeParse({ nombreEquipo: "Renamed" }).success,
    ).toBe(true);
  });

  it("accepts null logoUrl", () => {
    expect(updateEquipoBodySchema.safeParse({ logoUrl: null }).success).toBe(
      true,
    );
  });

  it("rejects empty object", () => {
    expect(updateEquipoBodySchema.safeParse({}).success).toBe(false);
  });
});
