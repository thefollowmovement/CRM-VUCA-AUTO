"use client";

import { Copy, KeyRound, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Confirmation } from "@/components/ui/confirmation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { formatDateHeure } from "@/lib/format";
import { schemaUtilisateur } from "@/lib/validations/utilisateur";
import { creerUtilisateur, modifierUtilisateur, reinitialiserMotDePasse } from "@/server/actions/utilisateurs";
import { BoutonEnregistrer } from "./bouton-enregistrer";

type Role = "ADMIN" | "GESTIONNAIRE" | "INVESTISSEUR_LECTURE";
type Utilisateur = {
  id: string;
  nom: string;
  email: string;
  role: Role;
  actif: boolean;
  partenaireId: string | null;
  partenaireNom: string | null;
  derniereConnexionLe: Date | null;
};
type Investisseur = { id: string; nom: string };

const ROLES: Record<Role, { libelle: string; description: string }> = {
  ADMIN: { libelle: "Administrateur", description: "Accès complet, y compris réglages et utilisateurs." },
  GESTIONNAIRE: { libelle: "Gestionnaire", description: "Gestion quotidienne, sans les réglages." },
  INVESTISSEUR_LECTURE: { libelle: "Investisseur", description: "Lecture seule de ses véhicules et de ses chiffres." },
};

export function ListeUtilisateurs({
  utilisateurs,
  investisseurs,
  moiId,
}: {
  utilisateurs: Utilisateur[];
  investisseurs: Investisseur[];
  moiId: string;
}) {
  const router = useRouter();
  const [edition, setEdition] = useState<Utilisateur | "nouveau" | null>(null);
  const [motDePasse, setMotDePasse] = useState<{ email: string; valeur: string } | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEdition("nouveau")}>
          <Plus /> Nouveau compte
        </Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {utilisateurs.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {u.nom}
                {u.id === moiId && <span className="text-xs text-muted-foreground">(vous)</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              <p className="text-xs text-muted-foreground">
                Dernière connexion : {u.derniereConnexionLe ? formatDateHeure(u.derniereConnexionLe) : "jamais"}
              </p>
            </div>
            <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
              {ROLES[u.role].libelle}
              {u.partenaireNom && ` · ${u.partenaireNom}`}
            </Badge>
            {!u.actif && <Badge variant="destructive">Désactivé</Badge>}
            <div className="flex">
              <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEdition(u)}>
                <Pencil />
              </Button>
              <Confirmation
                titre={`Réinitialiser le mot de passe de ${u.nom} ?`}
                description="Un mot de passe temporaire sera généré. La personne devra en choisir un nouveau à sa prochaine connexion."
                libelleConfirmer="Réinitialiser"
                destructif={false}
                onConfirmer={async () => {
                  const r = await reinitialiserMotDePasse(u.id);
                  if (traiterResultat(r) && r.donnees) setMotDePasse({ email: u.email, valeur: r.donnees.motDePasse });
                }}
              >
                <Button variant="ghost" size="icon" aria-label="Réinitialiser le mot de passe">
                  <KeyRound />
                </Button>
              </Confirmation>
            </div>
          </li>
        ))}
      </ul>

      {edition && (
        <DialogueUtilisateur
          utilisateur={edition === "nouveau" ? null : edition}
          investisseurs={investisseurs}
          onFermer={() => setEdition(null)}
          onMotDePasse={(email, valeur) => setMotDePasse({ email, valeur })}
        />
      )}

      <Dialog open={!!motDePasse} onOpenChange={(o) => !o && (setMotDePasse(null), router.refresh())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mot de passe temporaire</DialogTitle>
            <DialogDescription>
              Communiquez-le à la personne ({motDePasse?.email}). Il ne sera plus affiché. Elle devra le changer à sa
              première connexion.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
            <code className="flex-1 text-lg font-semibold tracking-wider">{motDePasse?.valeur}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(motDePasse?.valeur ?? "");
                toast.success("Copié.");
              }}
            >
              <Copy /> Copier
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => (setMotDePasse(null), router.refresh())}>J&apos;ai noté le mot de passe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DialogueUtilisateur({
  utilisateur,
  investisseurs,
  onFermer,
  onMotDePasse,
}: {
  utilisateur: Utilisateur | null;
  investisseurs: Investisseur[];
  onFermer: () => void;
  onMotDePasse: (email: string, motDePasse: string) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaUtilisateur, {
    nom: utilisateur?.nom ?? "",
    email: utilisateur?.email ?? "",
    role: utilisateur?.role ?? "GESTIONNAIRE",
    partenaireId: utilisateur?.partenaireId ?? "",
    actif: utilisateur?.actif ?? true,
  });
  const role = watch("role") as Role;

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{utilisateur ? "Modifier le compte" : "Nouveau compte"}</DialogTitle>
          {!utilisateur && (
            <DialogDescription>Un mot de passe temporaire sera généré et affiché une seule fois.</DialogDescription>
          )}
        </DialogHeader>
        <form noValidate
          onSubmit={handleSubmit(async () => {
            const valeurs = getValues();
            if (utilisateur) {
              if (traiterResultat(await modifierUtilisateur(utilisateur.id, valeurs), setError)) {
                onFermer();
                router.refresh();
              }
            } else {
              const r = await creerUtilisateur(valeurs);
              if (traiterResultat(r, setError) && r.donnees) {
                onFermer();
                onMotDePasse(String(valeurs.email), r.donnees.motDePasse);
              }
            }
          })}
          className="flex flex-col gap-4"
        >
          <Champ label="Nom" htmlFor="nom" obligatoire erreur={errors.nom?.message}>
            <Input id="nom" {...register("nom")} />
          </Champ>
          <Champ label="Email (identifiant de connexion)" htmlFor="email" obligatoire erreur={errors.email?.message}>
            <Input id="email" type="email" autoComplete="off" {...register("email")} />
          </Champ>
          <Champ label="Rôle" htmlFor="role" aide={ROLES[role]?.description}>
            <SelectNatif id="role" {...register("role")}>
              {Object.entries(ROLES).map(([valeur, { libelle }]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          {role === "INVESTISSEUR_LECTURE" && (
            <Champ label="Investisseur représenté" htmlFor="partenaireId" obligatoire erreur={errors.partenaireId?.message}>
              <SelectNatif id="partenaireId" {...register("partenaireId")}>
                <option value="">— Choisir —</option>
                {investisseurs.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nom}
                  </option>
                ))}
              </SelectNatif>
            </Champ>
          )}
          <label className="flex items-center gap-2 text-sm">
            <CaseACocher {...register("actif")} /> Compte actif (peut se connecter)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer}>
              Annuler
            </Button>
            <BoutonEnregistrer enCours={isSubmitting} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
