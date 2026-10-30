// Détail du prix d'une location (sans état : assistant et fiche contrat).
import { formatEuros } from "@/lib/format";
import { UNITE_TYPE_LOCATION } from "@/lib/validations/location";

export type LignesRecap = {
  type: "JOURNALIERE" | "HEBDOMADAIRE" | "MENSUELLE";
  tarifCentimes: number;
  tarifJournalierCentimes: number | null;
  unites: number;
  joursSupplementaires: number;
  joursTotal?: number;
  montantBaseCentimes: number;
  plafondHebdoApplique?: boolean;
  options: { libelle: string; quantite: number; totalCentimes: number }[];
  remiseCentimes: number;
  fraisLivraisonCentimes: number;
  prixTotalCentimes: number;
};

const pluriel = (n: number, [un, plusieurs]: [string, string]) => `${n} ${n > 1 ? plusieurs : un}`;

export function RecapPrix({ r }: { r: LignesRecap }) {
  const unite = UNITE_TYPE_LOCATION[r.type];
  const ligne = (libelle: React.ReactNode, montant: number, classe = "") => (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${classe}`}>
      <dt className="min-w-0">{libelle}</dt>
      <dd className="shrink-0 tabular-nums">{formatEuros(montant)}</dd>
    </div>
  );
  // Détail de la base selon le type
  let detail = `${pluriel(r.unites, unite)} × ${formatEuros(r.tarifCentimes)}`;
  if (r.joursSupplementaires > 0) {
    detail +=
      r.type === "HEBDOMADAIRE"
        ? ` + ${pluriel(r.joursSupplementaires, ["jour", "jours"])} × ${r.tarifJournalierCentimes != null ? formatEuros(r.tarifJournalierCentimes) : "prorata"}`
        : ` + ${pluriel(r.joursSupplementaires, ["jour", "jours"])} au prorata (÷ 30)`;
  }
  return (
    <dl className="divide-y text-sm">
      {ligne(
        <>
          Location
          <span className="block text-xs text-muted-foreground">
            {detail}
            {r.plafondHebdoApplique && " (plafonné au prix d'une semaine de plus)"}
          </span>
        </>,
        r.montantBaseCentimes,
      )}
      {r.options.map((o, i) => ligne(`${o.libelle}${o.quantite > 1 ? ` × ${o.quantite}` : ""}`, o.totalCentimes, i === 0 ? "" : ""))}
      {r.fraisLivraisonCentimes > 0 && ligne("Livraison", r.fraisLivraisonCentimes)}
      {r.remiseCentimes > 0 && ligne("Remise", -r.remiseCentimes, "text-success")}
      {ligne(<span className="font-semibold">Total</span>, r.prixTotalCentimes, "text-base font-semibold")}
    </dl>
  );
}
