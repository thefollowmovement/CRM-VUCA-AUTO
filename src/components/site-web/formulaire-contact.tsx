"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JOURS } from "@/lib/site/reglages-defaut";
import { afficherNumero, lienWhatsApp, normaliserNumero, remplirMessage, VARIABLES_MESSAGE } from "@/lib/site/whatsapp";
import { schemaSiteContact, type SaisieSiteContact } from "@/lib/validations/site";
import { enregistrerSiteContact } from "@/server/actions/site";

/** Exemple utilisé pour l'aperçu du message « véhicule ». */
const EXEMPLE = { marque: "Peugeot", modele: "208", version: "Allure", annee: 2021, km: "45 000 km", prix: "12 490 €", lien: "https://vuca-auto.fr/voitures/peugeot-208-allure-2021" };

export function FormulaireContact({ valeurs }: { valeurs: SaisieSiteContact }) {
  const router = useRouter();
  const { register, handleSubmit, getValues, setValue, watch, setError, reset, formState: { errors, isSubmitting } } = useFormulaire(schemaSiteContact, valeurs);
  const zoneVehicule = useRef<HTMLTextAreaElement | null>(null);
  const numero = watch("whatsapp") ?? "";
  const messageVehicule = watch("messageWhatsappVehicule") ?? "";
  const messageGeneral = watch("messageWhatsappGeneral") ?? "";
  const horaires = watch("horaires");
  const normalise = normaliserNumero(String(numero));
  const apercuVehicule = remplirMessage(String(messageVehicule), EXEMPLE);
  const { ref: refVehicule, ...champVehicule } = register("messageWhatsappVehicule");

  const insererVariable = (nom: string) => {
    const el = zoneVehicule.current;
    const actuel = String(getValues("messageWhatsappVehicule") ?? "");
    const debut = el?.selectionStart ?? actuel.length;
    const fin = el?.selectionEnd ?? actuel.length;
    const texte = `${actuel.slice(0, debut)}{${nom}}${actuel.slice(fin)}`;
    setValue("messageWhatsappVehicule", texte, { shouldDirty: true });
    requestAnimationFrame(() => {
      el?.focus();
      const pos = debut + nom.length + 2;
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerSiteContact(getValues()), setError)) {
          reset(getValues());
          router.refresh();
        }
      })}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-4">
        <h3 className="font-semibold">WhatsApp</h3>
        <Champ
          label="Numéro WhatsApp"
          htmlFor="whatsapp"
          erreur={errors.whatsapp?.message}
          aide={normalise ? <>Affiché : <strong>{afficherNumero(normalise)}</strong></> : "Format international conseillé : +33 6 12 34 56 78."}
        >
          <div className="flex flex-wrap gap-2">
            <Input id="whatsapp" type="tel" inputMode="tel" className="max-w-64" placeholder="+33 6 12 34 56 78" {...register("whatsapp")} />
            {normalise && (
              <Button variant="outline" asChild>
                <a href={lienWhatsApp(normalise, "Test depuis le CRM VUCA AUTO") ?? "#"} target="_blank" rel="noopener noreferrer">
                  <ExternalLink /> Tester
                </a>
              </Button>
            )}
          </div>
        </Champ>
        <Champ label="Message pré-rempli (page d'un véhicule)" htmlFor="messageWhatsappVehicule" obligatoire erreur={errors.messageWhatsappVehicule?.message}>
          <Textarea
            id="messageWhatsappVehicule"
            rows={3}
            {...champVehicule}
            ref={(el) => {
              refVehicule(el);
              zoneVehicule.current = el;
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Insérer :</span>
            {VARIABLES_MESSAGE.map((v) => (
              <button key={v} type="button" onClick={() => insererVariable(v)} className="rounded-full border px-2.5 py-1 font-mono hover:bg-accent">
                {`{${v}}`}
              </button>
            ))}
          </div>
        </Champ>
        <ApercuMessage texte={apercuVehicule} />
        <Champ label="Message pré-rempli (bouton général)" htmlFor="messageWhatsappGeneral" obligatoire erreur={errors.messageWhatsappGeneral?.message}>
          <Textarea id="messageWhatsappGeneral" rows={2} {...register("messageWhatsappGeneral")} />
        </Champ>
        <ApercuMessage texte={String(messageGeneral)} />
        <Champ label="Délai de réponse affiché" htmlFor="delaiReponse" erreur={errors.delaiReponse?.message} aide="Exemple : « Réponse en moins d'une heure en journée ». Laissez vide pour ne rien afficher.">
          <Input id="delaiReponse" {...register("delaiReponse")} />
        </Champ>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold">Coordonnées</h3>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <Champ label="Téléphone (appel)" htmlFor="telephone" erreur={errors.telephone?.message}>
            <Input id="telephone" type="tel" {...register("telephone")} />
          </Champ>
          <Champ label="Email" htmlFor="email" erreur={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </Champ>
        </div>
        <Champ label="Adresse" htmlFor="adresse" erreur={errors.adresse?.message}>
          <Textarea id="adresse" rows={2} {...register("adresse")} />
        </Champ>
        <Champ label="Lien Google Maps" htmlFor="lienGoogleMaps" erreur={errors.lienGoogleMaps?.message} aide="Dans Google Maps : Partager → Copier le lien.">
          <Input id="lienGoogleMaps" type="url" placeholder="https://maps.app.goo.gl/…" {...register("lienGoogleMaps")} />
        </Champ>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Horaires</h3>
        <p className="text-sm text-muted-foreground">Cochez les jours d&apos;ouverture et indiquez les plages (ex. « 9h – 12h, 14h – 19h » ou « Sur rendez-vous »).</p>
        <div className="flex flex-col divide-y rounded-lg border">
          {JOURS.map((jour, i) => (
            <div key={jour} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-2 px-3 py-1.5">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
                <CaseACocher {...register(`horaires.${i}.ouvert`)} /> {jour}
              </label>
              {horaires?.[i]?.ouvert ? (
                <Input aria-label={`Horaires du ${jour.toLowerCase()}`} placeholder="9h – 12h, 14h – 19h" {...register(`horaires.${i}.plages`)} />
              ) : (
                <span className="text-sm text-muted-foreground">Fermé</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold">Votre interlocuteur</h3>
        <Champ label="Prénom affiché" htmlFor="vendeurNom" erreur={errors.vendeurNom?.message} aide="Un visage et un prénom rassurent : « Votre interlocuteur : Karim ».">
          <Input id="vendeurNom" className="max-w-64" {...register("vendeurNom")} />
        </Champ>
      </section>

      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}

/** Bulle « façon WhatsApp » pour visualiser le message envoyé. */
function ApercuMessage({ texte }: { texte: string }) {
  return (
    <div className="-mt-2 rounded-lg bg-[#efeae2] p-3 dark:bg-[#0b141a]">
      <p className="mb-1 text-xs text-neutral-600 dark:text-neutral-400">Aperçu du message</p>
      <p className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm text-neutral-900 shadow-sm dark:bg-[#005c4b] dark:text-white">
        {texte || "…"}
      </p>
    </div>
  );
}
