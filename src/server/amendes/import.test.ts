// Import des avis : découpage des PDF (sans base), puis traitement complet d'un PV avec
// l'API Claude simulée (avec base). Le test avec base ne tourne que si TEST_DATABASE_URL
// désigne une base de TEST déjà remplie avec la démo (npm run db:seed -- --demo).
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { partiesParis } from "@/lib/dates";
import { decouperPages } from "./decoupage";
import type { Extraction, ResultatLecture } from "./lecture";

describe("découpage des fichiers déposés", () => {
  it("un PDF de 3 pages donne 3 PDF d'une page", async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) doc.addPage([595, 842]).drawText(`Avis ${i + 1}`);
    const pages = await decouperPages(Buffer.from(await doc.save()), "application/pdf");
    expect(pages.map((p) => p.page)).toEqual([1, 2, 3]);
    for (const p of pages) expect((await PDFDocument.load(p.contenu)).getPageCount()).toBe(1);
  });
  it("une image reste une seule page ; un PDF illisible est refusé", async () => {
    expect(await decouperPages(Buffer.from([1, 2, 3]), "image/jpeg")).toHaveLength(1);
    await expect(decouperPages(Buffer.from("pas un pdf"), "application/pdf")).rejects.toThrow("PDF illisible");
  });
});

const URL_TEST = process.env.TEST_DATABASE_URL;

describe.skipIf(!URL_TEST)("traitement d'un PV importé (base de test + Claude simulé)", () => {
  let dossier = "";
  let mod: {
    db: typeof import("@/lib/db").db;
    stockage: typeof import("@/lib/storage").stockage;
    traiterAmende: typeof import("./traitement").traiterAmende;
    ErreurLecture: typeof import("./lecture").ErreurLecture;
  };
  const crees: string[] = [];
  const numero = String(Date.now()).slice(-10);

  beforeAll(async () => {
    dossier = await mkdtemp(path.join(tmpdir(), "vuca-test-amendes-"));
    process.env.DATABASE_URL = URL_TEST;
    process.env.STORAGE_DIR = dossier;
    const [{ db }, { stockage }, { traiterAmende }, { ErreurLecture }] = await Promise.all([import("@/lib/db"), import("@/lib/storage"), import("./traitement"), import("./lecture")]);
    mod = { db, stockage, traiterAmende, ErreurLecture };
  });

  afterAll(async () => {
    if (!mod) return;
    await mod.db.fichier.deleteMany({ where: { amendeId: { in: crees } } });
    await mod.db.amende.updateMany({ where: { id: { in: crees } }, data: { doublonDeId: null } });
    await mod.db.amende.deleteMany({ where: { id: { in: crees } } });
    await mod.db.$disconnect();
    await rm(dossier, { recursive: true, force: true });
  });

  async function pvALire() {
    const a = await mod.db.amende.create({ data: { statut: "A_LIRE", fichierPage: 1 } });
    crees.push(a.id);
    const cle = `tests/${a.id}.png`;
    await mod.stockage.enregistrer(cle, Buffer.from("89504e470d0a1a0a", "hex"));
    await mod.db.fichier.create({ data: { categorie: "AVIS_CONTRAVENTION", cleStockage: cle, nomOriginal: "avis.png", typeMime: "image/png", tailleOctets: 8, amendeId: a.id } });
    return a.id;
  }

  const lecture = (e: Partial<Extraction>) => async (): Promise<ResultatLecture> => {
    const extraction: Extraction = {
      est_un_avis: true, type_avis: "contravention", numero_avis: null, date_avis: null, date_infraction: null, heure_infraction: null, immatriculation: null,
      lieu: null, nature: "Excès de vitesse < 20 km/h", montant_forfaitaire: 68, nom_titulaire: "VUCA AUTO", confiance: {}, remarques: null, ...e,
    };
    return { extraction, brut: extraction, modele: "claude-haiku-5-5", tokensEntree: 1650, tokensSortie: 212 };
  };

  it("avis lu, rattaché à la location, doublon et page sans avis écartés, échec signalé", async () => {
    // Location terminée de la démo : on place l'infraction au milieu.
    const contrat = await mod.db.contratLocation.findFirst({
      where: { statut: "TERMINEE", departReelLe: { not: null }, retourReelLe: { not: null }, vehicule: { immatriculation: { not: null } } },
      orderBy: { departReelLe: "desc" },
      include: { vehicule: { select: { immatriculation: true } } },
    });
    expect(contrat, "la base de test doit contenir la démo").toBeTruthy();
    const milieu = new Date((contrat!.departReelLe!.getTime() + contrat!.retourReelLe!.getTime()) / 2);
    const p = partiesParis(milieu);
    const deux = (n: number) => String(n).padStart(2, "0");
    const jour = `${p.annee}-${deux(p.mois)}-${deux(p.jour)}`;
    const extraction = { numero_avis: numero, date_avis: jour, date_infraction: jour, heure_infraction: `${deux(p.heure)}:${deux(p.minute)}`, immatriculation: contrat!.vehicule.immatriculation };

    const id1 = await pvALire();
    await mod.traiterAmende(id1, { lire: lecture(extraction) });
    const a1 = await mod.db.amende.findUniqueOrThrow({ where: { id: id1 } });
    expect(a1.statut).toBe("A_VALIDER");
    expect(a1.contratId).toBe(contrat!.id);
    expect(a1.clientId).toBe(contrat!.clientId);
    expect(a1.montantCentimes).toBe(6800);
    expect(a1.ocrTokensEntree).toBe(1650);
    expect(a1.dateLimite?.getTime()).toBe(a1.dateAvis!.getTime() + 45 * 86_400_000);
    expect(a1.luLe).not.toBeNull();

    const id2 = await pvALire();
    await mod.traiterAmende(id2, { lire: lecture(extraction) });
    const a2 = await mod.db.amende.findUniqueOrThrow({ where: { id: id2 } });
    expect(a2.statut).toBe("IGNORE");
    expect(a2.doublonDeId).toBe(id1);

    const id3 = await pvALire();
    await mod.traiterAmende(id3, { lire: lecture({ est_un_avis: false }) });
    const a3 = await mod.db.amende.findUniqueOrThrow({ where: { id: id3 } });
    expect(a3.statut).toBe("IGNORE");
    expect(a3.raisonsVerification).toEqual([{ code: "pas_un_avis", texte: "Page sans avis", niveau: "attention" }]);

    const id4 = await pvALire();
    await mod.traiterAmende(id4, {
      lire: async () => {
        throw new mod.ErreurLecture("Lecture impossible : service indisponible", "529");
      },
    });
    const a4 = await mod.db.amende.findUniqueOrThrow({ where: { id: id4 } });
    expect(a4.statut).toBe("A_VALIDER");
    expect((a4.raisonsVerification as { code: string; texte: string }[]).find((r) => r.code === "lecture_impossible")?.texte).toBe("Lecture impossible : service indisponible : saisissez les champs à la main");
  });
});
