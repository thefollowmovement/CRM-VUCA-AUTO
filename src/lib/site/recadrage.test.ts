import { describe, expect, it } from "vitest";
import { borner, largeurMaxCadre, recadrageParDefaut, zoneEnPixels } from "./recadrage";

describe("recadrage 4:3", () => {
  it("photo déjà en 4:3 : toute l'image", () => {
    expect(zoneEnPixels(1600, 1200, null)).toEqual({ left: 0, top: 0, width: 1600, height: 1200 });
  });
  it("photo 16:9 : cadre centré sur toute la hauteur", () => {
    expect(largeurMaxCadre(1600, 900)).toBeCloseTo(75);
    expect(zoneEnPixels(1600, 900, null)).toEqual({ left: 200, top: 0, width: 1200, height: 900 });
  });
  it("photo verticale : cadre centré sur toute la largeur", () => {
    expect(zoneEnPixels(900, 1600, null)).toEqual({ left: 0, top: 463, width: 900, height: 675 }); // (1600 − 675) ÷ 2 = 462,5 → 463
    expect(recadrageParDefaut(900, 1600).l).toBe(100);
  });
  it("cadre choisi, et cadre qui dépasse ramené dans l'image", () => {
    expect(zoneEnPixels(1600, 1200, { x: 10, y: 10, l: 50 })).toEqual({ left: 160, top: 120, width: 800, height: 600 });
    const b = borner({ x: 90, y: 90, l: 50 }, 1600, 1200);
    expect(b).toEqual({ x: 50, y: 50, l: 50 });
    expect(zoneEnPixels(1600, 900, { x: 0, y: 0, l: 100 }).width).toBe(1200); // largeur max respectée
  });
});
