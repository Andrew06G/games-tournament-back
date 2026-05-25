import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../../src/utils/httpError";
import {
  ganadorYaAsignadoEnSiguiente,
  propagarGanadorAlSiguiente,
  resolverIdGanadorValidado,
} from "../../src/services/bracketAdvance.service";

type TxMock = {
  enfrentamiento: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  resultado: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function createTxMock(overrides: Partial<TxMock> = {}): TxMock {
  return {
    enfrentamiento: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      ...overrides.enfrentamiento,
    },
    resultado: {
      findUnique: vi.fn(),
      ...overrides.resultado,
    },
  };
}

describe("resolverIdGanadorValidado", () => {
  it("returns null when matchup has no teams", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEquipo1: null,
      idEquipo2: 2,
    });
    expect(await resolverIdGanadorValidado(tx as never, 1)).toBeNull();
  });

  it("returns null when there is no resultado", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEquipo1: 10,
      idEquipo2: 20,
    });
    tx.resultado.findUnique.mockResolvedValue(null);
    expect(await resolverIdGanadorValidado(tx as never, 1)).toBeNull();
  });

  it("infers winner from explicit idEquipoGanador", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEquipo1: 10,
      idEquipo2: 20,
    });
    tx.resultado.findUnique.mockResolvedValue({
      puntosEquipo1: 0,
      puntosEquipo2: 0,
      idEquipoGanador: 20,
    });
    expect(await resolverIdGanadorValidado(tx as never, 1)).toBe(20);
  });

  it("throws when explicit winner is not in the matchup", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEquipo1: 10,
      idEquipo2: 20,
    });
    tx.resultado.findUnique.mockResolvedValue({
      puntosEquipo1: 1,
      puntosEquipo2: 0,
      idEquipoGanador: 99,
    });
    await expect(resolverIdGanadorValidado(tx as never, 1)).rejects.toThrow(
      HttpError,
    );
  });

  it("infers winner from higher score (team 1)", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEquipo1: 10,
      idEquipo2: 20,
    });
    tx.resultado.findUnique.mockResolvedValue({
      puntosEquipo1: 3,
      puntosEquipo2: 1,
      idEquipoGanador: null,
    });
    expect(await resolverIdGanadorValidado(tx as never, 1)).toBe(10);
  });

  it("infers winner from higher score (team 2)", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEquipo1: 10,
      idEquipo2: 20,
    });
    tx.resultado.findUnique.mockResolvedValue({
      puntosEquipo1: 0,
      puntosEquipo2: 2,
      idEquipoGanador: null,
    });
    expect(await resolverIdGanadorValidado(tx as never, 1)).toBe(20);
  });

  it("returns null on tie without explicit winner", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEquipo1: 10,
      idEquipo2: 20,
    });
    tx.resultado.findUnique.mockResolvedValue({
      puntosEquipo1: 2,
      puntosEquipo2: 2,
      idEquipoGanador: null,
    });
    expect(await resolverIdGanadorValidado(tx as never, 1)).toBeNull();
  });
});

describe("propagarGanadorAlSiguiente", () => {
  it("does nothing when there is no next matchup", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEnfrentamientoSiguiente: null,
    });
    await propagarGanadorAlSiguiente(tx as never, 1, 10);
    expect(tx.enfrentamiento.update).not.toHaveBeenCalled();
  });

  it("assigns winner to slot 1 when first feeder", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique
      .mockResolvedValueOnce({ idEnfrentamientoSiguiente: 100 })
      .mockResolvedValueOnce({ idEquipo1: null, idEquipo2: null });
    tx.enfrentamiento.findMany.mockResolvedValue([
      { idEnfrentamiento: 1 },
      { idEnfrentamiento: 2 },
    ]);
    await propagarGanadorAlSiguiente(tx as never, 1, 10);
    expect(tx.enfrentamiento.update).toHaveBeenCalledWith({
      where: { idEnfrentamiento: 100 },
      data: { idEquipo1: 10 },
    });
  });

  it("assigns winner to slot 2 when second feeder", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique
      .mockResolvedValueOnce({ idEnfrentamientoSiguiente: 100 })
      .mockResolvedValueOnce({ idEquipo1: null, idEquipo2: null });
    tx.enfrentamiento.findMany.mockResolvedValue([
      { idEnfrentamiento: 1 },
      { idEnfrentamiento: 2 },
    ]);
    await propagarGanadorAlSiguiente(tx as never, 2, 20);
    expect(tx.enfrentamiento.update).toHaveBeenCalledWith({
      where: { idEnfrentamiento: 100 },
      data: { idEquipo2: 20 },
    });
  });

  it("throws 409 when next slot is occupied by another team", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique
      .mockResolvedValueOnce({ idEnfrentamientoSiguiente: 100 })
      .mockResolvedValueOnce({ idEquipo1: 99, idEquipo2: null });
    tx.enfrentamiento.findMany.mockResolvedValue([{ idEnfrentamiento: 1 }]);
    await expect(
      propagarGanadorAlSiguiente(tx as never, 1, 10),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("skips update when winner already occupies the slot", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique
      .mockResolvedValueOnce({ idEnfrentamientoSiguiente: 100 })
      .mockResolvedValueOnce({ idEquipo1: 10, idEquipo2: null });
    tx.enfrentamiento.findMany.mockResolvedValue([{ idEnfrentamiento: 1 }]);
    await propagarGanadorAlSiguiente(tx as never, 1, 10);
    expect(tx.enfrentamiento.update).not.toHaveBeenCalled();
  });
});

describe("ganadorYaAsignadoEnSiguiente", () => {
  it("returns false when there is no next matchup", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEnfrentamientoSiguiente: null,
    });
    expect(await ganadorYaAsignadoEnSiguiente(tx as never, 1)).toBe(false);
  });

  it("returns false when resultado is not validated", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique.mockResolvedValue({
      idEnfrentamientoSiguiente: 100,
    });
    tx.resultado.findUnique.mockResolvedValue({ validado: false });
    expect(await ganadorYaAsignadoEnSiguiente(tx as never, 1)).toBe(false);
  });

  it("returns true when validated winner is already in next matchup", async () => {
    const tx = createTxMock();
    tx.enfrentamiento.findUnique
      .mockResolvedValueOnce({ idEnfrentamientoSiguiente: 100 })
      .mockResolvedValueOnce({ idEquipo1: 10, idEquipo2: 20 })
      .mockResolvedValueOnce({ idEquipo1: 10, idEquipo2: null });
    tx.resultado.findUnique
      .mockResolvedValueOnce({ validado: true })
      .mockResolvedValueOnce({
        puntosEquipo1: 2,
        puntosEquipo2: 0,
        idEquipoGanador: null,
      });
    expect(await ganadorYaAsignadoEnSiguiente(tx as never, 1)).toBe(true);
    expect(tx.enfrentamiento.findUnique).toHaveBeenCalledTimes(3);
  });
});
