import { ArrowLeft, ChevronRight, HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Card } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { formatEuros } from "@/lib/format";
import { contratsAEncaisser } from "@/server/requetes/paiements";

export const metadata: Metadata = { title: "Encaisser un paiement" };

export default async function PageNouveauPaiement() {
  const contrats = await contratsAEncaisser();
  return (
    <>
      <Link href="/location/paiements" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Paiements
      </Link>
      <EnTetePage titre="Encaisser un paiement" description="Choisissez la location concernée." />
      {contrats.length === 0 ? (
        <EtatVide icone={HandCoins} titre="Rien à encaisser" description="Toutes les locations sont réglées." />
      ) : (
        <ul className="flex flex-col gap-2">
          {contrats.map((c) => (
            <li key={c.id}>
              <Link href={`/location/contrats/${c.id}?encaisser=1`}>
                <Card className="flex flex-row items-center gap-3 p-4 hover:bg-accent">
                  <span className="min-w-0 flex-1 truncate font-medium">{c.libelle}</span>
                  <span className="text-right">
                    <span className="block text-xs text-muted-foreground">Reste à payer</span>
                    <span className="font-semibold tabular-nums">{formatEuros(c.reste)}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
