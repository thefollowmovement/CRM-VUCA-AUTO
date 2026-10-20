import { describe, expect, it } from "vitest";
import { ACCUEIL_SITE, deciderRoutage, lireConfigDomaines, normaliserHote, urlAnnonce, urlSite } from "./domaines";

const config = lireConfigDomaines({ SITE_DOMAIN: "vuca-auto.fr", CRM_DOMAIN: "crm.vuca-auto.fr" });
const site = (chemin: string, recherche = "") => deciderRoutage("vuca-auto.fr", chemin, recherche, config);
const crm = (chemin: string, recherche = "") => deciderRoutage("crm.vuca-auto.fr", chemin, recherche, config);
const alias = (chemin: string) => deciderRoutage("crm-vuca.72-61-164-158.sslip.io", chemin, "", config);

describe("normalisation du nom de domaine", () => {
  it("minuscules, sans port ni point final", () => {
    expect(normaliserHote("Crm.Vuca-Auto.FR:443")).toBe("crm.vuca-auto.fr");
    expect(normaliserHote("vuca-auto.fr.")).toBe("vuca-auto.fr");
    expect(normaliserHote(null)).toBe("");
    expect(lireConfigDomaines({})).toEqual({ site: null, crm: null });
  });
});

describe("domaine public vuca-auto.fr", () => {
  it("l'accueil est servi par la page interne du groupe (site)", () => {
    expect(site("/")).toEqual({ type: "site", chemin: ACCUEIL_SITE });
    expect(deciderRoutage("VUCA-AUTO.FR:443", "/", "", config)).toEqual({ type: "site", chemin: ACCUEIL_SITE });
  });
  it("les pages du site sont servies telles quelles", () => {
    for (const p of ["/voitures", "/voitures/peugeot-208-allure-2021-a1b2", "/a-propos", "/contact", "/mentions-legales", "/confidentialite", "/sitemap.xml", "/api/site/clic", "/photos/abc/800"]) {
      expect(site(p)).toEqual({ type: "site", chemin: p });
    }
  });
  it("aucune page du CRM, jamais l'écran de connexion : 404", () => {
    for (const p of ["/connexion", "/login", "/dashboard", "/vehicules", "/vehicules/abc", "/reglages", "/portail", "/compte", "/site-preview", "/rapports", "/inconnue"]) {
      expect(site(p)).toEqual({ type: "introuvable", api: false });
    }
  });
  it("API du CRM (dont l'authentification) : 404 en JSON, sauf /api/site", () => {
    for (const p of ["/api/auth/session", "/api/auth/csrf", "/api/fichiers/abc", "/api/pdf/facture/abc", "/api/export/paiements", "/api/rapports/excel", "/api/portail/releve"]) {
      expect(site(p)).toEqual({ type: "introuvable", api: true });
    }
    expect(site("/api/site/vue")).toEqual({ type: "site", chemin: "/api/site/vue" });
    expect(site("/api/sitex")).toEqual({ type: "introuvable", api: true });
  });
  it("fichiers propres au CRM (application installable) : 404", () => {
    expect(site("/sw.js")).toEqual({ type: "introuvable", api: false });
    expect(site("/hors-ligne.html")).toEqual({ type: "introuvable", api: false });
  });
  it("fichiers techniques communs servis sans connexion", () => {
    for (const p of ["/favicon.ico", "/icon.svg", "/icones/icone-192.png", "/manifest.webmanifest", "/robots.txt", "/_next/static/chunks/a.js"]) {
      expect(site(p)).toEqual({ type: "libre" });
    }
  });
  it("adresses internes : l'accueil interne redirige vers /, la 404 interne reste une 404", () => {
    expect(site(ACCUEIL_SITE, "?a=1")).toEqual({ type: "redirection", url: "https://vuca-auto.fr/?a=1", statut: 308 });
    expect(site("/site-introuvable")).toEqual({ type: "introuvable", api: false });
  });
  it("www redirige vers le domaine sans www (chemin et paramètres conservés)", () => {
    expect(deciderRoutage("www.vuca-auto.fr", "/voitures", "?prixMax=15000", config)).toEqual({
      type: "redirection",
      url: "https://vuca-auto.fr/voitures?prixMax=15000",
      statut: 308,
    });
  });
});

describe("domaine du CRM crm.vuca-auto.fr (et son alias sslip.io)", () => {
  it("comportement actuel du CRM", () => {
    for (const p of ["/", "/connexion", "/dashboard", "/vehicules/abc", "/api/fichiers/abc", "/portail", "/compte"]) {
      expect(crm(p)).toEqual({ type: "crm" });
      expect(alias(p)).toEqual({ type: "crm" });
    }
  });
  it("l'aperçu /site-preview reste dans le CRM (connexion exigée)", () => {
    expect(crm("/site-preview")).toEqual({ type: "crm" });
    expect(alias("/site-preview")).toEqual({ type: "crm" });
  });
  it("les pages du site ne sont pas servies : renvoi vers vuca-auto.fr", () => {
    expect(crm("/voitures/peugeot-208", "?a=1")).toEqual({ type: "redirection", url: "https://vuca-auto.fr/voitures/peugeot-208?a=1", statut: 307 });
    expect(alias("/a-propos")).toEqual({ type: "redirection", url: "https://vuca-auto.fr/a-propos", statut: 307 });
    expect(crm(ACCUEIL_SITE)).toEqual({ type: "redirection", url: "https://vuca-auto.fr/", statut: 307 });
  });
  it("API et 404 internes du site : 404 sur le CRM", () => {
    expect(crm("/api/site/clic")).toEqual({ type: "introuvable", api: true });
    expect(crm("/site-introuvable")).toEqual({ type: "introuvable", api: false });
  });
  it("fichiers techniques sans connexion", () => {
    for (const p of ["/sw.js", "/hors-ligne.html", "/manifest.webmanifest", "/favicon.ico", "/icones/icone-512.png", "/robots.txt", "/api/auth/session", "/api/auth/csrf"]) {
      expect(crm(p)).toEqual({ type: "libre" });
    }
  });
  it("sans SITE_DOMAIN configuré : tout est CRM, les pages du site donnent une 404", () => {
    const vide = lireConfigDomaines({});
    expect(deciderRoutage("crm.vuca-auto.fr", "/dashboard", "", vide)).toEqual({ type: "crm" });
    expect(deciderRoutage("vuca-auto.fr", "/dashboard", "", vide)).toEqual({ type: "crm" });
    expect(deciderRoutage("localhost", "/voitures", "", vide)).toEqual({ type: "introuvable", api: false });
  });
});

describe("adresses publiques", () => {
  it("urlSite et urlAnnonce utilisent https://vuca-auto.fr", () => {
    expect(urlSite("/", "vuca-auto.fr")).toBe("https://vuca-auto.fr");
    expect(urlSite("/voitures", "vuca-auto.fr")).toBe("https://vuca-auto.fr/voitures");
    expect(urlAnnonce("peugeot-208-allure-2021-a1b2", "vuca-auto.fr")).toBe("https://vuca-auto.fr/voitures/peugeot-208-allure-2021-a1b2");
    expect(urlAnnonce("x", null)).toBe("/voitures/x");
  });
});
