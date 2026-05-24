import { describe, expect, it } from "vitest";
import { parseDateOnlyInput, startOfUtcDay } from "../../src/utils/dates";

describe("startOfUtcDay", () => {
  it("zeros UTC time components", () => {
    const input = new Date("2026-05-24T15:30:45.123Z");
    const result = startOfUtcDay(input);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
    expect(result.getUTCDate()).toBe(24);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCFullYear()).toBe(2026);
  });

  it("does not mutate the original date", () => {
    const input = new Date("2026-01-01T12:00:00.000Z");
    const hoursBefore = input.getUTCHours();
    startOfUtcDay(input);
    expect(input.getUTCHours()).toBe(hoursBefore);
  });
});

describe("parseDateOnlyInput", () => {
  it("parses ISO date string and returns start of UTC day", () => {
    const result = parseDateOnlyInput("2026-05-24");
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(!Number.isNaN(result.getTime())).toBe(true);
  });

  it("throws for invalid date string", () => {
    expect(() => parseDateOnlyInput("not-a-date")).toThrow("Fecha inválida");
  });
});
