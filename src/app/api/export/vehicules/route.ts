// Export CSV de la liste des véhicules (mêmes filtres que la page).
import { genererCsv, montantCsv, reponseCsv } from "@/lib/csv";
import { aujourdhuiISO, formatDate } from "@/lib/format";
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";
import { LIBELLES_STATUT, LIBELLES_TYPE } from "@/lib/vehicule";
import { lireFiltres, listerVehicules } from "@/server/requetes/vehicules";

export async function GET(requete: Request) {
  const u = await utilisateurCourant();
  if (!u || !ROLES_GESTION.includes(u.role)) return new Response("Accès refusé", { status: 403 });

  const params = Object.fromEntries(new URL(requete.url).searchParams.entries());
  const lignes = await listerVehicules(lireFiltres(params));
  const csv = genererCsv(
    ["Marque", "Modèle", "Version", "Immatriculation", "Statut", "Exploitation", "Date d'achat", "Prix d'achat (€)", "Coût de revient (€)", "Prix cible (€)", "Prix de vente (€)", "Marge (€)", "Jours en stock", "Financeurs"],
    lignes.map((v) => [
      v.marque,
      v.modele,
      v.version,
      v.immatriculation,
      LIBELLES_STATUT[v.statut],
      LIBELLES_TYPE[v.typeExploitation],
      formatDate(v.dateAchat),
      montantCsv(v.prixAchatCentimes),
      montantCsv(v.coutDeRevientCentimes),
      montantCsv(v.prixCibleCentimes),
      montantCsv(v.prixVenteCentimes),
      montantCsv(v.margeCentimes),
      v.jours,
      v.financeurs.join(", "),
    ]),
  );
  return reponseCsv(`vehicules-${aujourdhuiISO()}.csv`, csv);
}
