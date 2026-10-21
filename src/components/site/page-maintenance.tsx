import { Phone } from "lucide-react";
import type { ReglagesPublics } from "@/lib/site/reglages-publics";
import { Bouton } from "./bouton";
import { Logo, type LogoSite } from "./logo";
import { SceneRoute } from "./scene-route";

/** Site en maintenance (réglage « Site en ligne » désactivé) : grand titre, voiture qui roule, moyens de contact. */
export function PageMaintenance({ r, logo, lienWhatsApp }: { r: ReglagesPublics; logo: LogoSite; lienWhatsApp: string | null }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[1100px] flex-col justify-center gap-8 overflow-x-clip px-4 py-12 md:px-6">
      <div className="s-lumiere pointer-events-none absolute left-1/2 top-[-200px] h-[600px] w-[900px] max-w-[200vw] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--site-accent)_14%,transparent),transparent)]" aria-hidden />
      <Logo logo={logo} className="relative" />
      <h1 className="s-geant relative">
        <span className="s-monte block">Notre site</span>
        <span className="s-monte block text-site-accent [animation-delay:120ms]">arrive bientôt.</span>
      </h1>
      <p className="s-intro s-monte relative max-w-[560px] [animation-delay:240ms]">Achat et vente de véhicules d&apos;occasion. En attendant, contactez-nous directement.</p>
      <div className="s-monte relative flex flex-col gap-3 [animation-delay:320ms] sm:flex-row sm:flex-wrap">
        {lienWhatsApp && (
          <Bouton href={lienWhatsApp} externe variante="whatsapp" taille="grand" className="s-onde">
            Écrire sur WhatsApp
          </Bouton>
        )}
        {r.telephone && (
          <Bouton href={`tel:${r.telephone.replace(/[^\d+]/g, "")}`} variante={lienWhatsApp ? "contour" : "principal"} taille="grand">
            <Phone strokeWidth={1.75} aria-hidden /> Appeler le <span className="s-chiffres">{r.telephone}</span>
          </Bouton>
        )}
        {r.email && (
          <Bouton href={`mailto:${r.email}`} variante="secondaire">
            {r.email}
          </Bouton>
        )}
      </div>
      <SceneRoute compacte className="relative" />
      {r.siret && (
        <p className="s-petit relative text-site-2">
          {r.nom} · SIRET <span className="s-chiffres">{r.siret}</span>
        </p>
      )}
    </main>
  );
}
