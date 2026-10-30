// Données des rapports par période et des relevés investisseurs (page, PDF, Excel).
import { db } from "@/lib/db";
import { masquerIban } from "@/lib/format";
import { LIBELLES_TYPE_VERSEMENT } from "@/lib/validations/finance";
import { LIBELLES_STATUT, nomVehicule } from "@/lib/vehicule";
import { analyserPeriode, bilanVente, chargerAnalyse } from "@/server/requetes/analyse";
import { bilansVehicules, situationPartenaire, versementsSansVehicule } from "@/server/requetes/rentabilite";

const libelleV = (v: { nom: string; immatriculation: string | null }) => `${v.nom}${v.immatriculation ? ` · ${v.immatriculation}` : ""}`;

/** Bilan d'une période (section 4.7). */
export async function donneesRapport(du: string, au: string, partenaireId?: string) {
  const [{ vehicules }, partenaires] = await Promise.all([
    chargerAnalyse(),
    db.partenaire.findMany({ orderBy: [{ type: "asc" }, { nom: "asc" }], select: { id: true, nom: true, actif: true } }),
  ]);
  const partenaire = partenaires.find((p) => p.id === partenaireId) ?? null;
  const a = analyserPeriode(vehicules, du, au, partenaire?.id);
  const noms = new Map(partenaires.map((p) => [p.id, p.nom]));
  return {
    du,
    au,
    partenaire,
    partenaires: partenaires.filter((p) => p.actif),
    totaux: a.totaux,
    achetes: a.achetes
      .map((v) => ({ id: v.id, vehicule: libelleV(v), dateAchat: v.dateAchat, type: v.type, prixAchatCentimes: v.prixAchatCentimes }))
      .sort((x, y) => x.dateAchat.localeCompare(y.dateAchat)),
    vendus: a.vendus
      .map((l) => {
        const b = bilanVente(l.vehicule)!;
        return {
          id: l.vehicule.id,
          vehicule: libelleV(l.vehicule),
          dateVente: l.vehicule.dateVente!,
          prixVenteCentimes: l.vehicule.prixVenteCentimes!,
          coutRevientCentimes: l.vehicule.prixAchatCentimes + l.vehicule.totalDepensesCentimes,
          beneficeCentimes: b.beneficeCentimes,
          margeBp: b.margeBp,
          jours: b.jours,
        };
      })
      .sort((x, y) => x.dateVente.localeCompare(y.dateVente)),
    location: a.lignes
      .filter((l) => l.resultat.revenusLocationCentimes !== 0 || l.resultat.chargesLocationCentimes !== 0)
      .map((l) => ({
        id: l.vehicule.id,
        vehicule: libelleV(l.vehicule),
        revenusCentimes: l.resultat.revenusLocationCentimes,
        chargesCentimes: l.resultat.chargesLocationCentimes,
        resultatCentimes: l.resultat.resultatLocationCentimes,
      }))
      .sort((x, y) => y.resultatCentimes - x.resultatCentimes),
    depensesParCategorie: a.depensesParCategorie,
    parPartenaire: [...a.parPartenaire.entries()]
      .map(([id, montantCentimes]) => ({ id, nom: noms.get(id) ?? "?", montantCentimes }))
      .sort((x, y) => (y.montantCentimes === x.montantCentimes ? x.nom.localeCompare(y.nom) : y.montantCentimes - x.montantCentimes)),
  };
}
export type DonneesRapport = Awaited<ReturnType<typeof donneesRapport>>;

/** Relevé d'un investisseur sur une période : véhicules, résultats et sa part, versements, reste dû. */
export async function donneesReleve(partenaireId: string, du: string, au: string) {
  const partenaire = await db.partenaire.findUnique({ where: { id: partenaireId } });
  if (!partenaire) return null;
  const [{ vehicules }, bilans, versements, sansVehicule] = await Promise.all([
    chargerAnalyse(),
    bilansVehicules({
      OR: [
        { participations: { some: { partenaireId } } },
        { depenses: { some: { payeParId: partenaireId, payeSurRecettes: false } } },
        { partsFixes: { some: { partenaireId } } },
        { versements: { some: { partenaireId } } },
      ],
    }),
    db.versement.findMany({
      where: { partenaireId },
      orderBy: { date: "asc" },
      include: { vehicule: { select: { marque: true, modele: true, version: true, immatriculation: true } } },
    }),
    versementsSansVehicule(partenaireId),
  ]);
  const analyse = analyserPeriode(vehicules, du, au, partenaireId);
  const resultats = new Map(analyse.lignes.map((l) => [l.vehicule.id, l]));
  const lignes = bilans
    .map(({ vehicule, bilan }) => ({ vehicule, bilan, s: situationPartenaire(bilan, partenaireId) }))
    .filter((l) => l.s.concerne && (l.vehicule.statut !== "ARCHIVE" || l.bilan.vendu));
  const enPeriode = (d: Date) => {
    const iso = d.toISOString().slice(0, 10);
    return iso >= du && iso <= au;
  };
  const versementsPeriode = versements.filter((v) => enPeriode(v.date));
  const verseGlobal = sansVehicule.get(partenaireId) ?? 0;
  const enCours = lignes.filter((l) => !l.bilan.vendu);
  const vendus = lignes.filter((l) => l.bilan.vendu);
  const nomV = (v: { marque: string; modele: string; version: string | null; immatriculation: string | null }) => `${nomVehicule(v)}${v.immatriculation ? ` · ${v.immatriculation}` : ""}`;

  return {
    partenaire: { nom: partenaire.nom, telephone: partenaire.telephone, email: partenaire.email, iban: partenaire.iban ? masquerIban(partenaire.iban) : null, estSociete: partenaire.type === "SOCIETE" },
    du,
    au,
    resume: {
      capitalEngageCentimes: enCours.reduce((a, l) => a + l.s.investiCentimes, 0),
      vehiculesEnCours: enCours.length,
      resultatPeriodeCentimes: analyse.totaux.partPartenaireCentimes ?? 0,
      verseSurPeriodeCentimes: versementsPeriode.filter((v) => v.type !== "APPORT_SUPPLEMENTAIRE").reduce((a, v) => a + v.montantCentimes, 0),
      totalVerseCentimes: lignes.reduce((a, l) => a + l.s.verseCentimes, 0) + verseGlobal,
      resteDuCentimes: vendus.reduce((a, l) => a + (l.s.resteDuCentimes ?? 0), 0) - verseGlobal,
    },
    vehicules: lignes.map(({ vehicule, bilan, s }) => {
      const totalInvesti = bilan.investissements.reduce((a, i) => a + i.totalCentimes, 0);
      const r = resultats.get(vehicule.id);
      return {
        vehicule: nomV(vehicule),
        statut: LIBELLES_STATUT[vehicule.statut],
        investiCentimes: s.investiCentimes,
        partBp: s.partBeneficeBp ?? (totalInvesti > 0 ? Math.round((s.investiCentimes / totalInvesti) * 10000) : 0),
        resultatPeriodeCentimes: r?.resultat.totalCentimes ?? 0,
        partPeriodeCentimes: r?.partPartenaireCentimes ?? 0,
      };
    }),
    vendus: vendus.map(({ vehicule, s }) => ({
      vehicule: nomV(vehicule),
      dateVente: vehicule.dateVente,
      aReverserCentimes: s.aReverserCentimes,
      verseCentimes: s.verseCentimes,
      resteDuCentimes: s.resteDuCentimes ?? 0,
    })),
    versements: versementsPeriode.map((v) => ({
      date: v.date,
      type: LIBELLES_TYPE_VERSEMENT[v.type],
      apport: v.type === "APPORT_SUPPLEMENTAIRE",
      vehicule: v.vehicule ? nomV(v.vehicule) : "Sans véhicule",
      montantCentimes: v.montantCentimes,
    })),
  };
}
export type DonneesReleve = NonNullable<Awaited<ReturnType<typeof donneesReleve>>>;
