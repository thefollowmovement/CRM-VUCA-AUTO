import { Eye } from "lucide-react";
import Link from "next/link";

/** Bandeau affiché quand l'admin regarde le portail à la place d'un investisseur. */
export function ApercuAdmin({ nom, partenaireId }: { nom: string; partenaireId: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <Eye className="size-4 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        Aperçu administrateur : vous voyez l&apos;espace de <strong>{nom}</strong>, en lecture seule.
      </span>
      <Link href={`/investisseurs/${partenaireId}`} className="font-medium text-primary hover:underline">
        Retour à sa fiche
      </Link>
      <Link href="/portail" className="font-medium text-primary hover:underline">
        Changer
      </Link>
    </div>
  );
}
