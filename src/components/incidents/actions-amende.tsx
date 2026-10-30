"use client";

import { Camera, Download, LoaderCircle, MessageSquarePlus, Receipt, Send, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { compresserImage } from "@/lib/compression-image";
import { dateVersSaisieParis } from "@/lib/dates";
import { LIBELLES_STATUT_AMENDE, STATUTS_AMENDE_MANUELS } from "@/lib/validations/paiement";
import { ajouterNoteAmende, changerStatutAmende, envoyerAvisAmende, marquerAmendeDesignee, refacturerAmende, supprimerAmende } from "@/server/actions/amendes";

const DESIGNABLES = ["A_DESIGNER", "A_VALIDER", "RECUE", "CONTESTE"];

/** Actions manuelles de la fiche d'un PV. */
export function ActionsAmende({
  id,
  statut,
  refacturable,
  estAdmin,
  scanId,
}: {
  id: string;
  statut: string;
  refacturable: boolean;
  estAdmin: boolean;
  scanId?: string | null;
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [designation, setDesignation] = useState(false);
  const [dateDesignation, setDateDesignation] = useState("");
  const [noteOuverte, setNoteOuverte] = useState(false);
  const [note, setNote] = useState("");
  const [enCours, setEnCours] = useState(false);

  const executer = async (fn: () => Promise<Parameters<typeof traiterResultat>[0]>, apres?: () => void) => {
    setEnCours(true);
    const ok = traiterResultat(await fn());
    setEnCours(false);
    if (ok) {
      apres?.();
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {DESIGNABLES.includes(statut) && (
          <Button
            onClick={() => {
              setDateDesignation(dateVersSaisieParis(new Date()));
              setDesignation(true);
            }}
          >
            <Send /> Marquer comme désigné
          </Button>
        )}
        {refacturable && (
          <Confirmation
            titre="Refacturer ce PV au client ?"
            description="Son montant est ajouté aux frais supplémentaires de la location."
            libelleConfirmer="Refacturer"
            destructif={false}
            onConfirmer={() => executer(() => refacturerAmende(id))}
          >
            <Button variant="outline">
              <Receipt /> Refacturer au client
            </Button>
          </Confirmation>
        )}
        <Button variant="outline" onClick={() => setNoteOuverte(true)}>
          <MessageSquarePlus /> Ajouter une note
        </Button>
        {scanId && (
          <Button variant="outline" asChild>
            <a href={`/api/fichiers/${scanId}?telecharger=1`}>
              <Download /> Télécharger le scan
            </a>
          </Button>
        )}
        <Button variant="outline" onClick={() => champ.current?.click()} disabled={envoi}>
          {envoi ? <LoaderCircle className="animate-spin" /> : <Camera />} Ajouter l&apos;avis
        </Button>
        {estAdmin && (
          <Confirmation titre="Supprimer ce PV ?" libelleConfirmer="Supprimer" onConfirmer={async () => {
            if (traiterResultat(await supprimerAmende(id))) router.push("/location/amendes");
          }}>
            <Button variant="ghost" className="text-destructive">
              <Trash /> Supprimer
            </Button>
          </Confirmation>
        )}
      </div>

      {statut !== "A_LIRE" && statut !== "REFACTUREE" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label htmlFor="changer-statut">Statut</Label>
          <SelectNatif
            id="changer-statut"
            className="w-auto"
            // Non contrôlé (clé = statut) : le choix reste affiché pendant l'enregistrement, puis suit le serveur.
            key={statut}
            defaultValue={(STATUTS_AMENDE_MANUELS as readonly string[]).includes(statut) ? statut : ""}
            disabled={enCours}
            onChange={(e) => {
              const v = e.target.value;
              if (v && v !== statut) void executer(() => changerStatutAmende(id, v));
            }}
          >
            {!(STATUTS_AMENDE_MANUELS as readonly string[]).includes(statut) && <option value="">{LIBELLES_STATUT_AMENDE[statut as keyof typeof LIBELLES_STATUT_AMENDE] ?? statut}</option>}
            {STATUTS_AMENDE_MANUELS.map((s) => (
              <option key={s} value={s}>
                {LIBELLES_STATUT_AMENDE[s]}
              </option>
            ))}
          </SelectNatif>
        </div>
      )}

      <input
        ref={champ}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        aria-label="Avis de contravention"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setEnvoi(true);
          const fd = new FormData();
          fd.set("amendeId", id);
          fd.set("document", await compresserImage(f, 2000, 0.88));
          if (traiterResultat(await envoyerAvisAmende(fd))) router.refresh();
          setEnvoi(false);
          e.target.value = "";
        }}
      />

      <Dialog open={designation} onOpenChange={setDesignation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme désigné</DialogTitle>
            <DialogDescription>Date et heure de la désignation du conducteur sur le site de l&apos;ANTAI. Les frais de gestion réglés sont ajoutés au contrat.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-designation">Désigné le</Label>
            <Input id="date-designation" type="datetime-local" value={dateDesignation} onChange={(e) => setDateDesignation(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesignation(false)}>
              Annuler
            </Button>
            <Button disabled={enCours || !dateDesignation} onClick={() => executer(() => marquerAmendeDesignee(id, dateDesignation), () => setDesignation(false))}>
              {enCours && <LoaderCircle className="animate-spin" />} Confirmer la désignation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOuverte} onOpenChange={setNoteOuverte}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
            <DialogDescription>Elle est ajoutée à la suite des précédentes, avec la date et votre nom.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="note-pv" className="sr-only">
            Note
          </Label>
          <Textarea id="note-pv" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOuverte(false)}>
              Annuler
            </Button>
            <Button
              disabled={enCours || !note.trim()}
              onClick={() =>
                executer(
                  () => ajouterNoteAmende(id, note),
                  () => {
                    setNote("");
                    setNoteOuverte(false);
                  },
                )
              }
            >
              {enCours && <LoaderCircle className="animate-spin" />} Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
