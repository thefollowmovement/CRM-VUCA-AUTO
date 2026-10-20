import { Phone } from "lucide-react";
import type { ReglagesPublics } from "@/lib/site/reglages-publics";
import { Bouton } from "./bouton";
import { Logo, type LogoSite } from "./logo";

/** Site en maintenance (réglage « Site en ligne » désactivé) : page sobre avec les moyens de contact. */
export function PageMaintenance({ r, logo, lienWhatsApp }: { r: ReglagesPublics; logo: LogoSite; lienWhatsApp: string | null }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <Logo logo={logo} className="mb-10" />
      <h1 className="s-titre-1">Notre site arrive bientôt.</h1>
      <p className="s-intro mt-4">Achat et vente de véhicules d&apos;occasion. En attendant, contactez-nous directement.</p>
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        {lienWhatsApp && (
          <Bouton href={lienWhatsApp} externe variante="whatsapp">
            Écrire sur WhatsApp
          </Bouton>
        )}
        {r.telephone && (
          <Bouton href={`tel:${r.telephone.replace(/[^\d+]/g, "")}`} variante={lienWhatsApp ? "contour" : "principal"}>
            <Phone strokeWidth={1.5} aria-hidden /> Appeler le <span className="s-chiffres">{r.telephone}</span>
          </Bouton>
        )}
        {r.email && (
          <Bouton href={`mailto:${r.email}`} variante="secondaire">
            {r.email}
          </Bouton>
        )}
      </div>
      {r.siret && (
        <p className="s-petit mt-16 text-site-2">
          {r.nom} · SIRET <span className="s-chiffres">{r.siret}</span>
        </p>
      )}
    </main>
  );
}
