import { describe, expect, it } from "vitest";
import { HttpError } from "../../src/utils/httpError";

describe("HttpError", () => {
  it("sets statusCode and message", () => {
    const err = new HttpError(404, "Not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("HttpError");
    expect(err).toBeInstanceOf(Error);
  });
});
