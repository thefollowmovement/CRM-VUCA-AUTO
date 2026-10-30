import { Car, ChevronRight, FileText, HandCoins, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ReleveInvestisseur } from "@/components/partenaires/versements";
import { ApercuAdmin } from "@/components/portail/apercu-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { BadgeStatut } from "@/components/vehicules/badge-statut";
import { db } from "@/lib/db";
import { formatDate, formatEuros, formatPourcentageBp } from "@/lib/format";
import { exigerRolePage } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { LIBELLES_TYPE_VERSEMENT } from "@/lib/validations/finance";
import { donneesPortail, partenairePortail } from "@/server/requetes/portail";

export const metadata: Metadata = { title: "Mon espace investisseur" };

export default async function PagePortail({ searchParams }: { searchParams: Promise<{ partenaire?: string }> }) {
  const u = await exigerRolePage(["INVESTISSEUR_LECTURE", "ADMIN"]);
  const { partenaire, compteNonRelie } = await partenairePortail(u, (await searchParams).partenaire);

  if (compteNonRelie) {
    return <EtatVide icone={UserX} titre="Compte non relié" description="Votre compte n'est relié à aucun investisseur. Contactez VUCA AUTO." />;
  }
  if (!partenaire) {
    // Admin : choisir l'investisseur dont on veut voir l'espace
    const partenaires = await db.partenaire.findMany({ where: { type: "INVESTISSEUR", actif: true }, orderBy: { nom: "asc" }, select: { id: true, nom: true } });
    return (
      <>
        <h1 className="mb-1 text-2xl font-bold">Portail investisseur</h1>
        <p className="mb-4 text-sm text-muted-foreground">Choisissez un investisseur pour voir exactement ce qu&apos;il voit (lecture seule).</p>
        <ul className="flex flex-col gap-2">
          {partenaires.map((p) => (
            <li key={p.id}>
              <Link href={`/portail?partenaire=${p.id}`}>
                <Card className="flex flex-row items-center gap-3 p-4 hover:bg-accent">
                  <span className="min-w-0 flex-1 font-medium">{p.nom}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const apercu = u.role === "ADMIN";
  const suffixe = apercu ? `?partenaire=${partenaire.id}` : "";
  const d = await donneesPortail(partenaire.id);
  const i = d.indicateurs;
  const cartes = [
    { libelle: "Capital engagé", valeur: i.capitalEngageCentimes, detail: `${i.vehiculesEnCours} véhicule${i.vehiculesEnCours > 1 ? "s" : ""} en cours` },
    { libelle: "Bénéfice prévisionnel", valeur: i.beneficePrevisionnelCentimes, detail: "sur les véhicules en cours" },
    { libelle: "Bénéfices réalisés", valeur: i.beneficesRealisesCentimes, detail: `${i.vehiculesVendus} véhicule${i.vehiculesVendus > 1 ? "s" : ""} vendu${i.vehiculesVendus > 1 ? "s" : ""}` },
    { libelle: "Déjà versé", valeur: i.totalVerseCentimes, detail: "capital remboursé + bénéfices" },
    { libelle: "Reste dû", valeur: i.resteDuCentimes, detail: "à vous reverser", fort: true },
  ];

  return (
    <>
      {apercu && <ApercuAdmin nom={partenaire.nom} partenaireId={partenaire.id} />}
      <h1 className="mb-1 text-2xl font-bold">Bonjour {partenaire.nom}</h1>
      <p className="mb-4 text-sm text-muted-foreground">Vos véhicules et vos chiffres, à jour en temps réel. Espace en lecture seule.</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cartes.map((c) => (
          <Card key={c.libelle} className={cn("gap-1 p-4", c.fort && "col-span-2 border-primary/40 md:col-span-1")}>
            <p className="text-xs text-muted-foreground">{c.libelle}</p>
            <p className={cn("text-lg font-bold tabular-nums", c.valeur < 0 && "text-destructive", c.fort && "text-primary")}>{formatEuros(c.valeur)}</p>
            <p className="text-xs text-muted-foreground">{c.detail}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold">Vos véhicules ({d.vehicules.length})</h2>
      {d.vehicules.length === 0 ? (
        <EtatVide icone={Car} titre="Aucun véhicule pour l'instant" />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {d.vehicules.map((v) => (
            <li key={v.id}>
              <Link href={`/portail/vehicules/${v.id}${suffixe}`} className="block h-full">
                <Card className="h-full gap-0 overflow-hidden p-0 transition-colors hover:border-primary/50">
                  <div className="flex gap-3 p-3">
                    <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {v.photoId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/fichiers/${v.photoId}?taille=mini`} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <Car className="m-6 size-8 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{v.nom}</p>
                      <p className="mb-1 text-xs text-muted-foreground">{v.immatriculation ?? "—"}</p>
                      <BadgeStatut statut={v.statut} />
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 border-t px-3 py-2 text-sm [&>div]:min-w-0">
                    <div>
                      <dt className="text-xs text-muted-foreground">Investi</dt>
                      <dd className="font-medium tabular-nums">{formatEuros(v.investiCentimes)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Bénéfice{v.previsionnel && " *"}</dt>
                      <dd className={cn("font-medium tabular-nums", (v.beneficeCentimes ?? 0) < 0 && "text-destructive")}>{formatEuros(v.beneficeCentimes)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{v.vendu ? "Reste dû" : "Votre part"}</dt>
                      <dd className="font-semibold tabular-nums">{v.vendu ? formatEuros(v.resteDuCentimes) : formatPourcentageBp(v.partBp)}</dd>
                    </div>
                  </dl>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">* Prévisionnel : estimé sur le prix de vente visé, tant que le véhicule n&apos;est pas vendu.</p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HandCoins className="size-5 text-primary" /> Vos versements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.versements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun versement pour l&apos;instant.</p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {d.versements.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {formatDate(v.date)} · {LIBELLES_TYPE_VERSEMENT[v.type]}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{v.vehicule ?? "Sans véhicule"}</span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {v.type === "APPORT_SUPPLEMENTAIRE" ? "+" : ""}
                      {formatEuros(v.montantCentimes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5 text-primary" /> Votre relevé
            </CardTitle>
            <CardDescription>Résultats de la période, ce qui vous a été versé et ce qui reste dû, en PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReleveInvestisseur partenaireId={partenaire.id} nom={partenaire.nom} chemin={`/api/portail/releve${suffixe}`} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
