"use client";

import { LoaderCircle, Receipt, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoutonPdf } from "@/components/documents/bouton-pdf";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatEuros } from "@/lib/format";
import { annulerFacture, emettreFactureContrat, emettreFactureVente } from "@/server/actions/factures";

type Facture = { id: string; numero: string; dateEmission: Date; totalCentimes: number; annuleeLe: Date | null; motifAnnulation: string | null };

/** Factures (location ou vente) : émission, PDF, annulation. Une facture émise n'est jamais modifiée. */
export function Factures({ cible, factures, peutEmettre }: { cible: { type: "contrat" | "vente"; id: string }; factures: Facture[]; peutEmettre: boolean }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [annulation, setAnnulation] = useState<Facture | null>(null);
  const active = factures.find((f) => !f.annuleeLe);
  return (
    <div className="flex flex-col gap-2">
      {factures.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`min-w-0 flex-1 ${f.annuleeLe ? "text-muted-foreground line-through" : ""}`}>
            Facture {f.numero} · {formatDate(f.dateEmission)} · {formatEuros(f.totalCentimes)}
          </span>
          {f.annuleeLe && <span className="w-full text-xs text-muted-foreground">Annulée le {formatDate(f.annuleeLe)}{f.motifAnnulation ? ` : ${f.motifAnnulation}` : ""}</span>}
          <BoutonPdf url={`/api/pdf/facture/${f.id}`} libelle="PDF" nomFichier={`facture-${f.numero}.pdf`} compact />
          {!f.annuleeLe && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setAnnulation(f)}>
              <X /> Annuler
            </Button>
          )}
        </div>
      ))}
      {!active && peutEmettre && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={enCours}
          onClick={async () => {
            setEnCours(true);
            const r = cible.type === "contrat" ? await emettreFactureContrat(cible.id) : await emettreFactureVente(cible.id);
            setEnCours(false);
            if (traiterResultat(r)) router.refresh();
          }}
        >
          {enCours ? <LoaderCircle className="animate-spin" /> : <Receipt />} Émettre la facture
        </Button>
      )}
      {annulation && <DialogueAnnulation facture={annulation} onFermer={() => setAnnulation(null)} />}
    </div>
  );
}

function DialogueAnnulation({ facture, onFermer }: { facture: Facture; onFermer: () => void }) {
  const router = useRouter();
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string>();
  const [enCours, setEnCours] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler la facture {facture.numero} ?</DialogTitle>
          <DialogDescription>Elle reste visible, marquée « annulée ». Vous pourrez ensuite en émettre une nouvelle, corrigée.</DialogDescription>
        </DialogHeader>
        <Champ label="Motif" htmlFor="motif-annulation" erreur={erreur} obligatoire>
          <Input id="motif-annulation" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : erreur d'adresse" />
        </Champ>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Garder
          </Button>
          <Button
            variant="destructive"
            disabled={enCours}
            onClick={async () => {
              setEnCours(true);
              const r = await annulerFacture(facture.id, { motif });
              setEnCours(false);
              if (!r.ok) setErreur(r.erreursChamps?.motif?.[0]);
              if (traiterResultat(r)) {
                onFermer();
                router.refresh();
              }
            }}
          >
            Annuler la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
