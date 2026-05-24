import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/utils/jwtTokens";

const ENV_KEYS = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
] as const;

describe("jwtTokens", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
    }
    process.env.JWT_SECRET = "test-access-secret-min-32-chars-long!!";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-32-chars!!";
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  describe("signAccessToken / verifyAccessToken", () => {
    it("round-trips a valid access token payload", () => {
      const token = signAccessToken({
        sub: "1",
        email: "user@test.com",
        globalRoles: ["jugador", "organizador"],
      });
      const payload = verifyAccessToken(token);
      expect(payload).toEqual({
        sub: "1",
        email: "user@test.com",
        globalRoles: ["jugador", "organizador"],
      });
    });

    it("throws when JWT_SECRET is missing", () => {
      delete process.env.JWT_SECRET;
      expect(() =>
        signAccessToken({ sub: "1", email: "a@b.com", globalRoles: [] }),
      ).toThrow("Variable de entorno requerida: JWT_SECRET");
    });

    it("throws when payload shape is invalid after verify", () => {
      const bad = signAccessToken({
        sub: "1",
        email: "user@test.com",
        globalRoles: [],
      });
      process.env.JWT_SECRET = "other-secret-for-invalid-payload-test!!";
      expect(() => verifyAccessToken(bad)).toThrow();
    });
  });

  describe("signRefreshToken / verifyRefreshToken", () => {
    it("round-trips a refresh token", () => {
      const token = signRefreshToken(99);
      const payload = verifyRefreshToken(token);
      expect(payload).toEqual({ sub: "99", typ: "refresh" });
    });

    it("rejects access token used as refresh token", () => {
      const access = signAccessToken({
        sub: "1",
        email: "u@test.com",
        globalRoles: [],
      });
      expect(() => verifyRefreshToken(access)).toThrow(
        "Refresh token mal formado",
      );
    });

    it("throws when JWT_REFRESH_SECRET is missing", () => {
      delete process.env.JWT_REFRESH_SECRET;
      expect(() => signRefreshToken(1)).toThrow(
        "Variable de entorno requerida: JWT_REFRESH_SECRET",
      );
    });
  });
});
