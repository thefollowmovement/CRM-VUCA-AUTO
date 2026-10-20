// Export CSV du journal des paiements (mêmes filtres que la page : du, au, mode).
import { genererCsv, montantCsv, reponseCsv } from "@/lib/csv";
import { aujourdhuiISO, formatDate } from "@/lib/format";
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";
import { LIBELLES_MODE_PAIEMENT } from "@/lib/validations/finance";
import { LIBELLES_NATURE_PAIEMENT } from "@/lib/validations/paiement";
import { journalPaiements } from "@/server/requetes/paiements";

export async function GET(requete: Request) {
  const u = await utilisateurCourant();
  if (!u || !ROLES_GESTION.includes(u.role)) return new Response("Accès refusé", { status: 403 });
  const p = new URL(requete.url).searchParams;
  const lignes = await journalPaiements({ du: p.get("du") ?? undefined, au: p.get("au") ?? undefined, mode: p.get("mode") ?? undefined }, undefined);
  const csv = genererCsv(
    ["Date", "Reçu", "Contrat", "Client", "Véhicule", "Objet", "Mode", "Montant (€)", "Référence", "Note"],
    lignes.map((x) => [
      formatDate(x.date),
      x.numeroRecu,
      x.contrat.numero,
      x.client,
      x.vehicule,
      LIBELLES_NATURE_PAIEMENT[x.nature] ?? x.nature,
      LIBELLES_MODE_PAIEMENT[x.mode],
      montantCsv(x.nature === "REMBOURSEMENT" ? -x.montantCentimes : x.montantCentimes),
      x.reference,
      x.note,
    ]),
  );
  return reponseCsv(`paiements-${aujourdhuiISO()}.csv`, csv);
}
