import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "../../src/config/database";
import {
  countEmptySlots,
  findNextEmptyPairSlot,
  intentarEmparejarUltimosDosEquipos,
} from "../../src/services/bracketGenerator.service";

vi.mock("../../src/config/database", () => ({
  getPrisma: vi.fn(),
}));

describe("bracketGenerator helpers", () => {
  const findMany = vi.fn();
  const update = vi.fn();

  beforeEach(() => {
    vi.mocked(getPrisma).mockReturnValue({
      enfrentamiento: { findMany, update },
      equipo: { findMany: vi.fn() },
    } as never);
    findMany.mockReset();
    update.mockReset();
  });

  describe("countEmptySlots", () => {
    it("counts null team slots across matchups", async () => {
      findMany.mockResolvedValue([
        { idEquipo1: 1, idEquipo2: null },
        { idEquipo1: null, idEquipo2: null },
      ]);
      expect(await countEmptySlots(5)).toBe(3);
    });

    it("returns 0 when all slots are filled", async () => {
      findMany.mockResolvedValue([
        { idEquipo1: 1, idEquipo2: 2 },
        { idEquipo1: 3, idEquipo2: 4 },
      ]);
      expect(await countEmptySlots(5)).toBe(0);
    });
  });

  describe("findNextEmptyPairSlot", () => {
    it("returns first matchup with both slots empty", async () => {
      const empty = {
        idEnfrentamiento: 9,
        idEquipo1: null,
        idEquipo2: null,
        posicionBracket: "octavos-0",
      };
      findMany.mockResolvedValue([
        { idEnfrentamiento: 1, idEquipo1: 1, idEquipo2: 2, posicionBracket: "a" },
        empty,
      ]);
      expect(await findNextEmptyPairSlot(5)).toEqual(empty);
    });

    it("returns null when no fully empty pair exists", async () => {
      findMany.mockResolvedValue([
        { idEnfrentamiento: 1, idEquipo1: 1, idEquipo2: null, posicionBracket: "a" },
      ]);
      expect(await findNextEmptyPairSlot(5)).toBeNull();
    });
  });

  describe("intentarEmparejarUltimosDosEquipos", () => {
    const equipoFindMany = vi.fn();

    beforeEach(() => {
      vi.mocked(getPrisma).mockReturnValue({
        enfrentamiento: { findMany, update },
        equipo: { findMany: equipoFindMany },
      } as never);
      equipoFindMany.mockReset();
    });

    it("returns null when not exactly two free teams", async () => {
      findMany.mockResolvedValue([
        { idEquipo1: 1, idEquipo2: 2 },
      ]);
      equipoFindMany.mockResolvedValue([
        { idEquipo: 1 },
        { idEquipo: 2 },
        { idEquipo: 3 },
      ]);
      expect(await intentarEmparejarUltimosDosEquipos(5)).toBeNull();
    });

    it("pairs last two free teams into next empty slot", async () => {
      findMany
        .mockResolvedValueOnce([
          { idEquipo1: 1, idEquipo2: 2 },
        ])
        .mockResolvedValueOnce([
          {
            idEnfrentamiento: 50,
            idEquipo1: null,
            idEquipo2: null,
            posicionBracket: "octavos-1",
          },
        ]);
      equipoFindMany.mockResolvedValue([
        { idEquipo: 1 },
        { idEquipo: 2 },
        { idEquipo: 10 },
        { idEquipo: 20 },
      ]);
      update.mockResolvedValue({});
      const result = await intentarEmparejarUltimosDosEquipos(5);
      expect(result).toEqual({ idEnfrentamiento: 50 });
      expect(update).toHaveBeenCalledWith({
        where: { idEnfrentamiento: 50 },
        data: { idEquipo1: 10, idEquipo2: 20 },
      });
    });
  });
});
