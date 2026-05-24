import { describe, expect, it } from "vitest";
import {
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from "../../src/validators/auth.validator";

const validRegister = {
  nombre: "Alice",
  email: "alice@example.com",
  contrasena: "password1",
  idRol: 2,
};

describe("registerBodySchema", () => {
  it("accepts valid registration body", () => {
    expect(registerBodySchema.safeParse(validRegister).success).toBe(true);
  });

  it("accepts optional telefono and nickname", () => {
    const result = registerBodySchema.safeParse({
      ...validRegister,
      telefono: "3001234567",
      nickname: "alice_01",
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["empty nombre", { ...validRegister, nombre: "" }],
    ["invalid email", { ...validRegister, email: "not-email" }],
    ["short password", { ...validRegister, contrasena: "short" }],
    ["invalid idRol", { ...validRegister, idRol: 0 }],
    [
      "invalid nickname chars",
      { ...validRegister, nickname: "bad-nick!" },
    ],
  ])("rejects %s", (_label, body) => {
    expect(registerBodySchema.safeParse(body).success).toBe(false);
  });
});

describe("loginBodySchema", () => {
  it("accepts valid login", () => {
    expect(
      loginBodySchema.safeParse({
        email: "u@test.com",
        contrasena: "x",
      }).success,
    ).toBe(true);
  });

  it("rejects missing password", () => {
    expect(
      loginBodySchema.safeParse({ email: "u@test.com", contrasena: "" })
        .success,
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      loginBodySchema.safeParse({ email: "bad", contrasena: "secret" }).success,
    ).toBe(false);
  });
});

describe("refreshBodySchema", () => {
  it("accepts non-empty refresh token", () => {
    expect(
      refreshBodySchema.safeParse({ refreshToken: "token-abc" }).success,
    ).toBe(true);
  });

  it("rejects empty refresh token", () => {
    expect(refreshBodySchema.safeParse({ refreshToken: "" }).success).toBe(
      false,
    );
  });
});
