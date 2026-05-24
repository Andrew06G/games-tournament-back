import { describe, expect, it } from "vitest";
import { preferenciasBodySchema } from "../../src/services/notificacion.service";

describe("preferenciasBodySchema", () => {
  it("accepts empty object", () => {
    expect(preferenciasBodySchema.safeParse({}).success).toBe(true);
  });

  it("accepts all optional boolean flags", () => {
    expect(
      preferenciasBodySchema.safeParse({
        notifNuevoEnfrentamiento: true,
        notifResultadoValidado: false,
        notifCambioFase: true,
        notifRecordatorio: false,
      }).success,
    ).toBe(true);
  });

  it.each(["app", "email", "ambos"] as const)(
    "accepts canalPreferido %s",
    (canal) => {
      expect(
        preferenciasBodySchema.safeParse({ canalPreferido: canal }).success,
      ).toBe(true);
    },
  );

  it("rejects invalid canalPreferido", () => {
    expect(
      preferenciasBodySchema.safeParse({ canalPreferido: "sms" }).success,
    ).toBe(false);
  });
});
