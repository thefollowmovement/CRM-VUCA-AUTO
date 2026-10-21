// =====================================================================
//  Retrait des données de démonstration (Réglages → Démonstration).
//
//  Règles de sécurité :
//  - on ne supprime que les fiches reconnues EXACTEMENT comme démo (lib/demo.ts) ;
//  - un client ou un investisseur de démo utilisé par vos vraies données
//    (contrat, participation, dépense, versement, compte portail…) est CONSERVÉ ;
//  - tout se fait dans une seule transaction : soit tout est retiré, soit rien ;
//  - les réglages du site ne sont remis à zéro que s'ils ont encore la valeur de la démo ;
//  - un repère empêche le seed de recharger la démo lors des mises à jour.
// =====================================================================
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { jourParisISO, partiesParis } from "@/lib/dates";
import {
  CLIENTS_DEMO_IDENTITES,
  estClientDemo,
  estInvestisseurDemo,
  estVehiculeDemo,
  horairesDemo,
  INVESTISSEURS_DEMO_IDENTITES,
  maxNumeroAnnuel,
  maxReferenceAnnonce,
  moyensPaiementDemo,
  REGLAGES_SITE_DEMO,
  REPERE_DEMO_RETIREE,
  VEHICULES_DEMO,
} from "@/lib/demo";
import { journaliser } from "@/lib/journal";
import { HORAIRES_VIDES } from "@/lib/site/reglages-defaut";
import { versionRecadrage } from "@/lib/site/photos";
import { stockage, supprimerFichierStocke } from "@/lib/storage";

type Tx = Prisma.TransactionClient;

export type PlanDemo = {
  /** La démo a déjà été retirée (repère posé). */
  retiree: boolean;
  vehicules: { id: string; libelle: string }[];
  clients: { id: string; libelle: string }[];
  investisseurs: { id: string; libelle: string }[];
  /** Fiches de démo gardées car utilisées par vos vraies données (avec la raison). */
  conserves: string[];
  /** Réglages du site qui ont encore la valeur de la démo. */
  reglagesSite: string[];
  nombres: {
    contrats: number;
    paiements: number;
    depenses: number;
    factures: number;
    annonces: number;
    fichiers: number;
    versements: number;
  };
};

const libelleVehicule = (v: { marque: string; modele: string; immatriculation: string | null }) => `${v.marque} ${v.modele} (${v.immatriculation})`;

/** Calcule précisément ce qui serait retiré (sans rien modifier). */
async function planifier(tx: Tx) {
  const retiree = !!(await tx.compteur.findUnique({
    where: { cle: REPERE_DEMO_RETIREE },
  }));

  // 1. Véhicules de démo : immatriculation ET marque/modèle identiques
  const vehicules = (
    await tx.vehicule.findMany({
      where: { immatriculation: { in: Object.keys(VEHICULES_DEMO) } },
      select: { id: true, immatriculation: true, marque: true, modele: true },
      orderBy: { immatriculation: "asc" },
    })
  ).filter(estVehiculeDemo);
  const V = vehicules.map((v) => v.id);
  const contrats = await tx.contratLocation.findMany({
    where: { vehiculeId: { in: V } },
    select: { id: true },
  });
  const C = contrats.map((c) => c.id);
  const horsDemoVehicule = {
    OR: [{ vehiculeId: null }, { vehiculeId: { notIn: V } }],
  };

  // 2. Clients de démo : conservés s'ils servent ailleurs que sur les véhicules de démo
  const clientsTrouves = (
    await tx.client.findMany({
      where: { nom: { in: CLIENTS_DEMO_IDENTITES.map((c) => c.nom) } },
      select: { id: true, nom: true, prenom: true, numeroPermis: true },
    })
  ).filter(estClientDemo);
  const clients: { id: string; libelle: string }[] = [];
  const conserves: string[] = [];
  for (const c of clientsTrouves) {
    const libelle = `${c.prenom ?? ""} ${c.nom}`.trim();
    const utilise =
      (await tx.contratLocation.count({
        where: { clientId: c.id, vehiculeId: { notIn: V } },
      })) +
      (await tx.conducteurAdditionnel.count({
        where: { clientId: c.id, contratId: { notIn: C } },
      })) +
      (await tx.amende.count({
        where: { clientId: c.id, vehiculeId: { notIn: V } },
      })) +
      (await tx.facture.count({
        where: {
          clientId: c.id,
          AND: [{ OR: [{ contratId: null }, { contratId: { notIn: C } }] }, horsDemoVehicule],
        },
      }));
    if (utilise) conserves.push(`Client ${libelle} : conservé, utilisé par vos locations ou factures.`);
    else clients.push({ id: c.id, libelle });
  }

  // 3. Investisseurs de démo : conservés s'ils financent un vrai véhicule, ont un versement hors démo ou un compte
  const partenairesTrouves = (
    await tx.partenaire.findMany({
      where: { nom: { in: INVESTISSEURS_DEMO_IDENTITES.map((p) => p.nom) } },
      select: {
        id: true,
        nom: true,
        email: true,
        type: true,
        estSysteme: true,
      },
    })
  ).filter(estInvestisseurDemo);
  const investisseurs: { id: string; libelle: string }[] = [];
  for (const p of partenairesTrouves) {
    const utilise =
      (await tx.participation.count({
        where: { partenaireId: p.id, vehiculeId: { notIn: V } },
      })) +
      (await tx.partBeneficeFixe.count({
        where: { partenaireId: p.id, vehiculeId: { notIn: V } },
      })) +
      (await tx.depense.count({
        where: { payeParId: p.id, vehiculeId: { notIn: V } },
      })) +
      (await tx.versement.count({
        where: { partenaireId: p.id, ...horsDemoVehicule },
      })) +
      (await tx.utilisateur.count({ where: { partenaireId: p.id } }));
    if (utilise) conserves.push(`Investisseur ${p.nom} : conservé, utilisé par vos véhicules, versements ou un compte du portail.`);
    else investisseurs.push({ id: p.id, libelle: p.nom });
  }
  const Cl = clients.map((c) => c.id);

  // 4. Fichiers qui disparaîtront (photos, justificatifs, signatures…) : supprimés aussi du disque
  const edls = await tx.etatDesLieux.findMany({
    where: { contratId: { in: C } },
    select: { id: true, signatureClientId: true, signatureLoueurId: true },
  });
  const signatures = edls.flatMap((e) => [e.signatureClientId, e.signatureLoueurId]).filter((x): x is string => !!x);
  const fichiers = await tx.fichier.findMany({
    where: {
      OR: [
        { vehiculeId: { in: V } },
        { depense: { vehiculeId: { in: V } } },
        { contratId: { in: C } },
        { etatDesLieuxId: { in: edls.map((e) => e.id) } },
        { dommage: { vehiculeId: { in: V } } },
        { sinistre: { vehiculeId: { in: V } } },
        { amende: { vehiculeId: { in: V } } },
        { clientId: { in: Cl } },
        { id: { in: signatures } },
      ],
    },
    select: { id: true, cleStockage: true, recadrage: true },
  });

  // 5. Réglages du site encore identiques à la démo
  const rs = await tx.reglagesSite.findUnique({
    where: { id: 1 },
    select: {
      whatsapp: true,
      delaiReponse: true,
      horaires: true,
      moyensPaiement: true,
    },
  });
  const reglagesSite: string[] = [];
  if (rs?.whatsapp === REGLAGES_SITE_DEMO.whatsapp) reglagesSite.push("Numéro WhatsApp fictif");
  if (rs?.delaiReponse === REGLAGES_SITE_DEMO.delaiReponse) reglagesSite.push("Délai de réponse");
  if (horairesDemo(rs?.horaires)) reglagesSite.push("Horaires d'ouverture");
  if (moyensPaiementDemo(rs?.moyensPaiement)) reglagesSite.push("Moyens de paiement");

  const [paiements, depenses, factures, annonces, versements] = await Promise.all([
    tx.paiement.count({ where: { contratId: { in: C } } }),
    tx.depense.count({ where: { vehiculeId: { in: V } } }),
    tx.facture.count({
      where: { OR: [{ contratId: { in: C } }, { vehiculeId: { in: V } }] },
    }),
    tx.annonce.count({ where: { vehiculeId: { in: V } } }),
    tx.versement.count({
      where: {
        OR: [{ vehiculeId: { in: V } }, { partenaireId: { in: investisseurs.map((p) => p.id) } }],
      },
    }),
  ]);

  return {
    plan: {
      retiree,
      vehicules: vehicules.map((v) => ({
        id: v.id,
        libelle: libelleVehicule(v),
      })),
      clients,
      investisseurs,
      conserves,
      reglagesSite,
      nombres: {
        contrats: C.length,
        paiements,
        depenses,
        factures,
        annonces,
        fichiers: fichiers.length,
        versements,
      },
    } satisfies PlanDemo,
    V,
    C,
    Cl,
    P: investisseurs.map((p) => p.id),
    fichiers,
  };
}

/** Aperçu de ce que le retrait supprimerait. */
export async function analyserDemo(): Promise<PlanDemo> {
  return (await planifier(db)).plan;
}

/** Remet un compteur annuel (« contrat:2026 »…) sur le plus grand numéro restant. */
async function recalerCompteursAnnuels(tx: Tx, prefixe: "contrat" | "recu" | "facture", numeros: (string | null)[]) {
  const compteurs = await tx.compteur.findMany({
    where: { cle: { startsWith: `${prefixe}:` } },
  });
  for (const c of compteurs) {
    const annee = Number(c.cle.split(":")[1]);
    if (Number.isInteger(annee))
      await tx.compteur.update({
        where: { cle: c.cle },
        data: { valeur: maxNumeroAnnuel(numeros, annee) },
      });
  }
}

/** Retire la démo. Renvoie le résumé de ce qui a été supprimé. */
export async function retirerDemo(utilisateurId: string): Promise<PlanDemo> {
  const { plan, fichiersSupprimes } = await db.$transaction(
    async (tx) => {
      const { plan, V, C, Cl, P, fichiers } = await planifier(tx);

      // Jour des dernières statistiques fictives (la démo du site les crée jusqu'au jour de son chargement)
      const derniereAnnonce = await tx.annonce.findFirst({
        where: { vehiculeId: { in: V } },
        orderBy: { creeLe: "desc" },
        select: { creeLe: true },
      });

      // Ordre imposé par les liens entre tables (le reste suit par suppression en cascade)
      await tx.facture.deleteMany({
        where: { OR: [{ contratId: { in: C } }, { vehiculeId: { in: V } }] },
      });
      await tx.paiement.deleteMany({ where: { contratId: { in: C } } });
      await tx.amende.deleteMany({ where: { vehiculeId: { in: V } } });
      await tx.sinistre.deleteMany({ where: { vehiculeId: { in: V } } });
      await tx.fichier.deleteMany({
        where: { id: { in: fichiers.map((f) => f.id) } },
      });
      await tx.contratLocation.deleteMany({ where: { id: { in: C } } });
      await tx.depense.deleteMany({ where: { vehiculeId: { in: V } } });
      await tx.versement.deleteMany({
        where: { OR: [{ vehiculeId: { in: V } }, { partenaireId: { in: P } }] },
      });
      await tx.vehicule.deleteMany({ where: { id: { in: V } } }); // historique, participations, dommages, annonces…
      await tx.client.deleteMany({ where: { id: { in: Cl } } });
      await tx.partenaire.deleteMany({ where: { id: { in: P } } });

      // Visites fictives du site (les vraies ne sont comptées qu'une fois le site en ligne, après la démo)
      if (derniereAnnonce) {
        await tx.statistiqueSite.deleteMany({
          where: {
            type: "VUE_SITE",
            jour: {
              lte: new Date(`${jourParisISO(derniereAnnonce.creeLe)}T00:00:00Z`),
            },
          },
        });
      }

      // Réglages du site restés sur les valeurs de la démo
      const rs = await tx.reglagesSite.findUnique({
        where: { id: 1 },
        select: {
          whatsapp: true,
          delaiReponse: true,
          horaires: true,
          moyensPaiement: true,
        },
      });
      if (rs) {
        await tx.reglagesSite.update({
          where: { id: 1 },
          data: {
            ...(rs.whatsapp === REGLAGES_SITE_DEMO.whatsapp && {
              whatsapp: null,
            }),
            ...(rs.delaiReponse === REGLAGES_SITE_DEMO.delaiReponse && {
              delaiReponse: null,
            }),
            ...(horairesDemo(rs.horaires) && { horaires: HORAIRES_VIDES }),
            ...(moyensPaiementDemo(rs.moyensPaiement) && {
              moyensPaiement: [],
            }),
          },
        });
      }

      // Numérotation : la suite part du plus grand numéro restant (pas de doublon, pas de trou inutile)
      const [restContrats, restRecus, restFactures, restAnnonces] = await Promise.all([
        tx.contratLocation.findMany({ select: { numero: true } }),
        tx.paiement.findMany({
          where: { numeroRecu: { not: null } },
          select: { numeroRecu: true },
        }),
        tx.facture.findMany({ select: { numero: true } }),
        tx.annonce.findMany({ select: { reference: true } }),
      ]);
      await recalerCompteursAnnuels(
        tx,
        "contrat",
        restContrats.map((c) => c.numero),
      );
      await recalerCompteursAnnuels(
        tx,
        "recu",
        restRecus.map((p) => p.numeroRecu),
      );
      await recalerCompteursAnnuels(
        tx,
        "facture",
        restFactures.map((f) => f.numero),
      );
      await tx.compteur.updateMany({
        where: { cle: "annonce" },
        data: {
          valeur: maxReferenceAnnonce(restAnnonces.map((a) => a.reference)),
        },
      });

      // Repère : le seed ne rechargera plus jamais la démo
      await tx.compteur.upsert({
        where: { cle: REPERE_DEMO_RETIREE },
        create: {
          cle: REPERE_DEMO_RETIREE,
          valeur: partiesParis(new Date()).annee,
        },
        update: {},
      });

      await journaliser(
        {
          utilisateurId,
          action: "SUPPRESSION",
          entite: "Démonstration",
          apres: {
            vehicules: plan.vehicules.map((v) => v.libelle),
            clients: plan.clients.map((c) => c.libelle),
            investisseurs: plan.investisseurs.map((p) => p.libelle),
            ...plan.nombres,
            conserves: plan.conserves,
          },
        },
        tx,
      );
      return { plan, fichiersSupprimes: fichiers };
    },
    { timeout: 120_000 },
  );

  // Fichiers sur le disque (hors transaction ; une erreur ici ne laisse que des fichiers orphelins inoffensifs)
  for (const f of fichiersSupprimes) {
    await supprimerFichierStocke(f.cleStockage).catch(() => {});
    // Copies publiques en cache (route /photos du site) : toutes les tailles et formats possibles
    const version = versionRecadrage(f.recadrage);
    for (const largeur of [400, 640, 960, 1280, 1600]) {
      for (const format of ["avif", "webp", "jpeg", "png"]) await stockage.supprimer(`site-public/${f.id}-${largeur}-${version}.${format}`).catch(() => {});
    }
  }
  return { ...plan, retiree: true };
}
