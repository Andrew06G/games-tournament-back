import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import {
  requireGlobalRoles,
  requireTorneoOrganizerAccess,
} from "../../src/middlewares/role.middleware";
import { getPrisma } from "../../src/config/database";

vi.mock("../../src/config/database", () => ({
  getPrisma: vi.fn(),
}));

function mockRes() {
  return {
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
}

describe("requireGlobalRoles", () => {
  it("returns 401 when req.auth is missing", () => {
    const middleware = requireGlobalRoles("organizador");
    const res = mockRes();
    const next = vi.fn();
    middleware({} as Request, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user lacks required role", () => {
    const middleware = requireGlobalRoles("organizador");
    const res = mockRes();
    const next = vi.fn();
    const req = {
      auth: { userId: 1, email: "u@t.com", globalRoles: ["jugador"] },
    } as Request;
    middleware(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user has one of the allowed roles", () => {
    const middleware = requireGlobalRoles("organizador", "admin");
    const res = mockRes();
    const next = vi.fn();
    const req = {
      auth: { userId: 1, email: "u@t.com", globalRoles: ["organizador"] },
    } as Request;
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("requireTorneoOrganizerAccess", () => {
  const findFirst = vi.fn();
  const findUnique = vi.fn();

  beforeEach(() => {
    vi.mocked(getPrisma).mockReturnValue({
      usuarioRol: { findFirst },
      torneo: { findUnique },
    } as never);
    findFirst.mockReset();
    findUnique.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    const middleware = requireTorneoOrganizerAccess();
    const res = mockRes();
    const next = vi.fn();
    await middleware({ params: { id: "1" } } as Request, res, next);
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for invalid torneo id", async () => {
    const middleware = requireTorneoOrganizerAccess();
    const res = mockRes();
    const next = vi.fn();
    const req = {
      auth: { userId: 1, email: "u@t.com", globalRoles: [] },
      params: { id: "abc" },
    } as Request;
    await middleware(req, res, next);
    expect(res.statusCode).toBe(400);
  });

  it("allows global organizador without DB lookup", async () => {
    const middleware = requireTorneoOrganizerAccess();
    const res = mockRes();
    const next = vi.fn();
    const req = {
      auth: { userId: 1, email: "u@t.com", globalRoles: ["organizador"] },
      params: { id: "5" },
    } as Request;
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("allows torneo-specific organizador role", async () => {
    findFirst.mockResolvedValue({ idUsuarioRol: 1 });
    findUnique.mockResolvedValue({ idOrganizador: 99 });
    const middleware = requireTorneoOrganizerAccess();
    const res = mockRes();
    const next = vi.fn();
    const req = {
      auth: { userId: 2, email: "u@t.com", globalRoles: [] },
      params: { id: "5" },
    } as Request;
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("allows tournament owner (idOrganizador)", async () => {
    findFirst.mockResolvedValue(null);
    findUnique.mockResolvedValue({ idOrganizador: 3 });
    const middleware = requireTorneoOrganizerAccess();
    const res = mockRes();
    const next = vi.fn();
    const req = {
      auth: { userId: 3, email: "u@t.com", globalRoles: [] },
      params: { id: "5" },
    } as Request;
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 403 when user has no organizer access", async () => {
    findFirst.mockResolvedValue(null);
    findUnique.mockResolvedValue({ idOrganizador: 99 });
    const middleware = requireTorneoOrganizerAccess();
    const res = mockRes();
    const next = vi.fn();
    const req = {
      auth: { userId: 1, email: "u@t.com", globalRoles: [] },
      params: { id: "5" },
    } as Request;
    await middleware(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
