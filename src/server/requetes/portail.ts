// Portail investisseur (lecture seule) : uniquement SES véhicules et SES chiffres.
// Les noms des autres financeurs ne sont jamais transmis.
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { UtilisateurCourant } from "@/lib/permissions";
import { nomVehicule } from "@/lib/vehicule";
import { occupationVehicule } from "@/server/requetes/contrats";
import { bilansVehicules, situationPartenaire, versementsSansVehicule } from "@/server/requetes/rentabilite";

/**
 * Partenaire affiché : celui du compte investisseur, ou celui choisi par l'admin
 * (`?partenaire=`) pour vérifier ce que voit un investisseur. null = admin sans choix.
 */
export async function partenairePortail(u: UtilisateurCourant, demande?: string) {
  if (u.role === "INVESTISSEUR_LECTURE") {
    if (!u.partenaireId) return { partenaire: null, compteNonRelie: true as const };
    const p = await db.partenaire.findUnique({ where: { id: u.partenaireId }, select: { id: true, nom: true, type: true } });
    return { partenaire: p, compteNonRelie: !p };
  }
  if (u.role !== "ADMIN") redirect("/dashboard");
  if (!demande) return { partenaire: null, compteNonRelie: false as const };
  const p = await db.partenaire.findUnique({ where: { id: demande }, select: { id: true, nom: true, type: true } });
  return { partenaire: p, compteNonRelie: false as const };
}

const filtreVehicules = (partenaireId: string) => ({
  OR: [
    { participations: { some: { partenaireId } } },
    { depenses: { some: { payeParId: partenaireId, payeSurRecettes: false } } },
    { partsFixes: { some: { partenaireId } } },
    { versements: { some: { partenaireId } } },
  ],
});

/** Tableau de bord de l'investisseur : indicateurs, véhicules, versements. */
export async function donneesPortail(partenaireId: string) {
  const [bilans, versements, sansVehicule, photos] = await Promise.all([
    bilansVehicules(filtreVehicules(partenaireId)),
    db.versement.findMany({
      where: { partenaireId },
      orderBy: [{ date: "desc" }, { creeLe: "desc" }],
      include: { vehicule: { select: { marque: true, modele: true, version: true, immatriculation: true } } },
    }),
    versementsSansVehicule(partenaireId),
    db.fichier.findMany({ where: { categorie: "PHOTO_VEHICULE", estPrincipale: true, vehicule: filtreVehicules(partenaireId) }, select: { id: true, vehiculeId: true } }),
  ]);
  const photo = new Map(photos.map((p) => [p.vehiculeId, p.id]));
  const lignes = bilans
    .map(({ vehicule, bilan }) => ({ vehicule, bilan, s: situationPartenaire(bilan, partenaireId) }))
    .filter((l) => l.s.concerne && (l.vehicule.statut !== "ARCHIVE" || l.bilan.vendu));
  const enCours = lignes.filter((l) => !l.bilan.vendu);
  const vendus = lignes.filter((l) => l.bilan.vendu);
  const verseGlobal = sansVehicule.get(partenaireId) ?? 0;
  const somme = (ls: typeof lignes, f: (l: (typeof lignes)[number]) => number) => ls.reduce((a, l) => a + f(l), 0);
  return {
    indicateurs: {
      capitalEngageCentimes: somme(enCours, (l) => l.s.investiCentimes),
      vehiculesEnCours: enCours.length,
      beneficePrevisionnelCentimes: somme(enCours, (l) => l.s.beneficeCentimes ?? 0),
      beneficesRealisesCentimes: somme(vendus, (l) => l.s.beneficeCentimes ?? 0),
      vehiculesVendus: vendus.length,
      totalVerseCentimes: somme(lignes, (l) => l.s.verseCentimes) + verseGlobal,
      resteDuCentimes: somme(vendus, (l) => l.s.resteDuCentimes ?? 0) - verseGlobal,
    },
    vehicules: lignes.map(({ vehicule, bilan, s }) => ({
      id: vehicule.id,
      nom: nomVehicule(vehicule),
      immatriculation: vehicule.immatriculation,
      statut: vehicule.statut,
      vendu: bilan.vendu,
      previsionnel: bilan.rentabilite.previsionnel,
      photoId: photo.get(vehicule.id) ?? null,
      investiCentimes: s.investiCentimes,
      partBp: s.partBeneficeBp,
      beneficeCentimes: s.beneficeCentimes,
      aReverserCentimes: s.aReverserCentimes,
      verseCentimes: s.verseCentimes,
      resteDuCentimes: s.resteDuCentimes,
    })),
    versements: versements.map((v) => ({
      id: v.id,
      date: v.date,
      type: v.type,
      montantCentimes: v.montantCentimes,
      vehicule: v.vehicule ? `${nomVehicule(v.vehicule)}${v.vehicule.immatriculation ? ` · ${v.vehicule.immatriculation}` : ""}` : null,
    })),
  };
}

/** Fiche d'un véhicule vue par l'investisseur (null si ce n'est pas un de ses véhicules). */
export async function vehiculePortail(partenaireId: string, vehiculeId: string) {
  const v = await db.vehicule.findFirst({
    where: { id: vehiculeId, ...filtreVehicules(partenaireId) },
    select: {
      id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true, typeExploitation: true, annee: true, carburant: true,
      kilometrageActuel: true, dateAchat: true, dateVente: true, prixAchatCentimes: true, prixVenteCentimes: true,
      fichiers: { where: { categorie: "PHOTO_VEHICULE" }, orderBy: [{ estPrincipale: "desc" }, { ordre: "asc" }], select: { id: true } },
      depenses: { select: { montantCentimes: true, categorie: { select: { nom: true } } } },
      versements: { where: { partenaireId }, orderBy: { date: "desc" }, select: { id: true, date: true, type: true, montantCentimes: true } },
    },
  });
  if (!v) return null;
  const [bilans, occupation] = await Promise.all([
    bilansVehicules({ id: vehiculeId }),
    v.typeExploitation !== "ACHAT_REVENTE" ? occupationVehicule(vehiculeId) : Promise.resolve(null),
  ]);
  const bilan = bilans[0]!.bilan;
  const categories = new Map<string, number>();
  for (const d of v.depenses) categories.set(d.categorie.nom, (categories.get(d.categorie.nom) ?? 0) + d.montantCentimes);
  return {
    vehicule: v,
    nom: nomVehicule(v),
    rentabilite: bilan.rentabilite,
    vendu: bilan.vendu,
    depensesParCategorie: [...categories.entries()].map(([categorie, montantCentimes]) => ({ categorie, montantCentimes })).sort((a, b) => b.montantCentimes - a.montantCentimes),
    situation: situationPartenaire(bilan, partenaireId),
    commissionBp: bilan.parametres.commissionBp,
    occupation,
  };
}
