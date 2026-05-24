import { describe, expect, it } from "vitest";
import { updateJugadorBodySchema } from "../../src/validators/jugador.validator";

describe("updateJugadorBodySchema", () => {
  it("accepts nickname update", () => {
    expect(
      updateJugadorBodySchema.safeParse({ nickname: "new_nick" }).success,
    ).toBe(true);
  });

  it("accepts nullable contactoPreferido and esCapitan", () => {
    expect(
      updateJugadorBodySchema.safeParse({
        contactoPreferido: null,
        esCapitan: true,
      }).success,
    ).toBe(true);
  });

  it("rejects empty object", () => {
    expect(updateJugadorBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects empty nickname when provided", () => {
    expect(
      updateJugadorBodySchema.safeParse({ nickname: "" }).success,
    ).toBe(false);
  });
});
