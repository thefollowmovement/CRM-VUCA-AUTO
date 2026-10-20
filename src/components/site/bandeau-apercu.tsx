import { ArrowLeft, Eye } from "lucide-react";

/** Bandeau de l'aperçu depuis le CRM (n'existe pas sur vuca-auto.fr). */
export function BandeauApercu({ enLigne, adressePublique }: { enLigne: boolean; adressePublique: string | null }) {
  return (
    <div className="bg-[#1d1d1f] text-white" data-apercu-seul>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px] md:px-6">
        <a href="/site-web" className="inline-flex min-h-11 items-center gap-1.5 font-semibold">
          <ArrowLeft className="size-4" aria-hidden /> Retour au CRM
        </a>
        <p className="flex items-center gap-1.5 text-white/75">
          <Eye className="size-4 shrink-0" aria-hidden />
          Aperçu visible seulement par vous.{" "}
          {enLigne ? <>Le site est en ligne{adressePublique ? ` sur ${adressePublique.replace(/^https:\/\//, "")}` : ""}.</> : "Le site est en maintenance : les visiteurs voient « Notre site arrive bientôt »."}
        </p>
      </div>
    </div>
  );
}
