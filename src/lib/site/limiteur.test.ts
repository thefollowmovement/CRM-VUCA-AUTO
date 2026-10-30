import { describe, expect, it } from "vitest";
import { estRobot, Limiteur } from "./limiteur";

describe("limitation des compteurs", () => {
  it("une vue par visiteur et par page toutes les 30 minutes", () => {
    const l = new Limiteur();
    const t = 1_000_000;
    expect(l.decider("A", "VUE_ANNONCE", "x", t)).toBe("compter");
    expect(l.decider("A", "VUE_ANNONCE", "x", t + 60_000)).toBe("doublon");
    expect(l.decider("A", "VUE_ANNONCE", "y", t + 60_000)).toBe("compter"); // autre annonce
    expect(l.decider("B", "VUE_ANNONCE", "x", t + 60_000)).toBe("compter"); // autre visiteur
    expect(l.decider("A", "VUE_ANNONCE", "x", t + 31 * 60_000)).toBe("compter");
  });

  it("un clic toutes les 10 secondes (double-clic ignoré)", () => {
    const l = new Limiteur();
    expect(l.decider("A", "CLIC_WHATSAPP", "x", 0)).toBe("compter");
    expect(l.decider("A", "CLIC_WHATSAPP", "x", 2_000)).toBe("doublon");
    expect(l.decider("A", "CLIC_WHATSAPP", "x", 11_000)).toBe("compter");
  });

  it("débit limité à 60 requêtes par minute et par visiteur", () => {
    const l = new Limiteur();
    const decisions = Array.from({ length: 70 }, (_, i) => l.decider("A", "VUE_SITE", `page-${i}`, i * 100));
    expect(decisions.filter((d) => d === "compter")).toHaveLength(60);
    expect(decisions.at(-1)).toBe("trop");
    expect(l.decider("A", "VUE_SITE", "autre", 61_000 + 70 * 100)).toBe("compter"); // une minute plus tard
  });

  it("mémoire bornée", () => {
    const l = new Limiteur({ requetesParMinute: 1000, fenetreDoublonMs: () => 1000, tailleMax: 50 });
    for (let i = 0; i < 500; i++) l.decider(`v${i}`, "VUE_SITE", "p", i * 10);
    expect(l.taille).toBeLessThan(60);
  });

  it("robots et outils jamais comptés", () => {
    expect(estRobot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(estRobot("WhatsApp/2.23.20.0")).toBe(true);
    expect(estRobot("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36")).toBe(true);
    expect(estRobot("curl/8.4.0")).toBe(true);
    expect(estRobot("")).toBe(true);
    expect(estRobot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(estRobot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")).toBe(false);
  });
});
