// Lecture d'un avis par l'API Claude, avec un client simulé (réponses JSON d'exemple : fixtures/).
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import avis from "./fixtures/reponse-avis.json";
import refus from "./fixtures/reponse-refus.json";
import verso from "./fixtures/reponse-verso.json";
import { ErreurLecture, lireAvis, OUTIL_ENREGISTRER_AVIS } from "./lecture";

function clientSimule(reponse: unknown) {
  const create = vi.fn().mockResolvedValue(reponse);
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

const PNG = Buffer.from("89504e470d0a1a0a", "hex");

describe("lecture d'un avis (Claude simulé)", () => {
  it("avis lu : champs validés, tokens comptés", async () => {
    const { client } = clientSimule(avis);
    const r = await lireAvis({ contenu: PNG, typeMime: "image/png", client });
    expect(r.extraction.est_un_avis).toBe(true);
    expect(r.extraction.numero_avis).toBe("1234567890");
    expect(r.extraction.montant_forfaitaire).toBe(68);
    expect(r.extraction.confiance.heure_infraction).toBe("moyenne");
    expect(r.tokensEntree).toBe(1650);
    expect(r.tokensSortie).toBe(212);
    expect(r.modele).toBe("claude-haiku-5-5");
  });

  it("requête : outil imposé pour Haiku, image en base64, sans température", async () => {
    const { client, create } = clientSimule(avis);
    await lireAvis({ contenu: PNG, typeMime: "image/png", client });
    const params = create.mock.calls[0]![0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.tool_choice).toEqual({ type: "tool", name: "enregistrer_avis" });
    expect(params.tools).toEqual([OUTIL_ENREGISTRER_AVIS]);
    expect(params).not.toHaveProperty("temperature");
    expect(params.messages[0].content[0]).toEqual({ type: "image", source: { type: "base64", media_type: "image/png", data: PNG.toString("base64") } });
  });

  it("PDF d'une page → bloc document ; modèle qui refuse l'outil imposé → tool_choice auto", async () => {
    const { client, create } = clientSimule(avis);
    await lireAvis({ contenu: Buffer.from("%PDF-1.7"), typeMime: "application/pdf", modele: "claude-opus-5-5", client });
    const params = create.mock.calls[0]![0];
    expect(params.messages[0].content[0].type).toBe("document");
    expect(params.tool_choice).toEqual({ type: "auto" });
  });

  it("page sans avis (verso)", async () => {
    const { client } = clientSimule(verso);
    const r = await lireAvis({ contenu: PNG, typeMime: "image/png", client });
    expect(r.extraction.est_un_avis).toBe(false);
    expect(r.extraction.numero_avis).toBeNull();
  });

  it("refus du modèle ou réponse sans l'outil → ErreurLecture « Lecture impossible »", async () => {
    await expect(lireAvis({ contenu: PNG, typeMime: "image/png", client: clientSimule(refus).client })).rejects.toBeInstanceOf(ErreurLecture);
    const sansOutil = { ...avis, stop_reason: "end_turn", content: [{ type: "text", text: "Je ne peux pas lire ce document." }] };
    await expect(lireAvis({ contenu: PNG, typeMime: "image/png", client: clientSimule(sansOutil).client })).rejects.toThrow(/Lecture impossible/);
  });

  it("valeurs inattendues tolérées (confiance invalide, montant négatif)", async () => {
    const bizarre = { ...avis, content: [{ ...avis.content[0], input: { ...avis.content[0]!.input, montant_forfaitaire: -5, confiance: "?" } }] };
    const r = await lireAvis({ contenu: PNG, typeMime: "image/png", client: clientSimule(bizarre).client });
    expect(r.extraction.montant_forfaitaire).toBeNull();
    expect(r.extraction.confiance).toEqual({});
  });
});
