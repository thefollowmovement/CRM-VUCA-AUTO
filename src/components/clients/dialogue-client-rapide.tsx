"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { schemaClient, type SaisieClient } from "@/lib/validations/location";
import { creerClient } from "@/server/actions/clients";

export type ClientCree = {
  id: string; nom: string; prenom: string | null; telephone: string | null; email: string | null; listeNoire: boolean; motifListeNoire: string | null;
  numeroPermis: string | null; dateObtentionPermis: Date | null; dateValiditePermis: Date | null; dateValiditePieceIdentite: Date | null;
};

/** Création rapide d'un client depuis l'assistant de contrat (les scans s'ajoutent ensuite sur sa fiche). */
export function DialogueClientRapide({ valeurs, onCree, libelle = "Nouveau client" }: { valeurs: SaisieClient; onCree: (c: ClientCree) => void; libelle?: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOuvert(true)}>
        <UserPlus /> {libelle}
      </Button>
      {ouvert && <Formulaire valeurs={valeurs} onFermer={() => setOuvert(false)} onCree={onCree} />}
    </>
  );
}

function Formulaire({ valeurs, onFermer, onCree }: { valeurs: SaisieClient; onFermer: () => void; onCree: (c: ClientCree) => void }) {
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaClient, valeurs);
  const champ = (n: keyof SaisieClient, label: string, props: React.ComponentProps<typeof Input> = {}, obligatoire = false) => (
    <Champ label={label} htmlFor={`rapide-${n}`} erreur={errors[n]?.message} obligatoire={obligatoire}>
      <Input id={`rapide-${n}`} {...props} {...register(n)} />
    </Champ>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
          <DialogDescription>L&apos;essentiel pour le contrat ; le reste (adresse, scans) se complète sur la fiche.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(e) => {
            e.stopPropagation(); // ne pas soumettre le formulaire du contrat
            void handleSubmit(async () => {
              const saisie = getValues();
              const r = await creerClient(saisie);
              if (traiterResultat(r, setError) && r.donnees) {
                const v = schemaClient.parse(saisie);
                onCree({
                  id: r.donnees.id, nom: v.nom, prenom: v.prenom, telephone: v.telephone, email: v.email, listeNoire: false, motifListeNoire: null,
                  numeroPermis: v.numeroPermis, dateObtentionPermis: v.dateObtentionPermis, dateValiditePermis: v.dateValiditePermis, dateValiditePieceIdentite: v.dateValiditePieceIdentite,
                });
                onFermer();
              }
            })(e);
          }}
          className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2"
        >
          {champ("nom", "Nom", { autoFocus: true, autoComplete: "off" }, true)}
          {champ("prenom", "Prénom", { autoComplete: "off" })}
          {champ("telephone", "Téléphone", { type: "tel", inputMode: "tel" })}
          {champ("email", "Email", { type: "email", inputMode: "email" })}
          {champ("numeroPermis", "N° de permis", { autoComplete: "off" })}
          {champ("dateObtentionPermis", "Permis obtenu le", { type: "date" })}
          {champ("dateValiditePermis", "Permis valide jusqu'au", { type: "date" })}
          {champ("dateNaissance", "Date de naissance", { type: "date" })}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onFermer}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              Créer le client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
