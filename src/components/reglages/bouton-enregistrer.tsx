import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BoutonEnregistrer({ enCours, libelle = "Enregistrer" }: { enCours: boolean; libelle?: string }) {
  return (
    <Button type="submit" disabled={enCours} className="self-start">
      {enCours && <LoaderCircle className="animate-spin" />}
      {libelle}
    </Button>
  );
}
