import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCorsOrigin, logCorsConfig } from "../../src/config/corsOrigin";

describe("corsOrigin", () => {
  const saved = process.env.FRONTEND_URL;

  afterEach(() => {
    if (saved === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = saved;
    vi.restoreAllMocks();
  });

  describe("logCorsConfig", () => {
    it("warns when FRONTEND_URL is unset", () => {
      delete process.env.FRONTEND_URL;
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      logCorsConfig();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("FRONTEND_URL no definida"),
      );
    });

    it("logs normalized origins when FRONTEND_URL is set", () => {
      process.env.FRONTEND_URL = "https://App.Example.com/, https://other.dev/";
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      logCorsConfig();
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining("[CORS]"),
        expect.stringContaining("https://app.example.com"),
      );
    });
  });

  describe("getCorsOrigin", () => {
    it("returns true when no allowed origins configured", () => {
      delete process.env.FRONTEND_URL;
      expect(getCorsOrigin()).toBe(true);
    });

    it("allows any request without Origin header when list is configured", () => {
      process.env.FRONTEND_URL = "https://frontend.example.com";
      const origin = getCorsOrigin();
      expect(typeof origin).toBe("function");

      const callback = vi.fn();
      (origin as Function)(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("allows matching origin ignoring trailing slash and case", () => {
      process.env.FRONTEND_URL = "https://Frontend.Example.COM/";
      const origin = getCorsOrigin() as (
        req: string,
        cb: (err: Error | null, allow?: boolean) => void,
      ) => void;

      const allow = vi.fn();
      origin("https://frontend.example.com/", allow);
      expect(allow).toHaveBeenCalledWith(null, true);

      const deny = vi.fn();
      origin("https://evil.example.com", deny);
      expect(deny).toHaveBeenCalledWith(null, false);
    });

    it("supports comma-separated multiple origins", () => {
      process.env.FRONTEND_URL =
        "https://a.example.com, https://b.example.com";
      const origin = getCorsOrigin() as (
        req: string,
        cb: (err: Error | null, allow?: boolean) => void,
      ) => void;

      const cb = vi.fn();
      origin("https://b.example.com", cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });
  });
});
