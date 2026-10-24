import { describe, expect, it } from "vitest";
import { apercuJeton, empreinteJeton, genererJeton, jetonDepuisEntete } from "./jetons-api";

describe("jetons de l'extension ANTAI", () => {
  it("génère des jetons uniques, longs, au format attendu", () => {
    const a = genererJeton();
    const b = genererJeton();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^vuca_[A-Za-z0-9_-]{43}$/);
  });
  it("empreinte SHA-256 stable (hex)", () => {
    expect(empreinteJeton("vuca_test")).toBe(empreinteJeton("vuca_test"));
    expect(empreinteJeton("vuca_test")).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinteJeton("vuca_test")).not.toBe(empreinteJeton("vuca_tesT"));
  });
  it("aperçu = début seulement", () => {
    expect(apercuJeton("vuca_Ab12Cd34Ef")).toBe("vuca_Ab12Cd…");
  });
  it("lit l'en-tête Authorization", () => {
    expect(jetonDepuisEntete("Bearer vuca_abc-_1")).toBe("vuca_abc-_1");
    expect(jetonDepuisEntete("bearer  vuca_abc ")).toBe("vuca_abc");
    for (const e of [null, undefined, "", "Bearer", "Bearer ", "Basic dXNlcjpwYXNz", "vuca_abc", "Bearer a b", "Bearer <script>", `Bearer ${"a".repeat(201)}`]) {
      expect(jetonDepuisEntete(e)).toBeNull();
    }
  });
});
