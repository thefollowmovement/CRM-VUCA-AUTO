import { Download, HandCoins, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BoutonPdf } from "@/components/documents/bouton-pdf";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { FiltresPaiements } from "@/components/paiements/filtres-paiements";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { formatDate, formatEuros } from "@/lib/format";
import { LIBELLES_MODE_PAIEMENT } from "@/lib/validations/finance";
import { LIBELLES_NATURE_PAIEMENT } from "@/lib/validations/paiement";
import { journalPaiements } from "@/server/requetes/paiements";

export const metadata: Metadata = { title: "Paiements" };

export default async function PagePaiements({ searchParams }: { searchParams: Promise<{ du?: string; au?: string; mode?: string }> }) {
  const sp = await searchParams;
  const paiements = await journalPaiements(sp);
  const signe = (p: { nature: string; montantCentimes: number }) => (p.nature === "REMBOURSEMENT" ? -p.montantCentimes : p.montantCentimes);
  const total = paiements.reduce((a, p) => a + signe(p), 0);
  const parMode = new Map<string, number>();
  for (const p of paiements) parMode.set(p.mode, (parMode.get(p.mode) ?? 0) + signe(p));
  return (
    <>
      <EnTetePage
        titre="Paiements"
        description="Tous les encaissements (loyers, frais, cautions retenues) et remboursements."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/export/paiements?${new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString()}`}>
                <Download /> Export CSV
              </a>
            </Button>
            <Button asChild>
              <Link href="/location/paiements/nouveau">
                <Plus /> Encaisser
              </Link>
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-4">
        <FiltresPaiements />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total encaissé</p>
            <p className="text-lg font-semibold tabular-nums">{formatEuros(total)}</p>
            <p className="text-xs text-muted-foreground">{paiements.length} opération(s)</p>
          </Card>
          {[...parMode.entries()].map(([m, v]) => (
            <Card key={m} className="p-4">
              <p className="text-xs text-muted-foreground">{LIBELLES_MODE_PAIEMENT[m as keyof typeof LIBELLES_MODE_PAIEMENT]}</p>
              <p className="text-lg font-semibold tabular-nums">{formatEuros(v)}</p>
            </Card>
          ))}
        </div>
        {paiements.length === 0 ? (
          <EtatVide icone={HandCoins} titre="Aucun paiement" description="Les encaissements saisis sur les contrats apparaissent ici." />
        ) : (
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <ul className="flex flex-col divide-y text-sm">
                {paiements.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{formatDate(p.date)}</span>
                    <Link href={`/location/contrats/${p.contrat.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="block font-medium">
                        {p.client} · {p.contrat.numero}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {LIBELLES_NATURE_PAIEMENT[p.nature]} · {LIBELLES_MODE_PAIEMENT[p.mode]} · {p.vehicule}
                      </span>
                    </Link>
                    <span className={`font-semibold tabular-nums ${p.nature === "REMBOURSEMENT" ? "text-destructive" : ""}`}>{formatEuros(signe(p))}</span>
                    {p.numeroRecu && <BoutonPdf url={`/api/pdf/recu/${p.id}`} libelle={p.numeroRecu} nomFichier={`recu-${p.numeroRecu}.pdf`} compact />}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
