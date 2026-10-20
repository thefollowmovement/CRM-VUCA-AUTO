// Données du dashboard (section 6) pour une période et, éventuellement, un partenaire.
import { derniersMois, resultatPeriode } from "@/lib/calculs/periode";
import { db } from "@/lib/db";
import { aujourdhuiISO } from "@/lib/format";
import { alertesDashboard } from "@/server/requetes/alertes";
import { analyserPeriode, bilanVente, chargerAnalyse, concerne, occupationPeriode } from "@/server/requetes/analyse";
import { impayes } from "@/server/requetes/paiements";
import { resumesPartenaires } from "@/server/requetes/rentabilite";

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export async function donneesDashboard(du: string, au: string, partenaireId?: string) {
  const [{ vehicules: tous }, retards, alertes, resumes, partenaires] = await Promise.all([
    chargerAnalyse(),
    impayes(),
    alertesDashboard(),
    resumesPartenaires(),
    db.partenaire.findMany({ where: { actif: true }, orderBy: [{ type: "asc" }, { nom: "asc" }], select: { id: true, nom: true } }),
  ]);
  const partenaire = partenaires.find((p) => p.id === partenaireId);
  const vehicules = partenaire ? tous.filter((v) => concerne(v, partenaire.id)) : tous;
  const analyse = analyserPeriode(tous, du, au, partenaire?.id);

  // Stock actuel (non vendus, non archivés) et capital immobilisé (coût de revient)
  const stock = vehicules.filter((v) => v.prixVenteCentimes === null && v.statut !== "ARCHIVE");
  const capitalImmobilise = stock.reduce((a, v) => a + v.prixAchatCentimes + v.totalDepensesCentimes, 0);

  // Ventes de la période : marge moyenne et durée moyenne de revente
  const ventes = analyse.vendus.map((l) => bilanVente(l.vehicule)).filter((b) => b !== null);
  const moyenne = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  // Occupation de la flotte de location sur la période
  const occupations = vehicules
    .map((v) => ({ v, o: occupationPeriode(v, du, au) }))
    .filter((x): x is { v: (typeof vehicules)[number]; o: NonNullable<ReturnType<typeof occupationPeriode>> } => x.o !== null && x.o.joursDisponibles > 0);
  const joursLoues = occupations.reduce((a, x) => a + x.o.joursLoues, 0);
  const joursDispo = occupations.reduce((a, x) => a + x.o.joursDisponibles, 0);

  // 12 derniers mois : ventes vs location (périmètre du filtre partenaire)
  const mensuel = derniersMois(aujourdhuiISO(), 12).map((m) => {
    let ventesMois = 0;
    let location = 0;
    for (const v of vehicules) {
      const r = resultatPeriode(v.periode, m.du, m.au);
      ventesMois += r.beneficeVenteCentimes;
      location += r.resultatLocationCentimes;
    }
    const [a, mm] = m.cle.split("-").map(Number) as [number, number];
    return { cle: m.cle, libelle: `${MOIS_COURTS[mm - 1]} ${String(a).slice(2)}`, ventes: ventesMois, location };
  });

  const classement = analyse.lignes
    .filter((l) => l.resultat.totalCentimes !== 0)
    .map((l) => ({ id: l.vehicule.id, nom: l.vehicule.nom, immatriculation: l.vehicule.immatriculation, montantCentimes: l.resultat.totalCentimes }))
    .sort((a, b) => b.montantCentimes - a.montantCentimes);

  const noms = new Map(partenaires.map((p) => [p.id, p.nom]));
  const capitalParPartenaire = [...resumes.entries()]
    .filter(([, r]) => r.capitalEngageCentimes > 0)
    .map(([id, r]) => ({ libelle: noms.get(id) ?? "Partenaire archivé", montantCentimes: r.capitalEngageCentimes }))
    .sort((a, b) => b.montantCentimes - a.montantCentimes);

  return {
    partenaires,
    partenaire: partenaire ?? null,
    totaux: analyse.totaux,
    nbVendus: analyse.vendus.length,
    nbStock: stock.length,
    capitalImmobiliseCentimes: capitalImmobilise,
    margeMoyenneCentimes: moyenne(ventes.map((b) => b.beneficeCentimes)),
    margeMoyenneBp: moyenne(ventes.map((b) => b.margeBp).filter((x) => x !== null)),
    dureeMoyenneJours: moyenne(ventes.map((b) => b.jours)),
    occupation: { joursLoues, joursDisponibles: joursDispo, tauxBp: joursDispo > 0 ? Math.round((joursLoues / joursDispo) * 10000) : null },
    occupationParVehicule: occupations
      .map((x) => ({ id: x.v.id, nom: x.v.nom, immatriculation: x.v.immatriculation, tauxBp: x.o.tauxBp ?? 0, joursLoues: x.o.joursLoues, joursDisponibles: x.o.joursDisponibles }))
      .sort((a, b) => b.tauxBp - a.tauxBp),
    loues: vehicules.filter((v) => v.statut === "EN_LOCATION").length,
    disponibles: vehicules.filter((v) => v.statut === "DISPONIBLE_LOCATION").length,
    impayes: { montantCentimes: retards.totalEnRetard, nombre: retards.echeancesEnRetard.length },
    mensuel,
    depensesParCategorie: analyse.depensesParCategorie.map((d) => ({ libelle: d.categorie, montantCentimes: d.montantCentimes })),
    top: classement.filter((c) => c.montantCentimes > 0).slice(0, 5),
    // Les 5 moins rentables (le pire d'abord), sans reprendre ceux du top
    flop: classement.slice(-5).reverse().filter((c) => !classement.slice(0, 5).some((t) => t.id === c.id && t.montantCentimes > 0)),
    capitalParPartenaire,
    alertes,
  };
}
