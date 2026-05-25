import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Response } from "express";
import { z } from "zod";
import { HttpError } from "../../src/utils/httpError";
import { parseIdParam, sendError } from "../../src/utils/controllerHelpers";

function mockResponse(): Response & {
  statusCode: number;
  body: unknown;
} {
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
  };
  return res as Response & { statusCode: number; body: unknown };
}

describe("sendError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("responds with HttpError status and message", () => {
    const res = mockResponse();
    sendError(res, new HttpError(403, "Forbidden"));
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Forbidden" });
  });

  it("responds with 400 and flattened details for ZodError", () => {
    const res = mockResponse();
    const schema = z.object({ x: z.number() });
    try {
      schema.parse({ x: "bad" });
    } catch (e) {
      sendError(res, e);
      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({ error: "Datos inválidos" });
    }
  });

  it("responds with 500 for unknown errors", () => {
    const res = mockResponse();
    sendError(res, new Error("boom"));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Error interno del servidor" });
  });
});

describe("parseIdParam", () => {
  it("parses valid positive integer string", () => {
    expect(parseIdParam("42")).toBe(42);
  });

  it("uses first element when param is an array", () => {
    expect(parseIdParam(["7", "9"])).toBe(7);
  });

  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["zero", "0"],
    ["negative", "-1"],
    ["float", "1.5"],
    ["text", "abc"],
  ])("throws HttpError 400 for invalid input: %s", (_label, raw) => {
    expect(() => parseIdParam(raw)).toThrow(HttpError);
    try {
      parseIdParam(raw);
    } catch (e) {
      expect((e as HttpError).statusCode).toBe(400);
    }
  });

  it("uses custom label in error message", () => {
    expect(() => parseIdParam("x", "torneoId")).toThrow("torneoId inválido");
  });
});
