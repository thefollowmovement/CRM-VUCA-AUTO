// Alertes « à traiter » du dashboard (section 6). Chaque alerte renvoie vers la liste filtrée.
import { etatEcheanceDate, etatEcheanceKm, plusUrgent } from "@/lib/calculs/echeances";
import { joursEnStock } from "@/lib/calculs/vehicule";
import { db } from "@/lib/db";
import { jourParisISO } from "@/lib/dates";
import { formatEuros } from "@/lib/format";
import { lireReglages } from "@/lib/reglages";
import { nomVehicule } from "@/lib/vehicule";
import { impayes } from "@/server/requetes/paiements";

export type Alerte = {
  cle: string;
  titre: string;
  nombre: number;
  niveau: "danger" | "attention";
  href: string;
  /** Quelques exemples (noms), pour aider à décider sans cliquer. */
  exemples: string[];
};

const nomContrat = (c: { numero: string; client: { nom: string; prenom: string | null } }) => `${c.numero} · ${[c.client.prenom, c.client.nom].filter(Boolean).join(" ")}`;

/** Véhicules à surveiller (stock ancien, entretien, financement) : utilisé aussi par le filtre de la liste des véhicules. */
export async function vehiculesEnAlerte() {
  const reglages = await lireReglages();
  const auj = new Date();
  const vehicules = await db.vehicule.findMany({
    where: { statut: { notIn: ["VENDU", "ARCHIVE"] } },
    select: {
      id: true, marque: true, modele: true, version: true, immatriculation: true, typeExploitation: true, dateAchat: true, prixAchatCentimes: true, kilometrageActuel: true,
      ecartFinancementAccepte: true, dateProchainControleTechnique: true, dateEcheanceAssurance: true,
      dateProchaineVidange: true, kmProchaineVidange: true, dateProchaineRevision: true, kmProchaineRevision: true,
      participations: { select: { montantCentimes: true } },
    },
  });
  const seuilJ = reglages.joursAvantEcheanceAlerte;
  const seuilKm = reglages.kmAvantVidangeAlerte;
  const urgent = (n: string) => n === "depassee" || n === "proche";
  const stockAncien: typeof vehicules = [];
  const ctAssurance: typeof vehicules = [];
  const entretien: typeof vehicules = [];
  const financement: typeof vehicules = [];
  for (const v of vehicules) {
    // Stock ancien : véhicules à vendre (la flotte de location reste longtemps, c'est normal)
    if (v.typeExploitation !== "LOCATION" && joursEnStock(v.dateAchat, null, auj) > reglages.joursStockAlerte) stockAncien.push(v);
    if (urgent(etatEcheanceDate(v.dateProchainControleTechnique, auj, seuilJ).niveau) || urgent(etatEcheanceDate(v.dateEcheanceAssurance, auj, seuilJ).niveau)) ctAssurance.push(v);
    const vidange = plusUrgent(etatEcheanceDate(v.dateProchaineVidange, auj, seuilJ), etatEcheanceKm(v.kmProchaineVidange, v.kilometrageActuel, seuilKm));
    const revision = plusUrgent(etatEcheanceDate(v.dateProchaineRevision, auj, seuilJ), etatEcheanceKm(v.kmProchaineRevision, v.kilometrageActuel, seuilKm));
    if (urgent(vidange.niveau) || urgent(revision.niveau)) entretien.push(v);
    const finance = v.participations.reduce((a, p) => a + p.montantCentimes, 0);
    if (finance !== v.prixAchatCentimes && !v.ecartFinancementAccepte) financement.push(v);
  }
  return { stockAncien, ctAssurance, entretien, financement, joursStock: reglages.joursStockAlerte };
}

export async function alertesDashboard(): Promise<Alerte[]> {
  const maintenant = new Date();
  const demain = new Date(maintenant.getTime() + 2 * 86_400_000);
  const aujISO = jourParisISO(maintenant);
  const [vehicules, enRetard, retours, retards, clientsPermis, pv] = await Promise.all([
    vehiculesEnAlerte(),
    db.contratLocation.findMany({
      where: { archiveLe: null, statut: "EN_COURS", retourPrevuLe: { lt: maintenant } },
      select: { numero: true, client: { select: { nom: true, prenom: true } } },
      orderBy: { retourPrevuLe: "asc" },
    }),
    db.contratLocation.findMany({
      where: { archiveLe: null, statut: "EN_COURS", retourPrevuLe: { gte: maintenant, lt: demain } },
      select: { numero: true, retourPrevuLe: true, client: { select: { nom: true, prenom: true } } },
      orderBy: { retourPrevuLe: "asc" },
    }),
    impayes(),
    db.client.findMany({
      where: { archiveLe: null, anonymiseLe: null, dateValiditePermis: { lt: new Date(`${aujISO}T00:00:00Z`) } },
      select: { nom: true, prenom: true },
    }),
    db.amende.findMany({ where: { statut: "RECUE" }, select: { montantCentimes: true, vehicule: { select: { immatriculation: true } } } }),
  ]);
  // Retours du jour et du lendemain (jour de Paris)
  const jourDemain = jourParisISO(new Date(maintenant.getTime() + 86_400_000));
  const retoursProches = retours.filter((r) => [aujISO, jourDemain].includes(jourParisISO(r.retourPrevuLe)));
  const nomV = (v: { marque: string; modele: string; version: string | null; immatriculation: string | null }) => v.immatriculation ?? nomVehicule(v);
  const nbImpayes = retards.echeancesEnRetard.length;

  const alertes: Alerte[] = [
    { cle: "retards", titre: "Locations en retard", nombre: enRetard.length, niveau: "danger", href: "/location/contrats?statut=EN_RETARD", exemples: enRetard.map(nomContrat) },
    {
      cle: "impayes",
      titre: nbImpayes ? `Échéances impayées (${formatEuros(retards.totalEnRetard)})` : "Échéances impayées",
      nombre: nbImpayes,
      niveau: "danger",
      href: "/location/impayes",
      exemples: retards.echeancesEnRetard.map((e) => `${e.client} · ${formatEuros(e.reste)}`),
    },
    { cle: "retours", titre: "Retours aujourd'hui / demain", nombre: retoursProches.length, niveau: "attention", href: "/location", exemples: retoursProches.map(nomContrat) },
    { cle: "ct", titre: "CT ou assurance à renouveler", nombre: vehicules.ctAssurance.length, niveau: "danger", href: "/vehicules?alerte=ct", exemples: vehicules.ctAssurance.map(nomV) },
    { cle: "entretien", titre: "Vidange ou révision proche", nombre: vehicules.entretien.length, niveau: "attention", href: "/vehicules?alerte=entretien", exemples: vehicules.entretien.map(nomV) },
    {
      cle: "stock",
      titre: `En stock depuis plus de ${vehicules.joursStock} jours`,
      nombre: vehicules.stockAncien.length,
      niveau: "attention",
      href: "/vehicules?alerte=stock",
      exemples: vehicules.stockAncien.map(nomV),
    },
    { cle: "financement", titre: "Participations ≠ prix d'achat", nombre: vehicules.financement.length, niveau: "attention", href: "/vehicules?alerte=financement", exemples: vehicules.financement.map(nomV) },
    { cle: "permis", titre: "Permis client expiré", nombre: clientsPermis.length, niveau: "attention", href: "/clients?filtre=permis-expire", exemples: clientsPermis.map((c) => [c.prenom, c.nom].filter(Boolean).join(" ")) },
    { cle: "pv", titre: "PV non traités", nombre: pv.length, niveau: "danger", href: "/location/amendes?statut=RECUE", exemples: pv.map((a) => `${a.vehicule.immatriculation ?? "?"} · ${formatEuros(a.montantCentimes)}`) },
  ];
  return alertes.filter((a) => a.nombre > 0).map((a) => ({ ...a, exemples: a.exemples.slice(0, 3) }));
}
