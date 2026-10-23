import { CircleCheck, CircleX } from "lucide-react";
import type { Metadata } from "next";
import { FormulaireAmendes } from "@/components/reglages/formulaire-amendes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { centimesVersSaisie } from "@/lib/format";
import { lireReglages } from "@/lib/reglages";
import { cleApiConfiguree } from "@/server/amendes/lecture";

export const metadata: Metadata = { title: "Réglages — Amendes" };

export default async function PageReglagesAmendes() {
  const r = await lireReglages();
  const cle = cleApiConfiguree();
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Lecture automatique des avis</CardTitle>
          <CardDescription>
            Les avis déposés dans Location › PV › Importer sont lus par Claude (API Anthropic). La clé se règle sur le serveur, dans le fichier .env (variable ANTHROPIC_API_KEY) : elle
            n&apos;est jamais affichée ni enregistrée dans le CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 font-medium" data-testid="cle-api">
            {cle ? <CircleCheck className="size-5 text-success" /> : <CircleX className="size-5 text-destructive" />}
            Clé configurée : {cle ? "oui" : "non"}
          </p>
          {!cle && <p className="mt-1 text-sm text-muted-foreground">Sans clé, les avis déposés restent « à lire » jusqu&apos;à son ajout (la lecture démarre alors toute seule).</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Amendes et désignation ANTAI</CardTitle>
          <CardDescription>Informations utilisées pour vérifier les avis et pré-remplir la désignation du conducteur.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireAmendes
            societe={{ nom: r.societeNom, adresse: r.societeAdresse ?? "", codePostal: r.societeCodePostal ?? "", ville: r.societeVille ?? "", email: r.societeEmail ?? "" }}
            valeurs={{
              amendesRaisonSociale: r.amendesRaisonSociale ?? "",
              amendesAdresse: r.amendesAdresse ?? "",
              amendesAdresseComplement: r.amendesAdresseComplement ?? "",
              amendesCodePostal: r.amendesCodePostal ?? "",
              amendesVille: r.amendesVille ?? "",
              amendesEmail: r.amendesEmail ?? "",
              amendesFraisGestionCentimes: r.amendesFraisGestionCentimes ? centimesVersSaisie(r.amendesFraisGestionCentimes) : "",
              amendesModele: r.amendesModele,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
