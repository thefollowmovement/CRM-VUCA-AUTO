"use client";

import { Check, Copy, KeyRound, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creerJetonApi, revoquerJetonApi } from "@/server/actions/jetons-api";

/** Création d'un jeton : le jeton en clair n'est affiché qu'une fois, dans cette fenêtre. */
export function CreationJeton() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [jeton, setJeton] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const fermer = () => {
    setOuvert(false);
    setNom("");
    setErreur(null);
    setJeton(null);
    setCopie(false);
  };

  return (
    <>
      <Button onClick={() => setOuvert(true)}>
        <Plus /> Nouveau jeton
      </Button>
      <Dialog open={ouvert} onOpenChange={(o) => (o ? setOuvert(true) : fermer())}>
        <DialogContent>
          {jeton ? (
            <>
              <DialogHeader>
                <DialogTitle>Jeton créé</DialogTitle>
                <DialogDescription>Copiez-le maintenant dans l&apos;extension (onglet Réglages › Jeton) : il ne sera plus jamais affiché.</DialogDescription>
              </DialogHeader>
              <div className="flex min-w-0 items-center gap-2">
                <Input readOnly value={jeton} aria-label="Jeton" data-testid="jeton-cree" className="min-w-0 font-mono text-xs" onFocus={(e) => e.target.select()} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(jeton);
                      setCopie(true);
                      toast.success("Jeton copié.");
                    } catch {
                      toast.error("Copie impossible : sélectionnez le jeton et copiez-le à la main.");
                    }
                  }}
                >
                  {copie ? <Check /> : <Copy />} Copier
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={fermer}>J&apos;ai copié le jeton</Button>
              </DialogFooter>
            </>
          ) : (
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setEnCours(true);
                const r = await creerJetonApi(nom);
                setEnCours(false);
                if (!r.ok) setErreur(r.erreursChamps?.nom?.[0] ?? null);
                if (traiterResultat(r) && r.donnees) {
                  setJeton(r.donnees.jeton);
                  router.refresh();
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>Nouveau jeton</DialogTitle>
                <DialogDescription>Un jeton par ordinateur : vous pourrez le révoquer seul si l&apos;ordinateur est perdu.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nom-jeton">Nom</Label>
                <Input id="nom-jeton" placeholder="Chrome du bureau" maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} aria-invalid={!!erreur} />
                {erreur && <p className="text-sm text-destructive">{erreur}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={fermer}>
                  Annuler
                </Button>
                <Button type="submit" disabled={enCours}>
                  {enCours ? <LoaderCircle className="animate-spin" /> : <KeyRound />} Créer le jeton
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BoutonRevoquer({ id, nom }: { id: string; nom: string }) {
  const router = useRouter();
  return (
    <Confirmation
      titre={`Révoquer « ${nom} » ?`}
      description="L'extension qui utilise ce jeton ne pourra plus se connecter au CRM. Cette action est définitive."
      libelleConfirmer="Révoquer"
      onConfirmer={async () => {
        if (traiterResultat(await revoquerJetonApi(id))) router.refresh();
      }}
    >
      <Button variant="ghost" size="sm" className="text-destructive">
        Révoquer
      </Button>
    </Confirmation>
  );
}
