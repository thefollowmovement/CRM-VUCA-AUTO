"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connexion } from "@/server/actions/auth";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(connexion, undefined);
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Champ label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Champ>
      <Champ label="Mot de passe" htmlFor="motDePasse">
        <div className="relative">
          <Input
            id="motDePasse"
            name="motDePasse"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Champ>
      {etat?.erreur && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {etat.erreur}
        </p>
      )}
      <Button type="submit" size="lg" disabled={enCours}>
        {enCours && <LoaderCircle className="animate-spin" />}
        Se connecter
      </Button>
    </form>
  );
}
