// Export CSV des dépenses (mêmes filtres que la page).
import { genererCsv, montantCsv, reponseCsv } from "@/lib/csv";
import { aujourdhuiISO, formatDate } from "@/lib/format";
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";
import { lireFiltresDepenses, listerDepenses } from "@/server/requetes/depenses";

export async function GET(requete: Request) {
  const u = await utilisateurCourant();
  if (!u || !ROLES_GESTION.includes(u.role)) return new Response("Accès refusé", { status: 403 });

  const params = Object.fromEntries(new URL(requete.url).searchParams.entries());
  const { lignes } = await listerDepenses(lireFiltresDepenses(params));
  const csv = genererCsv(
    ["Date", "Véhicule", "Immatriculation", "Catégorie", "Libellé", "Montant (€)", "Payé par", "Payée sur recettes", "Fournisseur", "Kilométrage", "Justificatifs", "Note"],
    lignes.map((d) => [
      formatDate(d.date),
      d.nomVehicule,
      d.vehicule.immatriculation,
      d.categorie.nom,
      d.libelle,
      montantCsv(d.montantCentimes),
      d.payePar.nom,
      d.payeSurRecettes ? "Oui" : "Non",
      d.fournisseur,
      d.kilometrage,
      d.nbJustificatifs,
      d.note,
    ]),
  );
  return reponseCsv(`depenses-${aujourdhuiISO()}.csv`, csv);
}
