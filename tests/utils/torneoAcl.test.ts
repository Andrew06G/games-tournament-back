import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "../../src/config/database";
import {
  userCanManageTorneo,
  userCanRegistrarResultadosTorneo,
  userIsLiderEquipoEnTorneo,
} from "../../src/utils/torneoAcl";

vi.mock("../../src/config/database", () => ({
  getPrisma: vi.fn(),
}));

describe("torneoAcl", () => {
  const usuarioRolFindFirst = vi.fn();
  const torneoFindUnique = vi.fn();
  const jugadorFindFirst = vi.fn();

  beforeEach(() => {
    vi.mocked(getPrisma).mockReturnValue({
      usuarioRol: { findFirst: usuarioRolFindFirst },
      torneo: { findUnique: torneoFindUnique },
      jugador: { findFirst: jugadorFindFirst },
    } as never);
    usuarioRolFindFirst.mockReset();
    torneoFindUnique.mockReset();
    jugadorFindFirst.mockReset();
  });

  describe("userCanManageTorneo", () => {
    it("returns true for global organizador", async () => {
      usuarioRolFindFirst
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);
      torneoFindUnique.mockResolvedValue({ idOrganizador: 99 });
      expect(await userCanManageTorneo(1, 10)).toBe(true);
    });

    it("returns true for torneo-scoped organizador", async () => {
      usuarioRolFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 2 });
      torneoFindUnique.mockResolvedValue({ idOrganizador: 99 });
      expect(await userCanManageTorneo(2, 10)).toBe(true);
    });

    it("returns true when user is tournament owner", async () => {
      usuarioRolFindFirst.mockResolvedValue(null);
      torneoFindUnique.mockResolvedValue({ idOrganizador: 5 });
      expect(await userCanManageTorneo(5, 10)).toBe(true);
    });

    it("returns false when no organizer access", async () => {
      usuarioRolFindFirst.mockResolvedValue(null);
      torneoFindUnique.mockResolvedValue({ idOrganizador: 99 });
      expect(await userCanManageTorneo(1, 10)).toBe(false);
    });
  });

  describe("userIsLiderEquipoEnTorneo", () => {
    it("returns true when global lider_equipo and active player in torneo", async () => {
      usuarioRolFindFirst.mockResolvedValue({ id: 1 });
      jugadorFindFirst.mockResolvedValue({ idJugador: 1 });
      expect(await userIsLiderEquipoEnTorneo(3, 10)).toBe(true);
    });

    it("returns false when missing lider role", async () => {
      usuarioRolFindFirst.mockResolvedValue(null);
      jugadorFindFirst.mockResolvedValue({ idJugador: 1 });
      expect(await userIsLiderEquipoEnTorneo(3, 10)).toBe(false);
    });

    it("returns false when not enrolled as active player", async () => {
      usuarioRolFindFirst.mockResolvedValue({ id: 1 });
      jugadorFindFirst.mockResolvedValue(null);
      expect(await userIsLiderEquipoEnTorneo(3, 10)).toBe(false);
    });
  });

  describe("userCanRegistrarResultadosTorneo", () => {
    it("returns true when user can manage torneo", async () => {
      usuarioRolFindFirst.mockResolvedValue({ id: 1 });
      torneoFindUnique.mockResolvedValue({ idOrganizador: 1 });
      expect(await userCanRegistrarResultadosTorneo(1, 10)).toBe(true);
    });

    it("returns true for team leader when not organizer", async () => {
      usuarioRolFindFirst
        .mockResolvedValueOnce(null) // global organizador (manage)
        .mockResolvedValueOnce(null) // torneo organizador (manage)
        .mockResolvedValueOnce({ id: 1 }); // lider_equipo
      torneoFindUnique.mockResolvedValue({ idOrganizador: 99 });
      jugadorFindFirst.mockResolvedValue({ idJugador: 7 });
      expect(await userCanRegistrarResultadosTorneo(3, 10)).toBe(true);
    });

    it("returns false when neither organizer nor team leader", async () => {
      usuarioRolFindFirst.mockResolvedValue(null);
      torneoFindUnique.mockResolvedValue({ idOrganizador: 99 });
      jugadorFindFirst.mockResolvedValue(null);
      expect(await userCanRegistrarResultadosTorneo(3, 10)).toBe(false);
    });
  });
});
