"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { retirerDonneesDemo } from "@/server/actions/demo";

/** Bouton + fenêtre de confirmation : il faut taper « RETIRER ». */
export function RetraitDemo({ resume }: { resume: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const valide = saisie.trim().toUpperCase() === "RETIRER";

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (!o) setSaisie("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> Retirer la démonstration
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirer la démonstration ?</DialogTitle>
          <DialogDescription>{resume} Cette action est définitive.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valide) return;
            setEnCours(true);
            const ok = traiterResultat(await retirerDonneesDemo(saisie));
            setEnCours(false);
            if (ok) {
              setOuvert(false);
              router.refresh();
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmation-demo">Pour confirmer, tapez RETIRER</Label>
            <Input id="confirmation-demo" autoComplete="off" autoCapitalize="characters" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={!valide || enCours}>
              {enCours ? "Retrait en cours…" : "Retirer définitivement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
