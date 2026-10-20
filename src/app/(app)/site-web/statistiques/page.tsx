import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GraphiqueJours } from "@/components/site-web/graphique-jours";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNombre } from "@/lib/format";
import { evolution, lirePeriodeStat, PERIODES_STAT, tauxContact } from "@/lib/site/statistiques";
import { cn } from "@/lib/utils";
import { statistiquesSite } from "@/server/site/statistiques";

export const metadata: Metadata = { title: "Site web — Statistiques" };

const pourcentage = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("fr-FR")} %`);

function Evolution({ actuel, precedent, nbJours }: { actuel: number; precedent: number; nbJours: number }) {
  const e = evolution(actuel, precedent);
  const Icone = e === null || e === 0 ? Minus : e > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icone className="size-3.5 shrink-0" aria-hidden />
      {e === null ? "Rien à comparer" : `${e > 0 ? "+" : ""}${e} % vs ${nbJours} j précédents`}
    </p>
  );
}

function Tuile({ libelle, valeur, aide, children }: { libelle: string; valeur: string; aide?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3" title={aide}>
      <p className="text-sm text-muted-foreground">{libelle}</p>
      <p className="text-2xl font-bold tabular-nums">{valeur}</p>
      {children}
    </div>
  );
}

/** Statistiques du site public : compteurs anonymes par jour (voir server/site/compteurs.ts). */
export default async function PageSiteStatistiques({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const nbJours = lirePeriodeStat((await searchParams).periode);
  const { jours, totaux, precedents, detail } = await statistiquesSite(nbJours);
  const clics = totaux.CLIC_WHATSAPP + totaux.CLIC_APPEL;
  const taux = tauxContact(clics, totaux.VUE_ANNONCE);
  const tauxAvant = tauxContact(precedents.CLIC_WHATSAPP + precedents.CLIC_APPEL, precedents.VUE_ANNONCE);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Statistiques</CardTitle>
            <CardDescription>Compteurs anonymes, sans cookie. Les robots, les doubles comptes et vos propres visites dans l&apos;aperçu sont ignorés.</CardDescription>
          </div>
          <nav aria-label="Période" className="inline-flex rounded-lg bg-muted p-1">
            {PERIODES_STAT.map((p) => (
              <Link
                key={p}
                href={`/site-web/statistiques?periode=${p}`}
                aria-current={p === nbJours ? "page" : undefined}
                className={cn("inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition-colors", p === nbJours ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {p} jours
              </Link>
            ))}
          </nav>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tuile libelle="Visites du site" valeur={formatNombre(totaux.VUE_SITE)} aide="Un même visiteur est compté une fois par 30 minutes.">
            <Evolution actuel={totaux.VUE_SITE} precedent={precedents.VUE_SITE} nbJours={nbJours} />
          </Tuile>
          <Tuile libelle="Vues d'annonces" valeur={formatNombre(totaux.VUE_ANNONCE)}>
            <Evolution actuel={totaux.VUE_ANNONCE} precedent={precedents.VUE_ANNONCE} nbJours={nbJours} />
          </Tuile>
          <Tuile libelle="Clics WhatsApp" valeur={formatNombre(totaux.CLIC_WHATSAPP)}>
            <Evolution actuel={totaux.CLIC_WHATSAPP} precedent={precedents.CLIC_WHATSAPP} nbJours={nbJours} />
          </Tuile>
          <Tuile libelle="Clics « Appeler »" valeur={formatNombre(totaux.CLIC_APPEL)}>
            <Evolution actuel={totaux.CLIC_APPEL} precedent={precedents.CLIC_APPEL} nbJours={nbJours} />
          </Tuile>
          <Tuile libelle="Taux de contact" valeur={pourcentage(taux)} aide="Clics WhatsApp et « Appeler » rapportés aux vues d'annonces.">
            <p className="text-xs text-muted-foreground">{tauxAvant === null ? "Clics ÷ vues d'annonces" : `${pourcentage(tauxAvant)} sur ${nbJours} j précédents`}</p>
          </Tuile>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visites par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <GraphiqueJours points={jours.map((j) => ({ jour: j.jour, valeur: j.VUE_SITE }))} libelle="Visites" couleur="var(--serie-1)" unite={["visite", "visites"]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clics WhatsApp par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <GraphiqueJours points={jours.map((j) => ({ jour: j.jour, valeur: j.CLIC_WHATSAPP }))} libelle="Clics WhatsApp" couleur="var(--serie-2)" unite={["clic", "clics"]} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Par annonce ({nbJours} jours)</CardTitle>
          <CardDescription>Annonces en ligne et annonces vues sur la période, les plus vues d&apos;abord.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune annonce en ligne pour le moment.</p>
          ) : (
            <>
              {/* Téléphone : cartes */}
              <ul className="flex flex-col divide-y md:hidden">
                {detail.map((a) => (
                  <li key={a.id} className="py-3">
                    <Link href={`/vehicules/${a.vehiculeId}/annonce`} className="font-medium hover:underline">
                      {a.titre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {a.reference} · {a.etat}
                    </p>
                    <p className="mt-1 text-sm tabular-nums">
                      {formatNombre(a.vues)} vues · {formatNombre(a.clicsWhatsapp)} WhatsApp · {formatNombre(a.clicsAppel)} appels · taux {pourcentage(a.taux)}
                    </p>
                  </li>
                ))}
              </ul>
              {/* Ordinateur : tableau */}
              <table className="hidden w-full text-sm md:table">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Annonce</th>
                    <th className="py-2 pr-3 font-medium">État</th>
                    <th className="py-2 pr-3 text-right font-medium">Vues</th>
                    <th className="py-2 pr-3 text-right font-medium">WhatsApp</th>
                    <th className="py-2 pr-3 text-right font-medium">Appels</th>
                    <th className="py-2 text-right font-medium">Taux de contact</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <Link href={`/vehicules/${a.vehiculeId}/annonce`} className="font-medium hover:underline">
                          {a.titre}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">{a.reference}</span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground first-letter:uppercase">{a.etat}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatNombre(a.vues)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatNombre(a.clicsWhatsapp)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatNombre(a.clicsAppel)}</td>
                      <td className="py-2 text-right tabular-nums">{pourcentage(a.taux)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
