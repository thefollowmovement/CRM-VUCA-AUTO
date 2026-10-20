import { PageProvisoire } from "@/components/site/page-provisoire";
import { lireReglages } from "@/lib/reglages";

// Accueil de vuca-auto.fr (servi sur « / » par le middleware). Provisoire jusqu'à la Phase S3.
// Rendue à la demande (lit les coordonnées dans les réglages) : la construction ne dépend pas de la base.
export const dynamic = "force-dynamic";

export default async function AccueilSite() {
  const r = await lireReglages();
  const telephone = r.societeTelephone?.trim();
  const email = r.societeEmail?.trim();
  return (
    <PageProvisoire titre="Notre site arrive bientôt." texte="Achat et vente de véhicules d'occasion. En attendant, contactez-nous directement.">
      {(telephone || email) && (
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          {telephone && (
            <a href={`tel:${telephone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center rounded-full bg-[var(--site-accent)] px-6 font-medium text-white">
              Appeler le {telephone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center px-4 font-medium text-[var(--site-accent)]">
              {email} ›
            </a>
          )}
        </div>
      )}
      {r.societeSiret && <p className="mt-16 text-sm text-[var(--site-texte-2)]">{r.societeNom} · SIRET {r.societeSiret}</p>}
    </PageProvisoire>
  );
}
