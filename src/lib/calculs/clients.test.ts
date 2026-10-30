import { describe, expect, it } from "vitest";
import { alertesClient, anneesPleines } from "./clients";

const j = (s: string) => new Date(`${s}T00:00:00Z`);
const base = { listeNoire: false, numeroPermis: "123", dateObtentionPermis: j("2015-05-10"), dateValiditePermis: j("2030-01-01"), dateValiditePieceIdentite: j("2030-01-01") };

describe("alertes client", () => {
  it("années pleines", () => {
    expect(anneesPleines(j("2024-10-21"), j("2026-10-20"))).toBe(1);
    expect(anneesPleines(j("2024-10-20"), j("2026-10-20"))).toBe(2);
  });
  it("client en règle : aucune alerte", () => {
    expect(alertesClient(base, j("2026-10-20"), 2)).toEqual([]);
  });
  it("permis récent, expiré, liste noire", () => {
    const a = alertesClient(
      { ...base, listeNoire: true, motifListeNoire: "Impayé", dateObtentionPermis: j("2025-12-01"), dateValiditePermis: j("2026-01-01"), dateValiditePieceIdentite: j("2026-01-01") },
      j("2026-10-20"),
      2,
    );
    expect(a.map((x) => x.texte)).toEqual(["Liste noire : Impayé", "Permis expiré", "Permis de moins de 2 ans (moins d'un an)", "Pièce d'identité expirée"]);
    expect(a.filter((x) => x.niveau === "bloquant")).toHaveLength(2);
  });
  it("permis non renseigné", () => {
    expect(alertesClient({ ...base, numeroPermis: null, dateObtentionPermis: null }, j("2026-10-20"), 2)[0]?.texte).toBe("Permis de conduire non renseigné");
  });
});
