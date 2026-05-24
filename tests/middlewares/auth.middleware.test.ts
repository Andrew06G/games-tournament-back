import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { authMiddleware } from "../../src/middlewares/auth.middleware";
import * as jwtTokens from "../../src/utils/jwtTokens";

function mockReqRes(headers: Record<string, string | undefined> = {}) {
  const req = { headers } as Request;
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  } as Response & { statusCode: number; body: unknown };
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("authMiddleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-access-secret-min-32-chars-long!!";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-32-chars!!";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when Authorization header is missing", () => {
    const { req, res, next } = mockReqRes();
    authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Token no proporcionado" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Bearer token is empty", () => {
    const { req, res, next } = mockReqRes({ authorization: "Bearer " });
    authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.auth and calls next for valid token", () => {
    const token = jwtTokens.signAccessToken({
      sub: "42",
      email: "user@test.com",
      globalRoles: ["jugador"],
    });
    const { req, res, next } = mockReqRes({
      authorization: `Bearer ${token}`,
    });
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.auth).toEqual({
      userId: 42,
      email: "user@test.com",
      globalRoles: ["jugador"],
    });
  });

  it("returns 401 when sub is not a valid integer", () => {
    vi.spyOn(jwtTokens, "verifyAccessToken").mockReturnValue({
      sub: "not-a-number",
      email: "u@test.com",
      globalRoles: [],
    });
    const { req, res, next } = mockReqRes({
      authorization: "Bearer fake-token",
    });
    authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Token inválido" });
  });

  it("returns 401 when verifyAccessToken throws", () => {
    vi.spyOn(jwtTokens, "verifyAccessToken").mockImplementation(() => {
      throw new Error("invalid");
    });
    const { req, res, next } = mockReqRes({
      authorization: "Bearer bad",
    });
    authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Token inválido o expirado" });
  });
});
